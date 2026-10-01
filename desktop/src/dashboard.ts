import { BrowserWindow } from 'electron';

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

    this.window = new BrowserWindow({
      width: 1280,
      height: 840,
      minWidth: 800,
      minHeight: 560,
      title: '1MCP Console',
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
