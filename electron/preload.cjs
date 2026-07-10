const { contextBridge, ipcRenderer } = require('electron');

// Expose minimal safe API to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  getBackofficeUrl: () => ipcRenderer.sendSync('get-server-url'),
  printBadge: () => ipcRenderer.invoke('print-badge'),
  printBadgeZpl: (visitor) => ipcRenderer.invoke('print-badge-zpl', visitor),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen')
});
