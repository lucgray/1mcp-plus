import { EventEmitter } from 'node:events';

import type { ServerProcess } from './serverProcess';
import type { HealthResponse, McpHealthResponse, StatusSnapshot } from './types';

const POLL_INTERVAL_MS = 5000;
const REQUEST_TIMEOUT_MS = 4000;

async function getJson<T>(url: string): Promise<T | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!res.ok && res.status !== 202 && res.status !== 503) {
      return undefined;
    }
    return (await res.json()) as T;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

export class StatusPoller extends EventEmitter {
  private timer?: NodeJS.Timeout;
  private polling = false;
  private latest?: StatusSnapshot;

  constructor(private readonly server: ServerProcess) {
    super();
  }

  start(): void {
    if (this.timer) {
      return;
    }
    void this.pollOnce();
    this.timer = setInterval(() => void this.pollOnce(), POLL_INTERVAL_MS);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  get snapshot(): StatusSnapshot {
    return (
      this.latest ?? {
        state: this.server.state,
        endpoint: this.server.endpoint,
        error: this.server.error,
        logTail: this.server.logs,
      }
    );
  }

  /** Refresh immediately (e.g. when the quick view opens). */
  refresh(): void {
    void this.pollOnce();
  }

  private async pollOnce(): Promise<void> {
    if (this.polling) {
      return;
    }
    this.polling = true;
    try {
      const state = this.server.state;
      if (state === 'stopped' || state === 'failed') {
        this.latest = {
          state,
          endpoint: this.server.endpoint,
          error: this.server.error,
          logTail: this.server.logs,
        };
        this.emit('status', this.latest);
        return;
      }

      const [health, mcp] = await Promise.all([
        getJson<HealthResponse>(`${this.server.endpoint}/health`),
        getJson<McpHealthResponse>(`${this.server.endpoint}/health/mcp`),
      ]);

      if (health) {
        this.server.markRunning();
      } else {
        this.server.markUnreachableWhileRunning();
      }

      this.latest = {
        state: this.server.state,
        endpoint: this.server.endpoint,
        error: this.server.error,
        health,
        mcp,
        logTail: this.server.logs,
      };
      this.emit('status', this.latest);
    } finally {
      this.polling = false;
    }
  }
}
