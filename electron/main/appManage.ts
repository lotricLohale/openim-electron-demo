import { app, shell, systemPreferences } from "electron";
import { isExistMainWindow, showWindow } from "./windowManage";
import { join, dirname } from "node:path";
import { release } from "node:os";
import { existsSync, mkdirSync } from "original-fs";
import { isMac, isProd, isWin } from "../utils";
import { getStore } from "./storeManage";
import { singleInstanceLock } from "../config";

const store = getStore();

export const setSingleInstance = () => {
  if (!singleInstanceLock) return;

  if (!app.requestSingleInstanceLock()) {
    app.quit();
    process.exit(0);
  }

  app.on("second-instance", () => {
    showWindow();
  });
};

export const setUserDataPath = () => {
  if (isWin) {
    const portablePath = join(dirname(app.getPath("exe")), "/portable");
    if (existsSync(portablePath)) {
      app.setPath("appData", portablePath);
      const appDataPath = join(portablePath, "/OpenIMData");
      if (!existsSync(appDataPath)) mkdirSync(appDataPath);
      app.setPath("userData", appDataPath);
    }
  }

  const userDataPath = app.getPath("userData");
  global.dataPath = join(userDataPath, "OpenIMData");
  if (!existsSync(global.dataPath)) mkdirSync(global.dataPath);
};

export const setAppListener = (startApp: () => void) => {
  app.on("web-contents-created", (event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (!/^devtools/.test(url) && /^https?:\/\//.test(url)) {
        shell.openExternal(url);
      }
      console.log(url);
      return { action: "deny" };
    });
  });

  app.on("activate", () => {
    if (isExistMainWindow()) {
      showWindow();
    } else {
      startApp();
    }
  });

  app.on("window-all-closed", () => {
    if (isMac && !getIsForceQuit()) return;

    app.quit();
  });
};

export const performAppStartup = () => {
  app.setAppUserModelId(app.getName());

  app.commandLine.appendSwitch("--autoplay-policy", "no-user-gesture-required");
  app.commandLine.appendSwitch(
    "disable-features",
    "HardwareMediaKeyHandling,MediaSessionService",
  );

  // Disable GPU Acceleration for Windows 7
  if (release().startsWith("6.1")) app.disableHardwareAcceleration();
};

export const setAppGlobalData = () => {
  const electronDistPath = join(__dirname, "../");
  const distPath = join(electronDistPath, "../dist");
  const publicPath = isProd ? distPath : join(electronDistPath, "../public");
  global.pathConfig = {
    electronDistPath,
    distPath,
    publicPath,
    trayIcon: join(publicPath, `/icons/${isWin ? "icon.ico" : "tray.png"}`),
    indexHtml: join(distPath, "index.html"),
    splashHtml: join(distPath, "splash.html"),
    preload: join(__dirname, "../preload/index.js"),
  };
};

export const checkPreferences = () => {
  if (process.platform !== "darwin") {
    return;
  }
  const version = release().split(".")[0];
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
};

export const getIsForceQuit = () =>
  store.get("closeAction") === "quit" || global.forceQuit;
