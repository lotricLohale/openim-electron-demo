import { join } from "node:path";
import { BrowserWindow, dialog, shell } from "electron";
import { isLinux, isMac, isWin, log } from "../utils";
import { destroyTray } from "./trayManage";
import { clearChildWindows } from "./ipcHandlerManage";
import { getStore } from "./storeManage";
import { getIsForceQuit } from "./appManage";
import { maxInstanceCount, singleInstanceLock } from "../config";

const url = process.env.VITE_DEV_SERVER_URL;
let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

const store = getStore();

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    frame: false,
    width: 200,
    height: 200,
    resizable: false,
    transparent: true,
  });
  log.info(global.pathConfig.splashHtml);
  splashWindow.loadFile(global.pathConfig.splashHtml);
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

export function createMainWindow() {
  createSplashWindow();
  mainWindow = new BrowserWindow({
    title: "OpenIM",
    icon: join(global.pathConfig.publicPath, "favicon.ico"),
    frame: false,
    show: false,
    minWidth: 680,
    minHeight: 550,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: global.pathConfig.preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      devTools: true,
      partition: getNextPartition().toString(),
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    // Open devTool if the app is not packaged
    mainWindow.webContents.openDevTools({
      mode: "detach",
    });
    mainWindow.loadURL(url);
  } else {
    mainWindow.loadFile(global.pathConfig.indexHtml);
  }

  // Test actively push message to the Electron-Renderer
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  // // Make all links open with the browser, not with the application
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("close", (e) => {
    if (
      getIsForceQuit() ||
      !mainWindow.isVisible() ||
      store.get("closeAction") === "quit"
    ) {
      mainWindow = null;
      destroyTray();
      clearChildWindows();
    } else {
      e.preventDefault();
      if (isMac && mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false);
      }
      mainWindow?.hide();
    }
  });

  return mainWindow;
}

export function splashEnd() {
  splashWindow?.close();
  mainWindow?.show();
}

export function createChildWindow(
  arg: string,
  options?: Electron.BrowserWindowConstructorOptions,
  search?: string,
) {
  const childWindow = new BrowserWindow({
    // parent: mainWindow,
    ...(options ?? {}),
    show: false,
    webPreferences: {
      preload: global.pathConfig.preload,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  childWindow.on("ready-to-show", () => {
    childWindow.show();
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.webContents.openDevTools({
      mode: "detach",
    });
    console.log(`${url}/#/${arg}${search ? `?${search}` : ""}`);

    childWindow.loadURL(`${url}/#/${arg}${search ? `?${search}` : ""}`);
  } else {
    childWindow.loadFile(global.pathConfig.indexHtml, {
      hash: `/${arg}${search ? `?${search}` : ""}`,
    });
  }
  return childWindow;
}

// utils
export const isExistMainWindow = (): boolean =>
  !!mainWindow && !mainWindow?.isDestroyed();
export const isShowMainWindow = (): boolean => {
  if (!mainWindow) return false;
  return mainWindow.isVisible() && (isWin ? true : mainWindow.isFocused());
};

export const closeWindow = () => {
  if (!mainWindow) return;
  mainWindow.close();
};

export const sendEvent = (name: string, ...args: any[]) => {
  if (!mainWindow) return;
  mainWindow.webContents.send(name, ...args);
};

export const showSelectDialog = async (options: Electron.OpenDialogOptions) => {
  if (!mainWindow) throw new Error("main window is undefined");
  return await dialog.showOpenDialog(mainWindow, options);
};
export const showDialog = ({
  type,
  message,
  detail,
}: Electron.MessageBoxSyncOptions) => {
  if (!mainWindow) return;
  dialog.showMessageBoxSync(mainWindow, {
    type,
    message,
    detail,
  });
};
export const showSaveDialog = async (options: Electron.SaveDialogOptions) => {
  if (!mainWindow) throw new Error("main window is undefined");
  return await dialog.showSaveDialog(mainWindow, options);
};
export const minimize = () => {
  if (!mainWindow) return;
  mainWindow.minimize();
};
export const updateMaximize = () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
};
export const toggleHide = () => {
  if (!mainWindow) return;
  mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
};
export const toggleMinimize = () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) {
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    mainWindow.restore();
    mainWindow.focus();
  } else {
    mainWindow.minimize();
  }
};
export const showWindow = () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  if (mainWindow.isVisible()) {
    mainWindow.focus();
  } else {
    mainWindow.show();
  }
};
export const hideWindow = () => {
  if (!mainWindow) return;
  mainWindow.hide();
};
export const setProgressBar = (
  progress: number,
  options?: Electron.ProgressBarOptions,
) => {
  if (!mainWindow) return;
  mainWindow.setProgressBar(progress, options);
};
export const setIgnoreMouseEvents = (
  ignore: boolean,
  options?: Electron.IgnoreMouseEventsOptions,
) => {
  if (!mainWindow) return;
  mainWindow.setIgnoreMouseEvents(ignore, options);
};
export const toggleDevTools = () => {
  if (!mainWindow) return;
  if (mainWindow.webContents.isDevToolsOpened()) {
    mainWindow.webContents.closeDevTools();
  } else {
    mainWindow.webContents.openDevTools({
      mode: "undocked",
    });
  }
};

export const setFullScreen = (isFullscreen: boolean): boolean => {
  if (!mainWindow) return false;
  if (isLinux) {
    // linux 需要先设置为可调整窗口大小才能全屏
    if (isFullscreen) {
      mainWindow.setResizable(isFullscreen);
      mainWindow.setFullScreen(isFullscreen);
    } else {
      mainWindow.setFullScreen(isFullscreen);
      mainWindow.setResizable(isFullscreen);
    }
  } else {
    mainWindow.setFullScreen(isFullscreen);
  }
  return isFullscreen;
};

export const clearCache = async () => {
  if (!mainWindow) throw new Error("main window is undefined");
  await mainWindow.webContents.session.clearCache();
  await mainWindow.webContents.session.clearStorageData();
};

export const getCacheSize = async () => {
  if (!mainWindow) throw new Error("main window is undefined");
  return await mainWindow.webContents.session.getCacheSize();
};

export const getWebContents = (): Electron.WebContents => {
  if (!mainWindow) throw new Error("main window is undefined");
  return mainWindow.webContents;
};

export const getNextPartition = () => {
  if (singleInstanceLock) return 0;
  const store = getStore();
  let part = (store.get("partitionRandom") as number) || 0;

  part = (part + 1) % maxInstanceCount;
  store.set("partitionRandom", part);
  return part === 0 ? maxInstanceCount : part;
};
