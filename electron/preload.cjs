const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("foga", {
  database: {
    ping: () => ipcRenderer.invoke("database:ping"),
  },
});