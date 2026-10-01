import { BrowserWindow, screen } from 'electron';

export class DashboardWindow {
  private window?: BrowserWindow;

  constructor(
    private readonly getEndpoint: () => string,
    private readonly iconPath: string,
  ) {}

  show(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.show();
      this.window.focus();
      return;
    }

    // Open at ~80% of the work area so the console reads as a full app
    // rather than a small floating card.
    const wa = screen.getPrimaryDisplay().workAreaSize;
    this.window = new BrowserWindow({
      width: Math.min(1760, Math.max(1100, Math.round(wa.width * 0.8))),
      height: Math.min(1080, Math.max(700, Math.round(wa.height * 0.8))),
      minWidth: 800,
      minHeight: 560,
      title: '1MCP Plus Console',
      icon: this.iconPath,
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    this.window.on('closed', () => {
      this.window = undefined;
    });

    void this.window.loadURL(`${this.getEndpoint()}/admin`);
  }

  close(): void {
    this.window?.close();
  }
}
