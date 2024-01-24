import { session } from "electron";
import { IpcMainToRender } from "../constants";

export const initDownloadManage = () => {
  session.defaultSession.on("will-download", (_, item, webContents) => {
    item.on("done", () => {
      if (item.getSavePath()) {
        webContents.send(IpcMainToRender.downloadSuccess, item.getURL(), item.getSavePath());
      }
    });
  });
};
