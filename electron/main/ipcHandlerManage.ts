import { BrowserWindow, desktopCapturer, ipcMain } from "electron";
import {
  clearCache,
  closeWindow,
  createChildWindow,
  getWebContents,
  minimize,
  splashEnd,
  updateMaximize,
} from "./windowManage";
import { IpcMainToRender, IpcRenderToMain } from "../constants";
import { log } from "../utils";
import { getStore } from "./storeManage";

const childWindowMap: { [key: string]: number } = {};

const store = getStore();

export const clearChildWindows = () => {
  for (const key in childWindowMap) {
    const childWindow = BrowserWindow.getAllWindows().find(
      (win) => win.id === childWindowMap[key],
    );
    if (childWindow && !childWindow.isDestroyed()) {
      childWindow.close();
    }
  }
};

export const openChildWindowHandle = (props) => {
  const { arg, search, key, options } = props;
  if (!childWindowMap[key]) {
    const childWindow = createChildWindow(arg, options, search);
    childWindowMap[key] = childWindow.id;
    return;
  }

  const childWindow = BrowserWindow.getAllWindows().find(
    (win) => win.id === childWindowMap[key],
  );
  if (childWindow) {
    if (childWindow.isMinimized()) {
      childWindow.restore();
    }
    if (childWindow.isVisible()) {
      childWindow.focus();
    } else {
      childWindow.show();
    }
  }
};

export const setIpcMainListener = () => {
  ipcMain.handle(IpcRenderToMain.saveLog, (_, { level, info }) => {
    log[level](info);
  });
  ipcMain.handle(IpcRenderToMain.clearSession, () => {
    clearCache();
  });

  // window manage
  ipcMain.handle("main-win-ready", () => {
    log.info("main-win-ready");
    splashEnd();
  });
  ipcMain.handle(IpcRenderToMain.openChildWindow, (_, props) => {
    openChildWindowHandle(props);
  });
  ipcMain.handle(IpcRenderToMain.minimizeWindow, (_, key) => {
    if (!key) {
      minimize();
      return;
    }
    const childWindow = BrowserWindow.getAllWindows().find(
      (win) => win.id === childWindowMap[key],
    );
    if (childWindow) {
      childWindow.minimize();
    }
  });
  ipcMain.handle(IpcRenderToMain.maxmizeWindow, (_, key) => {
    if (!key) {
      updateMaximize();
      return;
    }
    const childWindow = BrowserWindow.getAllWindows().find(
      (win) => win.id === childWindowMap[key],
    );
    if (childWindow) {
      if (childWindow.isMaximized()) {
        childWindow.unmaximize();
      } else {
        childWindow.maximize();
      }
    }
  });
  ipcMain.handle(IpcRenderToMain.closeWindow, (_, key) => {
    if (!key) {
      closeWindow();
      return;
    }
    const childWindow = BrowserWindow.getAllWindows().find(
      (win) => win.id === childWindowMap[key],
    );
    if (childWindow.isDestroyed()) {
      delete childWindowMap[key];
    }
    if (childWindow && !childWindow.isDestroyed()) {
      childWindow.close();
      delete childWindowMap[key];
    }
  });

  // data transfer
  ipcMain.handle(IpcRenderToMain.transferChooseModalData, (_, { key, data }) => {
    let targetWebContents: Electron.WebContents;
    if (!key) {
      targetWebContents = getWebContents();
    } else {
      targetWebContents = BrowserWindow.getAllWindows().find(
        (win) => win.id === childWindowMap[key],
      ).webContents;
    }
    if (targetWebContents) {
      targetWebContents.send(IpcMainToRender.transferChooseModalData, data);
    }
  });
  ipcMain.handle(IpcRenderToMain.getContactStoreData, (_, { key }) => {
    const targetWebContents = getWebContents();
    targetWebContents.send(IpcMainToRender.getContactStoreData, key);
  });
  ipcMain.handle(IpcRenderToMain.transferContactStoreData, (_, { key, data }) => {
    const targetWebContents = BrowserWindow.getAllWindows().find(
      (win) => win.id === childWindowMap[key],
    )?.webContents;
    if (targetWebContents) {
      targetWebContents.send(IpcMainToRender.transferContactStoreData, data);
    }
  });
  ipcMain.handle(IpcRenderToMain.setKeyStore, (_, { key, data }) => {
    store.set(key, data);
  });
  ipcMain.handle(IpcRenderToMain.getKeyStore, (e, { key }) => {
    return store.get(key);
  });

  // screen share
  ipcMain.handle(IpcRenderToMain.getScreenSource, async () => {
    const sources = await desktopCapturer.getSources({ types: ["screen"] });
    return sources[0]?.id;
  });
};
