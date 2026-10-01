import { type ChildProcess, spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { ServerState } from './types';

export interface ServerProcessOptions {
  port: number;
  host: string;
  maxLogLines?: number;
  /** Optional file that receives the child's raw stdout/stderr for debugging. */
  logFile?: string;
}

interface ResolvedEntry {
  /** Absolute path to the entry point or executable. */
  entry: string;
  /** True when the entry must run through Node (a .js bundle); false for a self-contained binary. */
  viaNode: boolean;
}

function candidateEntries(): ResolvedEntry[] {
  const candidates: ResolvedEntry[] = [];
  const fromEnv = process.env.ONE_MCP_DESKTOP_SERVER_ENTRY;
  if (fromEnv) {
    candidates.push({ entry: fromEnv, viaNode: fromEnv.endsWith('.js') });
  }

  const repoRoot = path.resolve(__dirname, '..', '..');
  candidates.push({ entry: path.join(repoRoot, 'build', 'index.js'), viaNode: true });

  for (const bin of process.platform === 'win32' ? ['1mcp.exe'] : ['1mcp']) {
    candidates.push({ entry: path.join(repoRoot, bin), viaNode: false });
    if (process.resourcesPath) {
      candidates.push({ entry: path.join(process.resourcesPath, bin), viaNode: false });
    }
  }

  return candidates;
}

function resolveEntry(): ResolvedEntry | undefined {
  for (const candidate of candidateEntries()) {
    try {
      fs.accessSync(candidate.entry, fs.constants.X_OK);
      return candidate;
    } catch {
      try {
        fs.accessSync(candidate.entry, fs.constants.R_OK);
        return candidate;
      } catch {
        continue;
      }
    }
  }
  return undefined;
}

export class ServerProcess extends EventEmitter {
  state: ServerState = 'stopped';
  private child?: ChildProcess;
  private expectedExit = false;
  private logTail: string[] = [];
  private readonly maxLogLines: number;
  private lastError?: string;

  constructor(private readonly options: ServerProcessOptions) {
    super();
    this.maxLogLines = options.maxLogLines ?? 50;
  }

  get endpoint(): string {
    return `http://${this.options.host}:${this.options.port}`;
  }

  get logs(): string[] {
    return [...this.logTail];
  }

  get error(): string | undefined {
    return this.lastError;
  }

  get resolvedEntry(): ResolvedEntry | undefined {
    return resolveEntry();
  }

  start(): void {
    if (this.child || this.state === 'starting' || this.state === 'running') {
      return;
    }

    const resolved = resolveEntry();
    if (!resolved) {
      this.lastError =
        'No 1MCP server entry found. Run `pnpm build` in the repo root, build a binary with `pnpm sea:binary`, or set ONE_MCP_DESKTOP_SERVER_ENTRY.';
      this.setState('failed');
      return;
    }

    // JS bundles run through Electron's embedded Node (ELECTRON_RUN_AS_NODE).
    // The bundle is loaded via `-e "import(...)"` so process.argv stays
    // [exec, ...cliArgs], matching what the CLI's argv normalization expects.
    // Async loading keeps per-backend load state (ready/loading/failed) in the
    // runtime tracker, which is what /health/mcp and the quick view read.
    const cliArgs = [
      'serve',
      '--host',
      this.options.host,
      '--port',
      String(this.options.port),
      '--enable-async-loading',
    ];
    const args = resolved.viaNode
      ? ['-e', `import(${JSON.stringify(pathToFileURL(resolved.entry).href)})`, ...cliArgs]
      : cliArgs;

    const env = { ...process.env };
    let executable: string;
    if (resolved.viaNode) {
      executable = process.execPath;
      env.ELECTRON_RUN_AS_NODE = '1';
    } else {
      executable = resolved.entry;
    }
    // Loopback desktop usage: keep the console reachable without ambient auth prompts.
    env.ONE_MCP_HOST = this.options.host;
    env.ONE_MCP_PORT = String(this.options.port);
    // The CLI's strict-mode yargs parses every ONE_MCP_* env var — drop the
    // desktop shell's own settings so they are not forwarded as CLI options.
    for (const key of Object.keys(env)) {
      if (key.startsWith('ONE_MCP_DESKTOP_')) {
        delete env[key];
      }
    }

    this.lastError = undefined;
    this.expectedExit = false;
    this.appendLog(`[desktop] starting: ${executable} ${args.join(' ')}`);
    this.setState('starting');

    try {
      this.child = spawn(executable, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.appendLog(`[desktop] spawn failed: ${this.lastError}`);
      this.setState('failed');
      return;
    }

    const child = this.child;
    child.stdout?.on('data', (chunk: Buffer) => this.appendLog(chunk.toString()));
    child.stderr?.on('data', (chunk: Buffer) => this.appendLog(chunk.toString()));
    child.on('error', (error) => {
      this.lastError = error.message;
      this.appendLog(`[desktop] process error: ${error.message}`);
      this.setState('failed');
    });
    child.on('exit', (code, signal) => {
      this.child = undefined;
      const detail = `exit code ${code ?? 'null'} signal ${signal ?? 'none'}`;
      this.appendLog(`[desktop] server exited (${detail})`);
      if (this.expectedExit) {
        this.setState('stopped');
      } else if (code === 0) {
        this.setState('stopped');
      } else {
        this.lastError = `Server exited unexpectedly (${detail})`;
        this.setState('failed');
      }
    });
  }

  stop(): void {
    const child = this.child;
    if (!child) {
      this.setState('stopped');
      return;
    }
    this.expectedExit = true;
    this.setState('stopping');
    // The child's own exit listener turns an expected exit into 'stopped';
    // adding another listener here would race restart(), whose exit handler
    // respawns and must leave the state at 'starting'.
    child.kill('SIGTERM');
    setTimeout(() => {
      if (this.child === child && !child.killed) {
        child.kill('SIGKILL');
      }
    }, 5000).unref();
  }

  restart(): void {
    const child = this.child;
    if (!child) {
      this.start();
      return;
    }
    child.once('exit', () => this.start());
    this.stop();
  }

  markRunning(): void {
    if (this.state === 'starting') {
      this.setState('running');
    }
  }

  markUnreachableWhileRunning(): void {
    if (this.state === 'running' || this.state === 'starting') {
      this.setState('starting');
    }
  }

  private setState(state: ServerState): void {
    if (this.state === state) {
      return;
    }
    this.state = state;
    this.emit('state', state);
  }

  private appendLog(chunk: string): void {
    if (this.options.logFile) {
      try {
        fs.appendFileSync(this.options.logFile, chunk);
      } catch {
        // best-effort log sink
      }
    }
    const lines = chunk
      .replace(/\r/g, '')
      .split('\n')
      .filter((line) => line.length > 0);
    this.logTail.push(...lines);
    if (this.logTail.length > this.maxLogLines) {
      this.logTail.splice(0, this.logTail.length - this.maxLogLines);
    }
    this.emit('log');
  }
}
