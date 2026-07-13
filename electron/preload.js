const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("amber", {
  isElectron: true,
  pickFolder: () => ipcRenderer.invoke("pick-folder"),
  revealInFolder: (absPath) => ipcRenderer.invoke("reveal-in-folder", absPath),
});
