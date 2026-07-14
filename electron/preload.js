const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("amber", {
  isElectron: true,
  pickFolder: () => ipcRenderer.invoke("pick-folder"),
  revealInFolder: (absPath) => ipcRenderer.invoke("reveal-in-folder", absPath),
  windowControls: {
    minimize: () => ipcRenderer.send("window-minimize"),
    toggleMaximize: () => ipcRenderer.send("window-toggle-maximize"),
    close: () => ipcRenderer.send("window-close"),
    isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
    onMaximizedChange: (callback) => {
      const handler = (_event, value) => callback(value);
      ipcRenderer.on("window-maximized-change", handler);
      return () => ipcRenderer.removeListener("window-maximized-change", handler);
    },
  },
});
