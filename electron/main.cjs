const { app, BrowserWindow, ipcMain } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

const {
  openDatabase,
  closeDatabase,
  pingDatabase,
} = require("./database.cjs");

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
          reject(new Error("FOGA no pudo iniciar el servidor local."));
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

function startLocalServer() {
  const serverEntry = path.join(
    __dirname,
    "..",
    ".output",
    "server",
    "index.mjs"
  );

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

  serverProcess.on("exit", () => {
    serverProcess = null;
  });
}

function stopLocalServer() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }

  serverProcess = null;
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

ipcMain.handle("database:ping", () => {
  return pingDatabase();
});

app.whenReady().then(async () => {
  try {
    openDatabase(app.getPath("userData"));
    await createWindow();
  } catch (error) {
    console.error("[FOGA] Error iniciando aplicación:", error);
    stopLocalServer();
    closeDatabase();
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
  closeDatabase();
});