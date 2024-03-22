import { app, BrowserWindow } from "electron";
import { SINGLE_INSTANCE } from "../config";

export const setSingleInstance = (mainWindow: BrowserWindow) => {
  if (!SINGLE_INSTANCE) return;
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
    process.exit(0);
  } else {
    app.on("second-instance", (event, commandLine, workingDirectory) => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
          mainWindow.show();
        }
        if (mainWindow.isVisible()) {
          mainWindow.focus();
        } else {
          mainWindow.show();
        }
      } else {
        app.quit();
      }
    });
  }
};
