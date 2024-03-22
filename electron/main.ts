import { initApp } from "./utils/createWin";
import { app, BrowserWindow, powerMonitor, systemPreferences } from "electron";

import { mainWindow } from "./utils";
import { setAppStatus } from "./store";
import * as os from "os";

function checkPreferences() {
  if (process.platform !== "darwin") {
    return;
  }
  const version = os.release().split(".")[0];
  if (Number(version) < 21) {
    return;
  }
  let privileges = [];
  privileges.push(systemPreferences.getMediaAccessStatus("camera"));
  privileges.push(systemPreferences.getMediaAccessStatus("microphone"));
  privileges.push(systemPreferences.getMediaAccessStatus("screen"));

  privileges.map(async (privilege, idx) => {
    if (privilege !== "granted") {
      if (idx === 0) {
        await systemPreferences.askForMediaAccess("camera");
      }

      if (idx === 1) {
        await systemPreferences.askForMediaAccess("microphone");
      }
    }
  });
}

app.setAppUserModelId("OpenIM");

app.on("ready", () => {
  initApp();
  checkPreferences();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    initApp();
  } else {
    if (mainWindow?.isMinimized()) {
      mainWindow?.restore();
    }
    if (mainWindow?.isVisible()) {
      mainWindow?.focus();
    } else {
      if (process.platform !== "darwin") {
        mainWindow?.minimize();
      }
      mainWindow?.show();
    }
  }
});

app.on("quit", () => {
  setAppStatus(false);
});

powerMonitor.on("resume", () => {
  mainWindow?.webContents.send("WakeUp");
});
