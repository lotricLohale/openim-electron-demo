import { useThrottleFn } from "ahooks";
import { useEffect, useRef, useState } from "react";

import file_download from "@/assets/images/messageItem/file_download.png";
import OIMAvatar from "@/components/OIMAvatar";
import FileDownloadIcon from "@/svg/FileDownloadIcon";
import { downloadFile } from "@/utils/common";
import { formatMessageTime } from "@/utils/imCommon";

type SearchItemProps = {
  logo: string;
  name?: string;
  position?: string;
  desc?: string;
  time?: number;
  isFile?: boolean;
  fileUrl?: string;
  flagID?: string;
  isAction?: boolean;
  localEx?: string;
  callback?: () => void;
};

type DownloadState = "downloading" | "pause" | "resume" | "cancel" | "finish";

const SearchItem = ({
  logo,
  name,
  position,
  desc,
  time,
  isFile,
  fileUrl,
  flagID,
  isAction,
  localEx,
  callback,
}: SearchItemProps) => {
  const [progress, setProgress] = useState(0);
  const [downloadState, setDownloadState] = useState<DownloadState>("cancel");
  const downloadManager = useRef<ReturnType<typeof downloadFile> | null>(null);

  useEffect(() => {
    checkIsDownload();
    return () => {
      downloadManager.current?.cancel();
    };
  }, []);

  const checkIsDownload = () => {
    if (localEx) {
      const isDownload = window.electronAPI?.fileExists(localEx);
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
    if (downloadState === "finish" && localEx) {
      window.electronAPI?.showInFinder(localEx);
      return;
    }

    if (!downloadManager.current || downloadState === "cancel") {
      setDownloadState("downloading");
      downloadManager.current = downloadFile({
        filename: name as string,
        fileUrl: fileUrl as string,
        flagID: flagID as string,
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

  return (
    <div
      style={{ background: isAction ? "var(--primary-active)" : "" }}
      className="my-1 flex cursor-pointer flex-row rounded-md px-3.5 py-3 hover:bg-[var(--primary-active)]"
      onClick={() => {
        callback?.();
        if (isFile) {
          tryDownload();
        }
      }}
    >
      <div>
        <div className="relative cursor-pointer">
          {!isFile && <OIMAvatar src={logo} text={desc} size={42} />}
          {isFile && <img width={38} src={logo} alt="file" />}
          {isFile && downloadState !== "finish" && (
            <div className="absolute left-0 top-0 flex h-full w-full items-center justify-center rounded-md bg-[rgba(0,0,0,.4)]">
              <FileDownloadIcon
                pausing={downloadState === "pause"}
                percent={progress ?? 0}
              />
            </div>
          )}
        </div>
      </div>
      {name && (
        <div className="ml-3 flex-1 flex-col items-center justify-between truncate">
          <div className="truncate">
            <div className="mb-1 flex items-center truncate text-xs">
              <div title={name} className=" truncate text-sm">
                {name}
              </div>
              <span className=" ml-2 text-xs">{position}</span>
              <span className=" ml-2 text-xs text-gray-400">
                {formatMessageTime(time || 0)}
              </span>
            </div>
            <div className=" truncate text-xs text-gray-400">{desc}</div>
          </div>
        </div>
      )}

      {!name && (
        <div className="ml-3 flex flex-1 flex-col items-start justify-center truncate">
          <div className="truncate text-sm">{desc}</div>
        </div>
      )}

      {isFile && downloadState === "cancel" && (
        <div className="right-3 top-5 flex cursor-pointer items-center justify-center">
          <img width={20} src={file_download} alt="download" />
        </div>
      )}
    </div>
  );
};

export default SearchItem;
