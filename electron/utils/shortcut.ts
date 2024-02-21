import { BrowserWindow, globalShortcut } from "electron";

export const registeShortcut = (mainWindow: BrowserWindow) => {
  globalShortcut.register("ESC", () => {
    if (mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
    }
  });
};