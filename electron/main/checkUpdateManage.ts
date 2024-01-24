import { autoUpdater } from "electron-updater";

import { isExistMainWindow, sendEvent } from "./windowManage";
import { IpcMainToRender, IpcRenderToMain } from "../constants";
import { ipcMain } from "electron";
import { isWin, log } from "../utils";

autoUpdater.logger = log;
autoUpdater.autoDownload = false;

log.info("App starting...");

interface WaitEvent {
  type: string;
  info: unknown;
}

const handleSendEvent = (action: WaitEvent) => {
  if (isExistMainWindow()) {
    setTimeout(() => {
      // 延迟发送事件，过早发送可能渲染进程还没启动完成
      sendEvent(action.type, action.info);
    }, 1000);
  }
};

export default () => {
  autoUpdater.on("checking-for-update", () => {
    log.info("Checking for update...");
  });
  autoUpdater.on("update-available", (info) => {
    log.info("Update available.");
    handleSendEvent({ type: IpcMainToRender.updateAvailable, info });
  });
  autoUpdater.on("update-not-available", (info) => {
    log.info("Update not available.");
    handleSendEvent({ type: IpcMainToRender.updateNotAvailable, info });
  });
  autoUpdater.on("error", (err) => {
    log.info("Error in auto-updater.");
    handleSendEvent({ type: IpcMainToRender.updateError, info: err.message });
  });
  autoUpdater.on("download-progress", (progressObj) => {
    let log_message = `Download speed: ${progressObj.bytesPerSecond}`;
    log_message = `${log_message} - Downloaded ${progressObj.percent}%`;
    log_message = `${log_message} (progressObj.transferred/${progressObj.total})`;
    log.info(log_message);
    handleSendEvent({ type: IpcMainToRender.downloadProgress, info: progressObj });
  });
  autoUpdater.on("update-downloaded", (info) => {
    log.info("Update downloaded.");
    handleSendEvent({ type: IpcMainToRender.updateDownloaded, info });
  });

  ipcMain.on(IpcRenderToMain.checkForUpdate, () => {
    checkUpdate();
  });

  ipcMain.on(IpcRenderToMain.downloadUpdate, () => {
    if (!autoUpdater.isUpdaterActive()) return;
    autoUpdater.downloadUpdate();
  });

  ipcMain.on(IpcRenderToMain.checkForUpdate, () => {
    global.forceQuit = true;
    setTimeout(() => {
      autoUpdater.quitAndInstall(true, true);
    }, 1000);
  });
};

const checkUpdate = () => {
  if (isWin && process.arch.includes("arm")) {
    handleSendEvent({
      type: IpcMainToRender.updateError,
      info: "failed",
    });
  } else {
    autoUpdater.checkForUpdates();
  }
};
