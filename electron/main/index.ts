import { app } from "electron";
import { createMainWindow } from "./windowManage";
import { createTray } from "./trayManage";
import { setIpcMainListener } from "./ipcHandlerManage";
import {
  checkPreferences,
  performAppStartup,
  setAppGlobalData,
  setAppListener,
  setSingleInstance,
  setUserDataPath,
} from "./appManage";
import createAppMenu from "./menuManage";
import initUpdater from "./checkUpdateManage";
import { isLinux } from "../utils";
import { initDownloadManage } from "./downloadManage";

const init = () => {
  initUpdater();
  createMainWindow();
  createAppMenu();
  createTray();
  initDownloadManage();
};

setAppGlobalData();
performAppStartup();
setIpcMainListener();
setSingleInstance();
setUserDataPath();
setAppListener(init);

app.whenReady().then(() => {
  isLinux ? setTimeout(init, 300) : init();
  checkPreferences();
});
