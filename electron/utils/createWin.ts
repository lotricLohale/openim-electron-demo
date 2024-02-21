import { BrowserWindow, Menu } from "electron";
import * as path from "path";
import * as isDev from "electron-is-dev";
import { getStoreKey, setAppStatus, setStoreKey } from "..//store";
import { setTray, downloadUtil, registeShortcut, setSingleInstance, setIpcMain } from ".";
import { SINGLE_INSTANCE } from "../config";

export let mainWindow: BrowserWindow | null = null;
let loadingWindow: BrowserWindow | null = null;

async function createMainWindow() {
  Menu.setApplicationMenu(null);
  const partition = SINGLE_INSTANCE ? undefined : `persist:part${checkPartition()}`;
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 810,
    minWidth: 1080,
    minHeight: 810,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/api.js"),
      webSecurity: false,
      partition,
    },
    frame: false,
    show: false,
    // resizable:false,
    titleBarStyle: "hidden",
  });

  mainWindow.on("ready-to-show", function () {
    try {
      loadingWindow?.hide();
      loadingWindow?.destroy();
    } catch (error) {
      console.log(error);
    }
    mainWindow?.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  let Url = isDev ? "http://localhost:3001" : `file://${__dirname}/../../index.html`;
  mainWindow.loadURL(Url);

  // Hot Reloading
  if (isDev) {
    const electronPath = path.join(__dirname, "..", "..", "..", "node_modules", "electron", "dist", "electron");
    try {
      require("electron-reload")(__dirname, {
        electron: electronPath,
        forceHardReset: true,
        hardResetMethod: "exit",
      });
    } catch (_) {}
  }

  // DevTools
  if (isDev) {
  mainWindow.webContents.openDevTools({
    mode: "detach",
  });
  }

  setIpcMain(mainWindow);
  setTray(mainWindow);
  setSingleInstance(mainWindow);
  //  Download
  downloadUtil();
  // shortcut
  // registeShortcut(mainWindow);
  setAppStatus(true);
  return mainWindow;
}

export const initApp = async () => {
  loadingWindow = new BrowserWindow({
    show: false,
    frame: false,
    width: 200,
    height: 200,
    resizable: false,
    transparent: true,
  });
  loadingWindow?.once("show", createMainWindow);
  const loadingUrl = isDev ? `file://${__dirname}/../../../public/loading.html` : `file://${__dirname}/../../loading.html`;
  loadingWindow?.loadURL(loadingUrl);
  loadingWindow?.show();
};

function checkPartition() {
  let part = getStoreKey("PartitionRandom") || 0;

  part = part > 4 ? 1 : part + 1;
  setStoreKey("PartitionRandom", part);
  return part;
}
