import { app, BrowserWindow, dialog, FileFilter, ipcMain, Menu } from "electron";
import { checkForUpdates, checkPartition } from ".";
import { setTrayTitle } from "./tray";
import * as isDev from "electron-is-dev";
import { screenshot } from "./srcShot";
import * as path from "path";
import { cachePath } from "./cache";
import { SINGLE_INSTANCE } from "../config";
const packageJson = require("../../../package.json");

const UPDATE_ACCOUNT = "UPDATE_ACCOUNT";

export let accountLogin: BrowserWindow | null = null;

export const setIpcMain = (mainWindow: BrowserWindow | null, loadingWindow: BrowserWindow | null) => {
  ipcMain.on("FocusHomePage", (e) => {
    try {
      loadingWindow?.hide();
      loadingWindow?.destroy();
    } catch (error) {}
    mainWindow?.show();
  });

  ipcMain.on("UnReadChange", (e, num) => {
    // app.setBadgeCount(num);
    // setTrayTitle(num);
    mainWindow?.flashFrame(!mainWindow?.isFocused() && num > 0);
  });

  ipcMain.on("MiniSizeApp", (e) => {
    if (mainWindow?.isMinimized()) {
      mainWindow.restore();
    } else {
      mainWindow?.minimize();
    }
  });

  ipcMain.on("MaxSizeApp", (e) => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on("CloseApp", (e) => {
    app.quit();
  });

  ipcMain.on("Screenshot", (e, isHidden) => {
    e.returnValue = screenshot(isHidden);
  });

  ipcMain.on("GetCachePath", (e) => {
    e.returnValue = cachePath;
  });

  ipcMain.on("OpenShowDialog", (e, filters: FileFilter[]) => {
    e.returnValue = dialog.showOpenDialogSync(mainWindow!, {
      filters,
      properties: ["openFile"],
    });
  });

  ipcMain.on("Download", (e, url) => {
    mainWindow?.webContents.downloadURL(url);
  });

  ipcMain.on("CheckForUpdates", (e) => {
    checkForUpdates(mainWindow);
  });

  ipcMain.on("GetAppVersion", (e) => {
    e.returnValue = packageJson.version;
  });

  ipcMain.on("QuitApp", () => {
    if (mainWindow?.isVisible) {
      setTimeout(() => app.quit());
    }
    app.exit();
  });
  ipcMain.on("SetLoginMain", (e, filters: FileFilter[]) => {
    mainWindow?.setSize(1080, 810);
    mainWindow?.center();
  });
  ipcMain.on("SetLoginInit", (e, filters: FileFilter[]) => {
    mainWindow?.setSize(500, 800);
    mainWindow?.center();
  });
  ipcMain.on("GetHistoryState", () => {
    mainWindow?.webContents.canGoBack();
  });
  ipcMain.on("InputContextMenu", (e) => {
    const menu = Menu.buildFromTemplate([
      {
        label: "复制",
        type: "normal",
        role: "copy",
        accelerator: "ctrl+c",
      },
      {
        label: "粘贴",
        type: "normal",
        role: "paste",
        accelerator: "ctrl+v",
      },
    ]);
    menu.popup({
      window: BrowserWindow.getFocusedWindow()!,
    });
  });

  // mainWindow

  mainWindow?.on("maximize", () => {
    mainWindow.webContents.send("MainWinSizeChange");
  });
  mainWindow?.on("unmaximize", () => {
    mainWindow.webContents.send("MainWinSizeChange");
  });
  mainWindow?.on("enter-full-screen", () => {
    mainWindow.webContents.send("MainWinSizeChange");
  });
  mainWindow?.on("leave-full-screen", () => {
    mainWindow.webContents.send("MainWinSizeChange");
  });
  ipcMain.on("accountLogin-close", () => {
    accountLogin?.close();
    accountLogin = null;
    mainWindow?.webContents.send(UPDATE_ACCOUNT);
  });
  ipcMain.on("accountLogin", () => {
    console.log("1231231231111");
    const partition = SINGLE_INSTANCE ? undefined : `persist:part${checkPartition()}`;
    accountLogin = new BrowserWindow({
      minWidth: 500,
      minHeight: 800,
      width: 500,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "../preload/api.js"),
        webSecurity: false,
        partition,
      },
      frame: false,
      show: true,
      titleBarStyle: "hidden",
    });
    let Url = isDev ? "http://localhost:3001/#/login?loginType=account" : `file://${__dirname}/../../index.html/#/login?loginType=account`;
    accountLogin.loadURL(Url);
    if (isDev) {
      accountLogin.webContents.openDevTools({
        mode: "detach",
      });
    }
    accountLogin.on("closed", () => {
      console.log("关闭了");
    });
  });
};
