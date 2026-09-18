const { app, BrowserWindow, ipcMain } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

const database = require("./database.cjs");

const HOST = "127.0.0.1";
const PORT = 3000;
const APP_URL = `http://${HOST}:${PORT}`;

let mainWindow = null;
let serverProcess = null;

function waitForServer(url, timeoutMs = 15000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });

      req.on("error", () => {
        if (Date.now() - startedAt >= timeoutMs) {
          reject(
            new Error("FOGA no pudo iniciar el servidor local.")
          );
          return;
        }

        setTimeout(check, 250);
      });

      req.setTimeout(1000, () => {
        req.destroy();
      });
    };

    check();
  });
}

function getServerEntry() {
  if (app.isPackaged) {
    return path.join(
      process.resourcesPath,
      ".output",
      "server",
      "index.mjs"
    );
  }

  return path.join(
    __dirname,
    "..",
    ".output",
    "server",
    "index.mjs"
  );
}

function startLocalServer() {
  const serverEntry = getServerEntry();

  console.log("[FOGA] Servidor:", serverEntry);

  serverProcess = spawn(process.execPath, [serverEntry], {
    env: {
      ...process.env,
      HOST,
      PORT: String(PORT),
      ELECTRON_RUN_AS_NODE: "1",
    },
    stdio: "inherit",
    windowsHide: true,
  });

  serverProcess.on("error", (error) => {
    console.error("[FOGA] Error iniciando servidor:", error);
  });

  serverProcess.on("exit", (code, signal) => {
    console.log("[FOGA] Servidor finalizado:", code, signal);
    serverProcess = null;
  });
}
function stopLocalServer() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }

  serverProcess = null;
}

function registerDatabaseHandlers() {
  ipcMain.handle("database:ping", () => {
    return database.pingDatabase();
  });

  ipcMain.handle("database:inspect", () => {
    return database.inspectDatabase();
  });

  ipcMain.handle("database:listProducts", () => {
    return database.listProducts();
  });

  ipcMain.handle("database:saveProduct", (_event, product) => {
    return database.saveProduct(product);
  });

  ipcMain.handle("database:getOpenSession", () => {
    return database.getOpenSession();
  });

  ipcMain.handle("database:listSessions", () => {
    return database.listSessions();
  });

  ipcMain.handle("database:openSession", (_event, label) => {
    return database.openSession(label);
  });

  ipcMain.handle("database:closeSession", (_event, sessionId) => {
    return database.closeSession(sessionId);
  });

  ipcMain.handle(
    "database:nextOrderNumber",
    (_event, sessionId) => {
      return database.nextOrderNumber(sessionId);
    }
  );

  ipcMain.handle("database:confirmSale", (_event, input) => {
    return database.confirmSale(input);
  });

  ipcMain.handle("database:listOrders", (_event, sessionId) => {
    return database.listOrders(sessionId);
  });

  ipcMain.handle(
    "database:listOrderItems",
    (_event, orderId) => {
      return database.listOrderItems(orderId);
    }
  );

  ipcMain.handle(
    "database:markPrinted",
    (_event, orderId, ok) => {
      return database.markPrinted(orderId, ok);
    }
  );

  ipcMain.handle(
    "database:voidOrder",
    (_event, orderId, reason) => {
      return database.voidOrder(orderId, reason);
    }
  );

  ipcMain.handle(
    "database:sessionTotals",
    (_event, sessionId) => {
      return database.sessionTotals(sessionId);
    }
  );

  ipcMain.handle("database:getSettings", () => {
    return database.getSettings();
  });

  ipcMain.handle(
    "database:saveSettings",
    (_event, settings) => {
      return database.saveSettings(settings);
    }
  );

  ipcMain.handle("database:exportBackup", () => {
    return database.exportBackup();
  });

  ipcMain.handle(
    "database:importBackup",
    (_event, backup) => {
      return database.importBackup(backup);
    }
  );
}

async function createWindow() {
  startLocalServer();

  await waitForServer(APP_URL);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription) => {
      console.error(
        "[FOGA] Error cargando ventana:",
        errorCode,
        errorDescription
      );
    }
  );

  await mainWindow.loadURL(APP_URL);

  mainWindow.show();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

registerDatabaseHandlers();

app.whenReady().then(async () => {
  try {
    database.openDatabase(app.getPath("userData"));

    await createWindow();
  } catch (error) {
    console.error(
      "[FOGA] Error iniciando aplicaciÃ³n:",
      error
    );

    stopLocalServer();
    database.closeDatabase();
    app.quit();
  }
});

app.on("window-all-closed", () => {
  stopLocalServer();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopLocalServer();
  database.closeDatabase();
});

