import { contextBridge, ipcRenderer } from 'electron';

import type { StatusSnapshot } from './types';

export type ControlAction = 'start' | 'stop' | 'restart' | 'open-dashboard' | 'quit' | 'hide-quickview';

const api = {
  getStatus: (): Promise<StatusSnapshot> => ipcRenderer.invoke('app:get-status'),
  control: (action: ControlAction): Promise<void> => ipcRenderer.invoke('app:control', action),
  setHeight: (height: number): void => ipcRenderer.send('app:quickview-height', height),
  onStatus: (listener: (snapshot: StatusSnapshot) => void): void => {
    ipcRenderer.on('app:status', (_event, snapshot: StatusSnapshot) => listener(snapshot));
  },
};

export type OneMcpDesktopApi = typeof api;

contextBridge.exposeInMainWorld('oneMcpDesktop', api);
