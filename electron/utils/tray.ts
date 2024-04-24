import { app, BrowserWindow, Menu, Tray } from "electron";
import * as path from "path";
import { getAppCloseAction } from "../store";
import * as isDev from "electron-is-dev";

let appTray: Tray;
let timer: NodeJS.Timeout | null = null;
const emptyPic = path.join(__dirname, isDev ? "../../../public/icons/empty_tray.png" : "../../icons/empty_tray.png");
const trayPic = path.join(__dirname, isDev ? "../../../public/icons/tray.png" : process.platform !== "win32" ? "../../icons/tray.png" : "../../icons/logo256x256.ico");

export const setTray = (mainWindow: BrowserWindow | null) => {
  const showMainWindow = () => {
    if (mainWindow?.isVisible()) {
      if (mainWindow.isMaximized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    } else {
      if (process.platform !== "darwin") {
        mainWindow?.minimize();
        mainWindow?.show();
      }
    }
  };

  const trayMenu = Menu.buildFromTemplate([
    {
      label: "显示主界面",
      click: showMainWindow,
    },
    {
      label: "退出",
      click: () => {
        app.exit();
      },
    },
  ]);
  appTray = new Tray(trayPic);
  appTray.setToolTip("QieQie");

  appTray.setContextMenu(trayMenu);

  appTray.on("click", showMainWindow);

  appTray.on("double-click", showMainWindow);

  mainWindow?.on("close", (e) => {
    if (!mainWindow?.isVisible() || getAppCloseAction()) {
      mainWindow = null;
      appTray.destroy();
    } else {
      e.preventDefault();
      if (process.platform === "darwin" && mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false);
      }
      mainWindow?.hide();

      // mainWindow?.minimize();
    }
  });
};

export const flickerTray = () => {
  let count = 0;
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    count++;
    if (count % 2 == 0) {
      appTray.setImage(emptyPic);
    } else {
      appTray.setImage(trayPic);
    }
  }, 500);
};

export const setTrayTitle = (num: number) => {
  if (appTray.isDestroyed()) {
    return;
  }
  appTray.setTitle(num === 0 ? "" : num > 99 ? "99+" : num + "");
};
