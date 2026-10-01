import path from 'node:path';

import { app, BrowserWindow, Menu, nativeImage, screen, Tray } from 'electron';

import type { StatusSnapshot } from './types';

const STATE_LABELS: Record<string, string> = {
  stopped: 'Stopped',
  starting: 'Starting…',
  running: 'Running',
  stopping: 'Stopping…',
  failed: 'Failed',
};

export interface TrayActions {
  toggleQuickView(): void;
  openDashboard(): void;
  startServer(): void;
  stopServer(): void;
  restartServer(): void;
  quit(): void;
}

export class TrayController {
  private tray?: Tray;
  private quickView?: BrowserWindow;
  private lastStatus?: StatusSnapshot;

  constructor(
    private readonly actions: TrayActions,
    private readonly iconPath: string,
    private readonly preloadPath: string,
    private readonly quickViewHtml: string,
  ) {}

  init(): void {
    const icon = this.buildIcon();
    this.tray = new Tray(icon);
    this.tray.setToolTip('1MCP Plus');
    this.tray.on('click', () => this.actions.toggleQuickView());
    this.rebuildMenu();
  }

  updateStatus(snapshot: StatusSnapshot): void {
    this.lastStatus = snapshot;
    this.rebuildMenu();
    this.quickView?.webContents.send('app:status', snapshot);
  }

  showQuickView(): void {
    const win = this.ensureQuickView();
    this.positionQuickView(win);
    win.show();
    win.focus();
  }

  hideQuickView(): void {
    this.quickView?.hide();
  }

  /** True when a StatusNotifier/host gave the icon real screen bounds. */
  hasTrayHost(): boolean {
    const bounds = this.tray?.getBounds();
    return !!bounds && (bounds.width > 0 || bounds.height > 0);
  }

  toggleQuickView(): void {
    if (this.quickView?.isVisible()) {
      this.hideQuickView();
    } else {
      this.showQuickView();
    }
  }

  /** Fit the popup's height to the renderer's content, keeping the fixed width. */
  resizeQuickView(sender: Electron.WebContents, height: number): void {
    const win = this.quickView;
    if (!win || win.isDestroyed() || sender !== win.webContents || !Number.isFinite(height)) {
      return;
    }
    const max = screen.getDisplayNearestPoint(win.getBounds()).workArea.height - 24;
    const target = Math.round(Math.min(Math.max(height, 220), Math.max(max, 220), 640));
    if (Math.abs(win.getContentSize()[1] - target) > 1) {
      win.setContentSize(360, target);
      if (win.isVisible()) {
        this.positionQuickView(win);
      }
    }
  }

  destroy(): void {
    this.quickView?.destroy();
    this.tray?.destroy();
    // Cleared references keep updateStatus()/rebuildMenu() a no-op while the
    // managed server still emits shutdown logs during quit.
    this.quickView = undefined;
    this.tray = undefined;
  }

  private ensureQuickView(): BrowserWindow {
    if (this.quickView && !this.quickView.isDestroyed()) {
      return this.quickView;
    }

    this.quickView = new BrowserWindow({
      width: 360,
      height: 500,
      frame: false,
      resizable: false,
      movable: true,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      show: false,
      icon: this.iconPath,
      webPreferences: {
        preload: this.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    this.quickView.on('blur', () => {
      if (this.quickView?.isVisible() && !this.quickView.webContents.isDevToolsOpened()) {
        this.quickView.hide();
      }
    });
    this.quickView.on('closed', () => {
      this.quickView = undefined;
    });

    void this.quickView.loadFile(this.quickViewHtml);
    return this.quickView;
  }

  private positionQuickView(win: BrowserWindow): void {
    const bounds = this.tray?.getBounds();
    const winBounds = win.getBounds();
    if (bounds && (bounds.width > 0 || bounds.height > 0)) {
      const x = Math.round(bounds.x + bounds.width / 2 - winBounds.width / 2);
      const y = Math.round(bounds.y + bounds.height + 6);
      const display = screen.getDisplayNearestPoint({ x, y });
      const wa = display.workArea;
      win.setPosition(
        Math.min(Math.max(x, wa.x), wa.x + wa.width - winBounds.width),
        Math.min(Math.max(y, wa.y), wa.y + wa.height - winBounds.height),
      );
      return;
    }
    // Linux AppIndicator often reports empty bounds: anchor to the top-right of the work area.
    const display = screen.getPrimaryDisplay();
    const wa = display.workArea;
    win.setPosition(wa.x + wa.width - winBounds.width - 12, wa.y + 12);
  }

  private rebuildMenu(): void {
    if (!this.tray) {
      return;
    }
    const snapshot = this.lastStatus;
    const state = snapshot?.state ?? 'stopped';
    const running = state === 'running';
    const stopped = state === 'stopped' || state === 'failed';
    const busy = state === 'starting' || state === 'stopping';

    const ready = snapshot?.mcp?.summary?.ready ?? 0;
    const total = snapshot?.mcp?.summary?.total ?? 0;
    const failedCount = snapshot?.mcp?.summary?.failed ?? 0;

    const statusLabel = running
      ? `Running — ${ready}/${total} servers ready${failedCount > 0 ? ` (${failedCount} failed)` : ''}`
      : (STATE_LABELS[state] ?? state);

    const menu = Menu.buildFromTemplate([
      { label: `1MCP Plus — ${statusLabel}`, enabled: false },
      { label: snapshot?.endpoint ?? '', enabled: false },
      { type: 'separator' },
      { label: 'Quick View', click: () => this.actions.toggleQuickView() },
      { label: 'Open Console', click: () => this.actions.openDashboard(), enabled: running },
      { type: 'separator' },
      { label: 'Start Server', click: () => this.actions.startServer(), enabled: stopped },
      { label: 'Stop Server', click: () => this.actions.stopServer(), enabled: running || state === 'starting' },
      { label: 'Restart Server', click: () => this.actions.restartServer(), enabled: !busy && !stopped },
      { type: 'separator' },
      { label: 'Quit 1MCP Plus', click: () => this.actions.quit() },
    ]);

    this.tray.setContextMenu(menu);
    this.tray.setToolTip(`1MCP Plus — ${statusLabel}`);
  }

  private buildIcon() {
    const image = nativeImage.createFromPath(this.iconPath);
    if (image.isEmpty()) {
      return nativeImage.createEmpty();
    }
    const size = process.platform === 'darwin' ? 18 : 22;
    const resized = image.resize({ width: size, height: size });
    if (process.platform === 'darwin') {
      resized.setTemplateImage(true);
    }
    return resized;
  }
}

export function quitApp(): void {
  app.quit();
}
