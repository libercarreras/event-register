const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("foga", {
  database: {
    ping: () =>
      ipcRenderer.invoke("database:ping"),

    inspect: () =>
      ipcRenderer.invoke("database:inspect"),

    listProducts: () =>
      ipcRenderer.invoke("database:listProducts"),

    saveProduct: (product) =>
      ipcRenderer.invoke("database:saveProduct", product),

    getOpenSession: () =>
      ipcRenderer.invoke("database:getOpenSession"),

    listSessions: () =>
      ipcRenderer.invoke("database:listSessions"),

    openSession: (label) =>
      ipcRenderer.invoke("database:openSession", label),

    closeSession: (sessionId) =>
      ipcRenderer.invoke("database:closeSession", sessionId),

    nextOrderNumber: (sessionId) =>
      ipcRenderer.invoke(
        "database:nextOrderNumber",
        sessionId
      ),

    confirmSale: (input) =>
      ipcRenderer.invoke("database:confirmSale", input),

    listOrders: (sessionId) =>
      ipcRenderer.invoke("database:listOrders", sessionId),

    listOrderItems: (orderId) =>
      ipcRenderer.invoke(
        "database:listOrderItems",
        orderId
      ),

    markPrinted: (orderId, ok) =>
      ipcRenderer.invoke(
        "database:markPrinted",
        orderId,
        ok
      ),

    voidOrder: (orderId, reason) =>
      ipcRenderer.invoke(
        "database:voidOrder",
        orderId,
        reason
      ),

    sessionTotals: (sessionId) =>
      ipcRenderer.invoke(
        "database:sessionTotals",
        sessionId
      ),

    getSettings: () =>
      ipcRenderer.invoke("database:getSettings"),

    saveSettings: (settings) =>
      ipcRenderer.invoke(
        "database:saveSettings",
        settings
      ),

    exportBackup: () =>
      ipcRenderer.invoke("database:exportBackup"),

    importBackup: (backup) =>
      ipcRenderer.invoke(
        "database:importBackup",
        backup
      ),
  },
});