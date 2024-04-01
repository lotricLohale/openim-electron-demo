import { app, session } from "electron";
import * as qs from "qs";
import * as path from "path";

export const downloadUtil = () => {
  session.defaultSession.on("will-download", (event, item, webContents) => {
    const url = item.getURL();
    const idx = url.indexOf("?");
    const params = qs.parse(url.slice(idx + 1));
    const rootPath = app.getPath("userData") + (!params.isUpdate ? "/im_file" : "/im_updater");
    const filePath = path.join(rootPath, params.filename as string || item.getFilename());
    item.setSavePath(filePath);
    item.on("done", (ev, state) => {
      if (params.isUpdate) {
        webContents.send("UpdateDownloaded", filePath);
        return;
      }
      webContents.send("DownloadFinish", state, params.msgid, item.getSavePath(), !params.notCve);
    });
    item.on("updated", (ev, state) => {
      let process = item.getReceivedBytes() / item.getTotalBytes();
      process = Math.round(process * 100);
      if (params.isUpdate) {
        if (state === "interrupted") {
          webContents.send("UpdateDownloadFailed");
          return;
        }
        webContents.send("UpdateProgress", process);
        return;
      }
      webContents.send("DownloadUpdated", state, process, params.msgid, !params.notCve);
    });
  });
};
