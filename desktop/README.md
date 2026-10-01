# 1MCP Desktop

A lightweight Electron shell that runs `1mcp serve` as a managed background process and exposes it through a **system tray icon with a quick-view popup** — server status, per-upstream MCP server states, and one-click access to the admin console.

## Features

- **Managed runtime**: spawns and supervises `1mcp serve` (loopback only, `127.0.0.1`).
- **Tray quick view**: click the tray icon for a compact popup showing runtime state, version, uptime, and every configured MCP server's load state (`ready` / `loading` / `failed` / `awaitingOAuth`), plus the last log lines when startup fails.
- **Tray menu**: status summary (`Running — 3/5 servers ready`), quick actions — Quick View, Open Console, Start/Stop/Restart, Quit.
- **Console window**: opens the built-in admin console (`/admin`) in a dedicated window.
- **Single instance**: launching the app again focuses the existing tray popup.

## How it finds the server

The app launches the first available entry:

1. `ONE_MCP_DESKTOP_SERVER_ENTRY` — a `build/index.js` bundle or a self-contained `1mcp` binary.
2. `<repo>/build/index.js` — the normal `pnpm build` output (run via Electron's embedded Node).
3. `<repo>/1mcp` / `1mcp.exe` — the SEA binary produced by `pnpm sea:binary`.
4. `<resources>/1mcp` — bundled binary inside a packaged app.

Environment variables:

| Variable                       | Default | Purpose                                 |
| ------------------------------ | ------- | --------------------------------------- |
| `ONE_MCP_DESKTOP_PORT`         | `3050`  | Port for the managed HTTP runtime       |
| `ONE_MCP_DESKTOP_AUTOSTART`    | `1`     | Set `0` to not auto-start `serve`       |
| `ONE_MCP_DESKTOP_SERVER_ENTRY` | —       | Explicit server entry point (see above) |

The managed server always binds to `127.0.0.1`.

## Development

```bash
# 1. Build the server (repo root)
pnpm install && pnpm build

# 2. Install and run the desktop shell
cd desktop
npm install
npm run dev        # tsc + electron .

# or after the first build:
npm start
```

Type check: `npm run typecheck`.

## Packaging

`npm run dist` (electron-builder) produces an AppImage / NSIS / dmg in `desktop/release/`. For a self-contained package, build the SEA binary first (`pnpm sea:binary` in the repo root → `1mcp`/`1mcp.exe`), which `extraResources` then bundles and the app spawns directly — no system Node.js required.

## Layout

```
desktop/
├── src/
│   ├── main.ts           # app lifecycle, single-instance, IPC wiring
│   ├── serverProcess.ts  # spawn/stop/restart 1mcp serve + log tail
│   ├── statusPoller.ts   # polls /health + /health/mcp, emits snapshots
│   ├── tray.ts           # tray icon, context menu, quick-view window
│   ├── dashboard.ts      # admin console BrowserWindow
│   ├── preload.ts        # contextBridge API for the quick view
│   └── types.ts
├── renderer/
│   └── quickview.html    # self-contained tray popup UI
└── assets/
    └── icon.png
```

The renderer talks to the main process over IPC only (`contextIsolation`, no `nodeIntegration`); status data comes from the server's own `/health` and `/health/mcp` endpoints — no extra surface is added to the runtime.
