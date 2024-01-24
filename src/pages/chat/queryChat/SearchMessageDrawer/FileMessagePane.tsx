import { SearchOutlined } from "@ant-design/icons";
import { useThrottleFn } from "ahooks";
import { Empty, Input } from "antd";
import { t } from "i18next";
import { memo, useEffect, useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";

import file_download from "@/assets/images/messageItem/file_download.png";
import file_icon from "@/assets/images/messageItem/file_icon.png";
import { IMSDK } from "@/layout/MainContentWrap";
import { ExMessageItem, useConversationStore } from "@/store";
import FileDownloadIcon from "@/svg/FileDownloadIcon";
import { bytesToSize, downloadFile, feedbackToast } from "@/utils/common";
import { formatMessageTime } from "@/utils/imCommon";
import { MessageType } from "@/utils/open-im-sdk-wasm/types/enum";

const initialData = {
  loading: false,
  hasMore: true,
  pageIndex: 1,
  messageList: [] as ExMessageItem[],
};

const FileMessagePane = ({
  tabKey,
  activeTab,
  conversationID,
}: {
  tabKey: string;
  activeTab: string;
  conversationID?: string;
}) => {
  const [keyword, setKeyword] = useState("");
  const [loadState, setLoadState] = useState({
    ...initialData,
  });
  const prevConversationID = useRef<string>();

  useEffect(() => {
    return () => {
      setLoadState({ ...initialData });
    };
  }, [conversationID]);

  useEffect(() => {
    if (tabKey === activeTab && conversationID !== prevConversationID.current) {
      loadMore(true, "");
      prevConversationID.current = conversationID;
    }
  }, [conversationID, activeTab]);

  const loadMore = (clear = false, value = "") => {
    if ((!loadState.hasMore && !clear) || loadState.loading || !conversationID) return;
    setLoadState((state) => ({ ...state, loading: true }));

    IMSDK.searchLocalMessages<any>({
      conversationID,
      keywordList: [value],
      keywordListMatchType: 0,
      senderUserIDList: [],
      messageTypeList: [MessageType.FileMessage],
      searchTimePosition: 0,
      searchTimePeriod: 0,
      pageIndex: clear ? 1 : loadState.pageIndex,
      count: 20,
    })
      .then(({ data }) => {
        const searchData: ExMessageItem[] = data.searchResultItems
          ? data.searchResultItems[0].messageList
          : [];
        setLoadState((state) => ({
          loading: false,
          pageIndex: state.pageIndex + 1,
          hasMore: searchData.length === 20,
          messageList: [...(clear ? [] : state.messageList), ...searchData],
        }));
      })
      .catch((error) => {
        setLoadState((state) => ({
          ...state,
          loading: false,
        }));
        feedbackToast({ error, msg: t("toast.getMessageListFailed") });
      });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-5.5">
        <Input
          value={keyword}
          allowClear
          onChange={(e) => {
            setKeyword(e.target.value);
            if (!e.target.value) {
              loadMore(true, e.target.value);
            }
          }}
          placeholder={t("placeholder.search")!}
          prefix={<SearchOutlined rev={undefined} />}
          onPressEnter={() => loadMore(true, keyword)}
        />
      </div>
      <div className="my-2 flex-1 px-2.5">
        {loadState.messageList.length > 0 ? (
          <Virtuoso
            className="h-full overflow-x-hidden"
            data={loadState.messageList}
            endReached={() => loadMore()}
            components={{
              Footer: () => (loadState.loading ? <div>loading...</div> : null),
            }}
            itemContent={(_, message) => <FileMessageItem message={message} />}
          />
        ) : (
          <Empty
            className="flex h-full flex-col items-center justify-center"
            description={t("empty.noSearchResults")}
          />
        )}
      </div>
    </div>
  );
};

export default memo(FileMessagePane);

type DownloadState = "downloading" | "pause" | "resume" | "cancel" | "finish";
const FileMessageItem = ({ message }: { message: ExMessageItem }) => {
  const { fileElem } = message;

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
    if (downloadState === "finish" && message.localEx) {
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

  return (
    <div
      className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2.5 hover:bg-[var(--primary-active)]"
      onClick={() => {
        tryDownload();
      }}
    >
      <div className=" flex items-center">
        <div className="relative">
          <img width={38} src={file_icon} alt="file" />
          {downloadState !== "finish" && (
            <div className="absolute left-0 top-0 flex h-full w-full items-center justify-center rounded-md bg-[rgba(0,0,0,.4)]">
              <FileDownloadIcon
                pausing={downloadState === "pause"}
                percent={progress ?? 0}
              />
            </div>
          )}
        </div>
        <div className="ml-3">
          <div>{fileElem.fileName}</div>
          <div className="mt-2 flex items-center text-xs">
            <div>{bytesToSize(fileElem.fileSize)}</div>
            <div className="ml-3.5 mr-2 max-w-[120px] truncate text-[var(--sub-text)]">
              {message.senderNickname}
            </div>
            <div className="text-[var(--sub-text)]">
              {formatMessageTime(message.sendTime)}
            </div>
          </div>
        </div>
      </div>
      {downloadState === "cancel" && (
        <div>
          <img width={20} src={file_download} alt="download" />
          {/* <img width={20} src={file_downloaded} alt="downloaded" /> */}
          {/* <FileDownloadIcon
          baseClassName="!stroke-[transparent]"
          arrowClassName="!stroke-[#0089ff]"
          percent={90}
        /> */}
        </div>
      )}
    </div>
  );
};
