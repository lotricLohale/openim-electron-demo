import { BrowserWindow, ipcMain, app } from "electron";
import * as path from "path";
import * as fs from "fs";
import { autoUpdater } from "electron-updater";

// autoUpdater.updateConfigPath = path.join(__dirname, "../../../app-update.yml");
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.autoDownload = false;
autoUpdater.setFeedURL("https://storage.rentsoft.cn/app")

export const checkForUpdates = (mainWindow: BrowserWindow | null) => {
  autoUpdater.on("checking-for-update", () => {
    console.log("Checking for update...");
  });
  autoUpdater.on("update-available", (info) => {
    console.log("UpdateAvailable::::", info);
    mainWindow?.webContents.send("UpdateAvailable", info);
  });
  autoUpdater.on("update-not-available", (info) => {
    console.log("Update not available.");
  });
  autoUpdater.on("error", (err) => {
    console.log("Error in auto-updater." + err);
  });
  autoUpdater.on("download-progress", (progressObj) => {
    mainWindow?.webContents.send("UpdateProgress", progressObj.percent.toFixed());
  });
  autoUpdater.on("update-downloaded", () => {
    console.log("Update downloaded.");
    mainWindow?.webContents.send("UpdateDownloaded", "");
  });

  ipcMain.on("UpdateDownload", () => {
    try {
      // @ts-ignore
      const cachePath = path.join(autoUpdater.app.baseCachePath, "OpenIM-updater", "pending");
      console.log(fs.existsSync(cachePath), cachePath);
      if (fs.existsSync(cachePath)) {
        emptyDir(cachePath);
      }
      autoUpdater.downloadUpdate();
    } catch (e) {
      console.log(e);
      // do some
    }
  });

  ipcMain.on("QuitAndInstall", () => {
    try {
      autoUpdater.quitAndInstall();
    } catch (e) {}
  });

  console.log("checkForUpdates() -- begin");
  try {
    autoUpdater.checkForUpdates();
  } catch (error) {
    console.log(error);
  }
  console.log("checkForUpdates() -- end");
};

export const emptyDir = (path: string) => {
  if (!fs.existsSync(path)) return;
  const files = fs.readdirSync(path);
  files.forEach((file) => {
    const filePath = `${path}/${file}`;
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      emptyDir(filePath);
    } else {
      fs.unlinkSync(filePath);
      console.log(`删除${file}文件成功`);
    }
  });
};
