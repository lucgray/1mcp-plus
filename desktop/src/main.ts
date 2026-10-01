import path from 'node:path';

import { app, BrowserWindow, ipcMain } from 'electron';

import { DashboardWindow } from './dashboard';
import type { ControlAction } from './preload';
import { ServerProcess } from './serverProcess';
import { StatusPoller } from './statusPoller';
import { TrayController } from './tray';

const PORT = Number(process.env.ONE_MCP_DESKTOP_PORT ?? 3050);
const HOST = '127.0.0.1';
const AUTOSTART = process.env.ONE_MCP_DESKTOP_AUTOSTART !== '0';

const desktopDir = path.resolve(__dirname, '..');
const iconPath = path.join(desktopDir, 'assets', 'icon.png');
const preloadPath = path.join(desktopDir, 'dist', 'preload.js');
const quickViewHtml = path.join(desktopDir, 'renderer', 'quickview.html');
const serverLogFile = path.join(app.getPath('logs'), 'server.log');

const server = new ServerProcess({ port: PORT, host: HOST, logFile: serverLogFile });
const poller = new StatusPoller(server);
const dashboard = new DashboardWindow(() => server.endpoint, iconPath);

let tray: TrayController | undefined;
let quitting = false;

function broadcast(): void {
  const snapshot = poller.snapshot;
  tray?.updateStatus(snapshot);
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('app:status', snapshot);
  }
}

function registerIpc(): void {
  ipcMain.handle('app:get-status', () => {
    poller.refresh();
    return poller.snapshot;
  });
  ipcMain.handle('app:control', (_event, action: ControlAction) => {
    switch (action) {
      case 'start':
        server.start();
        break;
      case 'stop':
        server.stop();
        break;
      case 'restart':
        server.restart();
        break;
      case 'open-dashboard':
        dashboard.show();
        break;
      case 'hide-quickview':
        tray?.hideQuickView();
        break;
      case 'quit':
        quit();
        break;
    }
    poller.refresh();
  });
  ipcMain.on('app:quickview-height', (event, height: number) => {
    tray?.resizeQuickView(event.sender, height);
  });
}

function quit(): void {
  quitting = true;
  dashboard.close();
  tray?.destroy();
  server.stop();
  // Give the child a moment to exit gracefully, then quit regardless.
  setTimeout(() => app.quit(), 1500).unref();
  if (server.state === 'stopped' || server.state === 'failed') {
    app.quit();
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    tray?.showQuickView();
  });

  app.whenReady().then(() => {
    tray = new TrayController(
      {
        toggleQuickView: () => tray?.toggleQuickView(),
        openDashboard: () => dashboard.show(),
        startServer: () => {
          server.start();
          poller.refresh();
        },
        stopServer: () => server.stop(),
        restartServer: () => server.restart(),
        quit,
      },
      iconPath,
      preloadPath,
      quickViewHtml,
    );
    tray.init();

    server.on('state', () => {
      poller.refresh();
      broadcast();
    });
    server.on('log', () => broadcast());
    poller.on('status', () => broadcast());

    registerIpc();
    poller.start();

    if (AUTOSTART) {
      server.start();
    }

    if (process.env.ONE_MCP_DESKTOP_SHOW_QUICKVIEW === '1') {
      tray.showQuickView();
    }

    if (process.platform === 'darwin') {
      app.dock?.hide();
    }
  });

  app.on('window-all-closed', () => {
    // Tray app: keep running with no windows.
  });

  app.on('before-quit', () => {
    quitting = true;
    server.stop();
  });
}

export { quitting };
