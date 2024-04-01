import { useLatest } from "ahooks";
import { Modal, Progress } from "antd";
import { useEffect, useState } from "react";
import { getUpdateStatus } from "../api/admin";

const CheckUpdateModal = () => {
  const [updateState, setUpdateState] = useState({
    visible: false,
    info: {} as any,
    percent: 0,
    downloading: false,
    downloaded: false,
    downloadFailed: false,
    restarting: false,
    localPath: "",
  });
  const latestState = useLatest(updateState);

  useEffect(() => {
    window.electron.addIpcRendererListener("UpdateAvailable", updateAvailableHandler, "updateAvailable");
    window.electron.addIpcRendererListener("UpdateProgress", updateProgressHandler, "updateProgress");
    window.electron.addIpcRendererListener("UpdateDownloaded", updateDownloadedHandler, "updateDownloaded");
    window.electron.addIpcRendererListener("UpdateDownloadFailed", updateFailedHandler, "updateDownloadFailed");
    switchCheckUpdate();
    return () => {
      window.electron.removeIpcRendererListener("updateAvailable");
      window.electron.removeIpcRendererListener("updateProgress");
      window.electron.removeIpcRendererListener("updateDownloaded");
      window.electron.removeIpcRendererListener("updateDownloadFailed");
    };
  }, []);

  const updateAvailableHandler = (e: any, info: any) => {
    setUpdateState({ ...latestState.current, info, visible: true });
  };

  const updateProgressHandler = (e: any, percent: number) => {
    setUpdateState({ ...latestState.current, percent: percent });
  };

  const updateDownloadedHandler = (e: any, path: string) => {
    setUpdateState({ ...latestState.current, downloaded: true, downloading: false, localPath: path ?? "" });
  };

  const updateFailedHandler = () => {
    setUpdateState({ ...latestState.current, downloadFailed: true, downloading: false });
    setTimeout(() => {
      setUpdateState({ ...latestState.current, visible: false });
    }, 2000);
  };

  const switchCheckUpdate = () => {
    if (window.electron.isLinux) {
      getUpdateLog();
    } else {
      window.electron.checkForUpdates();
    }
  };

  const cancel = () => {
    setUpdateState({ visible: false, percent: 0, info: {}, localPath: "", downloading: false, downloaded: false, downloadFailed: false, restarting: false });
  };

  const update = () => {
    if (updateState.downloaded) {
      if (window.electron.isLinux) {
        window.electron.showInFinder(updateState.localPath);
        setTimeout(() => window.electron.quitApp());
      } else {
        if (!window.electron.getAppCloseAction()) {
          window.electron.closeApp();
        }
        window.electron.quitAndInstall();
      }
      setUpdateState({ ...updateState, restarting: true });
    } else {
      if (window.electron.isLinux) {
        window.electron.download(updateState.info.fileURL + "?msgid=updateDownload&isUpdate=true");
      } else {
        window.electron.updateDownload();
      }
      setUpdateState({ ...updateState, downloading: true });
    }
  };

  const getUpdateLog = () => {
    const currentVersion = window.electron.getVersion();
    getUpdateStatus(currentVersion).then((res) => {
      const data = res.data;
      if (data.hasNewVersion) {
        const info = {
          ...data,
          releaseNotes: data.update_log,
        };
        updateAvailableHandler("", info);
      }
    });
  };

  const switchStatus = () => {
    if (updateState.downloaded) {
      return "success";
    }
    if (updateState.downloadFailed) {
      return "exception";
    }
    return "active";
  };

  return (
    <Modal
      footer={updateState.downloading ? null : updateState.downloadFailed ? <div className="failed_tip">下载失败！请稍后重试</div> : undefined}
      cancelText={updateState.downloaded ? "暂不更新" : "下次再说"}
      okText={updateState.downloaded ? "立即更新" : "立即下载"}
      okButtonProps={{ loading: updateState.restarting }}
      cancelButtonProps={{ disabled: updateState.restarting || updateState.info.forceUpdate }}
      onCancel={cancel}
      onOk={update}
      visible={updateState.visible}
      maskClosable={updateState.downloadFailed || (!updateState.info.forceUpdate && !updateState.downloading)}
      closable={updateState.downloadFailed || (!updateState.info.forceUpdate && !updateState.downloading)}
      keyboard={updateState.downloadFailed || (!updateState.info.forceUpdate && !updateState.downloading)}
      className="update_modal"
    >
      <div>
        <h3 data-version={"v" + updateState.info.version} className="version_title">
          发现新版本
        </h3>
        <h4>更新说明：</h4>
        <div>{updateState.info.releaseNotes}</div>
        {updateState.downloading && <Progress style={{ marginTop: "12px" }} percent={updateState.percent} status={switchStatus()} />}
      </div>
    </Modal>
  );
};

export default CheckUpdateModal;
