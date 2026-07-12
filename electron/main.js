const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require("electron");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const isDev = process.env.AMBER_ELECTRON_DEV === "1";
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const APP_URL = `http://localhost:${PORT}`;
const ICON_PATH = path.join(__dirname, "..", "build", "icon.png");

let mainWindow = null;
let nextProcess = null;

function waitForServer(url, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryOnce = () => {
      const req = http.get(url, (res) => {
        res.destroy();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
        } else {
          setTimeout(tryOnce, 300);
        }
      });
    };
    tryOnce();
  });
}

function startProductionServer() {
  const appRoot = app.isPackaged ? path.join(process.resourcesPath, "app") : path.join(__dirname, "..");
  const nextBin = path.join(appRoot, "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");
  nextProcess = spawn(nextBin, ["start", "-p", String(PORT)], {
    cwd: appRoot,
    stdio: "inherit",
    env: { ...process.env },
  });
  nextProcess.on("exit", (code) => {
    if (code !== 0 && mainWindow) {
      dialog.showErrorBox("Amber", `The local server exited unexpectedly (code ${code}).`);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#171613",
    icon: ICON_PATH,
    title: "Amber",
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
    show: false,
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.loadURL(APP_URL);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function buildMenu() {
  const template = [
    {
      label: "Amber",
      submenu: [
        {
          label: "About Amber",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About Amber",
              message: "Amber",
              detail: `Version ${app.getVersion()}\nAn Obsidian-style local app for OKF bundles.`,
            });
          },
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.handle("pick-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

app.whenReady().then(async () => {
  buildMenu();
  try {
    if (!isDev) {
      startProductionServer();
    }
    await waitForServer(APP_URL);
    createWindow();
  } catch (err) {
    dialog.showErrorBox("Amber failed to start", String(err));
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (nextProcess) nextProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (nextProcess) nextProcess.kill();
});
