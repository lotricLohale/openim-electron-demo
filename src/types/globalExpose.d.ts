import { Platform } from "@/utils/open-im-sdk-wasm/types/enum";

export interface IElectronAPI {
  getVersion: () => string;
  getPlatform: () => Platform;
  subscribe: (channel: string, callback: (...args: any[]) => void) => void;
  subscribeOnce: (channel: string, callback: (...args: any[]) => void) => void;
  unsubscribe: (channel: string, callback: (...args: any[]) => void) => void;
  unsubscribeAll: (channel: string) => void;
  ipcInvoke: <T = unknown>(channel: string, ...arg: any) => Promise<T>;
  fileExists: (path: string) => boolean;
  openFile: (path: string) => void;
  showInFinder: (path: string) => void;
}

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
    userClick: (userID: string, groupID?: string) => void;
    editRevoke: (clientMsgID: string) => void;
    screenshotPreview: (results: string) => void;
  }
}
