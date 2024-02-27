import { ipcRenderer, contextBridge, FileFilter, shell, clipboard, desktopCapturer } from "electron";
import { platform } from "process";
import type { API, APIKey } from "../../src/@types/api";
import { getAppCloseAction, getStoreKey, setAppCloseAction, setStoreKey, removeStoreKey } from "../store";
import * as fs from "fs";

export const apiKey: APIKey = "electron";

const isMac = platform === "darwin";

const isWin = platform === "win32";

const isLinux = platform === "linux";

let listeners: any = {};

const getPlatform = () => {
  switch (platform) {
    case "darwin":
      return 4;
    case "win32":
      return 3;
    case "linux":
      return 7;
    default:
      return 5;
  }
};

const focusHomePage = () => {
  ipcRenderer.send("FocusHomePage");
};

const unReadChange = (num: number) => {
  ipcRenderer.send("UnReadChange", num);
};

const miniSizeApp = () => {
  ipcRenderer.send("MiniSizeApp");
};

const maxSizeApp = () => {
  ipcRenderer.send("MaxSizeApp");
};

const closeApp = () => {
  ipcRenderer.send("CloseApp");
};

const addIpcRendererListener = (event: string, listener: (...args: any[]) => void, flag: string) => {
  listeners[flag] = { event, listener };
  ipcRenderer.addListener(event, listener);
  console.log(listeners[flag]);
};

const removeIpcRendererListener = (flag: string) => {
  if (listeners[flag]) {
    ipcRenderer.removeListener(listeners[flag].event, listeners[flag].listener);
    delete listeners[flag];
  }
};

const screenshot = (needHidden = false) => {
  ipcRenderer.send("Screenshot", needHidden);
};

const getCachePath = () => {
  return ipcRenderer.sendSync("GetCachePath");
};

const OpenShowDialog = (filters: FileFilter[]) => {
  return ipcRenderer.sendSync("OpenShowDialog", filters);
};

const file2url = (path: string) => {
  const file = fs.readFileSync(path);
  const bolb = new Blob([file]);
  return URL.createObjectURL(bolb);
};

const save2path = (path: string, base64: string) => {
  return new Promise((resolve, reject) => {
    let rbase64 = base64.replace(/^data:image\/\w+;base64,/, "");
    fs.writeFile(path, Buffer.from(rbase64, "base64"), (err) => {
      if (err) {
        reject(err);
      } else {
        resolve("success");
      }
    });
  });
};

const fileExists = (path: string) => {
  return fs.existsSync(path);
};

const openFile = (path: string) => {
  shell.openPath(path);
};

const showInFinder = (path: string) => {
  shell.showItemInFolder(path);
};

const download = (path: string) => {
  ipcRenderer.send("Download", path);
};

const openExternal = (url: string) => {
  shell.openExternal(url);
};

const checkForUpdates = () => {
  ipcRenderer.send("CheckForUpdates");
};

const updateDownload = () => {
  ipcRenderer.send("UpdateDownload");
};

const quitAndInstall = () => {
  ipcRenderer.send("QuitAndInstall");
};
const setLoginMain = () => {
  ipcRenderer.send("SetLoginMain");
};
const setLoginInit = () => {
  ipcRenderer.send("SetLoginInit");
};
const getVersion = () => {
  return ipcRenderer.sendSync("GetAppVersion");
};

const copy2Text = (text: string) => {
  clipboard.writeText(text);
};

const delFile = (path: string) => {
  if (path) fs.rm(path, (err) => {});
};

const quitApp = () => {
  ipcRenderer.send("QuitApp");
};

const inputContextMenu = () => {
  ipcRenderer.send("InputContextMenu");
};

const getScreenSource = () => {
  // try {
  //   const sources = await desktopCapturer.getSources({ types: ["screen"] });
  //   console.log(sources);

  //   const stream = await navigator.mediaDevices.getUserMedia({
  //     audio: false,
  //     video: {
  //       deviceId: sources[0].id,
  //     },
  //   });
  //   return stream;
  // } catch (err) {
  //   console.error("Failed to get screen capture permission", err);
  //   // Display an error message to the user
  // }
  return desktopCapturer.getSources({ types: ["screen"] });
};

export const api: API = {
  platform: getPlatform(),
  isMac,
  isWin,
  isLinux,
  focusHomePage,
  unReadChange,
  miniSizeApp,
  maxSizeApp,
  closeApp,
  getAppCloseAction,
  setAppCloseAction,
  addIpcRendererListener,
  removeIpcRendererListener,
  screenshot,
  getCachePath,
  OpenShowDialog,
  file2url,
  save2path,
  fileExists,
  openFile,
  showInFinder,
  download,
  openExternal,
  checkForUpdates,
  updateDownload,
  quitAndInstall,
  setLoginMain,
  setLoginInit,
  getVersion,
  copy2Text,
  delFile,
  quitApp,
  inputContextMenu,
  getStoreKey,
  setStoreKey,
  removeStoreKey,
  getScreenSource,
};

contextBridge.exposeInMainWorld(apiKey, api);
