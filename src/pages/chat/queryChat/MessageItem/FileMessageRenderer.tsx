import { useThrottleFn } from "ahooks";
import { Spin } from "antd";
import { FC, useEffect, useRef, useState } from "react";

import file_icon from "@/assets/images/messageItem/file_icon.png";
import { IMSDK } from "@/layout/MainContentWrap";
import { useConversationStore } from "@/store";
import FileDownloadIcon from "@/svg/FileDownloadIcon";
import { bytesToSize, downloadFile } from "@/utils/common";
import { CbEvents } from "@/utils/open-im-sdk-wasm/constant";
import { WSEvent } from "@/utils/open-im-sdk-wasm/types/entity";
import { MessageStatus } from "@/utils/open-im-sdk-wasm/types/enum";

import { IMessageItemProps } from ".";

type DownloadState = "downloading" | "pause" | "resume" | "cancel" | "finish";

const FileMessageRenderer: FC<IMessageItemProps> = ({ message }) => {
  const { fileElem } = message;
  const [progress, setProgress] = useState(0);
  const [downloadState, setDownloadState] = useState<DownloadState>("cancel");
  const isSending = message.status === MessageStatus.Sending;
  const isSucceed = message.status === MessageStatus.Succeed;

  const downloadManager = useRef<ReturnType<typeof downloadFile> | null>(null);

  useEffect(() => {
    const uploadHandle = ({
      data: { clientMsgID, progress },
    }: WSEvent<{ clientMsgID: string; progress: number }>) => {
      if (clientMsgID === message.clientMsgID) {
        setProgress(progress);
        if (progress === 100) {
          setTimeout(() => {
            setProgress(0);
          }, 1000);
        }
      }
    };
    checkIsDownload();
    IMSDK.on(CbEvents.OnProgress, uploadHandle);
    return () => {
      IMSDK.off(CbEvents.OnProgress, uploadHandle);
      downloadManager.current?.cancel();
    };
  }, []);

  const checkIsDownload = () => {
    if (message.localEx) {
      const isDownload = window.electronAPI?.fileExists(message.localEx);
      if (isDownload) {
        setDownloadState("finish");
      }
    }
  };

  const downloadProgressCb = (downloadProgress: number) => {
    setProgress(downloadProgress);
    if (downloadProgress === 100) {
      setTimeout(
        () => setDownloadState(window.electronAPI ? "finish" : "cancel"),
        1000,
      );
    }
  };

  const { run } = useThrottleFn(downloadProgressCb, { wait: 1000 });

  const tryDownload = () => {
    if (downloadState === "finish") {
      window.electronAPI?.showInFinder(message.localEx);
      return;
    }

    if (!downloadManager.current || downloadState === "cancel") {
      setDownloadState("downloading");
      downloadManager.current = downloadFile({
        filename: fileElem.fileName,
        fileUrl: fileElem.sourceUrl,
        flagID: `${message.clientMsgID}-${
          useConversationStore.getState().currentConversation?.conversationID
        }`,
        onProgress: run,
      });
    }

    if (downloadState === "downloading" || downloadState === "resume") {
      setDownloadState("pause");
      downloadManager.current.pause();
    }

    if (downloadState === "pause") {
      setDownloadState("resume");
      downloadManager.current.resume();
    }
  };

  const showDownloadProgressTypes = ["downloading", "pause", "resume"];
  const showDownloadProgress = showDownloadProgressTypes.includes(downloadState);

  return (
    <Spin spinning={isSending} tip={`${progress}%`}>
      <div className="flex w-60 items-center justify-between rounded-md border border-[var(--gap-text)] p-3">
        <div className="mr-2 flex h-full flex-1 flex-col justify-between overflow-hidden">
          <div className="line-clamp-2 break-all">{fileElem.fileName}</div>
          <div className="text-xs text-[var(--sub-text)]">
            {bytesToSize(fileElem.fileSize)}
          </div>
        </div>
        <div className="relative min-w-[38px] cursor-pointer" onClick={tryDownload}>
          <img width={38} src={file_icon} alt="file" />
          {isSucceed && downloadState !== "finish" && (
            <div className="absolute left-0 top-0 flex h-full w-full items-center justify-center rounded-md bg-[rgba(0,0,0,.4)]">
              <FileDownloadIcon
                pausing={downloadState === "pause"}
                percent={!showDownloadProgress ? 0 : progress}
              />
            </div>
          )}
        </div>
      </div>
    </Spin>
  );
};

export default FileMessageRenderer;
