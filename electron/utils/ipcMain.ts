import { app, BrowserWindow, dialog, FileFilter, ipcMain, Menu } from "electron";
import { checkForUpdates } from ".";
import { setTrayTitle } from "./tray";
import { screenshot } from "./srcShot";
import { cachePath } from "./cache";
const packageJson = require("../../../package.json");

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
};
