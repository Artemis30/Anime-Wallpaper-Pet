const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('capri', {
  getCharacter: () => ipcRenderer.invoke('get-character'),
  getApps: () => ipcRenderer.invoke('get-apps'),
  getAudio: () => ipcRenderer.invoke('get-audio'),
  cancelShutdown: () => ipcRenderer.send('cancel-shutdown'),
  setIgnore: v => ipcRenderer.send('set-ignore', v),
  action: (id, arg) => ipcRenderer.invoke('action', id, arg),
  contextMenu: () => ipcRenderer.send('context-menu'),
  onEvent: cb => ipcRenderer.on('event', (_e, d) => cb(d)),
  onAudio: cb => ipcRenderer.on('audio', (_e, on) => cb(on)),
  onToggleSleep: cb => ipcRenderer.on('toggle-sleep', () => cb())
});
