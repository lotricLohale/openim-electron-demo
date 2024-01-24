import { Empty, Image } from "antd";
import clsx from "clsx";
import { isThisMonth, isThisWeek } from "date-fns";
import { t } from "i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";

import play_icon from "@/assets/images/messageItem/play_video.png";
import { IMSDK } from "@/layout/MainContentWrap";
import { ExMessageItem, useConversationStore } from "@/store";
import { PreViewImg } from "@/store/type";
import { feedbackToast } from "@/utils/common";
import { MessageType } from "@/utils/open-im-sdk-wasm/types/enum";

const MediaMessagePane = ({
  isVideo,
  activeTab,
  tabKey,
  conversationID,
}: {
  isVideo?: boolean;
  activeTab: string;
  tabKey: string;
  conversationID?: string;
}) => {
  const albumCurrnt = useRef(0);
  const [albumVisible, setAlbumVisible] = useState(false);
  const [loadState, setLoadState] = useState({
    loading: false,
    hasMore: true,
    pageIndex: 1,
    weekMessage: [] as ExMessageItem[],
    monthMessage: [] as ExMessageItem[],
    earlierMessage: [] as ExMessageItem[],
    previewItems: [] as PreViewImg[],
  });

  const prevConversationID = useRef<string>();

  useEffect(() => {
    return () => {
      setLoadState((state) => ({
        ...state,
        weekMessage: [],
        monthMessage: [],
        earlierMessage: [],
        previewItems: [],
      }));
    };
  }, [conversationID]);

  useEffect(() => {
    if (tabKey === activeTab && conversationID !== prevConversationID.current) {
      loadMore(true);
      prevConversationID.current = conversationID;
    }
  }, [conversationID, activeTab]);

  const loadMore = (clear = false) => {
    if ((!loadState.hasMore && !clear) || loadState.loading || !conversationID) return;
    setLoadState((state) => ({
      ...state,
      loading: true,
      pageIndex: clear ? 1 : state.pageIndex,
    }));

    IMSDK.searchLocalMessages<any>({
      conversationID,
      keywordList: [],
      keywordListMatchType: 0,
      senderUserIDList: [],
      messageTypeList: [
        !isVideo ? MessageType.PictureMessage : MessageType.VideoMessage,
      ],
      searchTimePosition: 0,
      searchTimePeriod: 0,
      pageIndex: clear ? 1 : loadState.pageIndex,
      count: 20,
    })
      .then(({ data }) => {
        const searchData: ExMessageItem[] = data.searchResultItems
          ? data.searchResultItems[0].messageList
          : [];
        const weekMessage: ExMessageItem[] = !clear ? [...loadState.weekMessage] : [];
        const monthMessage: ExMessageItem[] = !clear ? [...loadState.monthMessage] : [];
        const earlierMessage: ExMessageItem[] = !clear
          ? [...loadState.earlierMessage]
          : [];
        const previewItems: PreViewImg[] = !clear ? [...loadState.previewItems] : [];
        searchData.map((message) => {
          const time = message.sendTime;
          if (isThisWeek(time)) {
            weekMessage.push(message);
          } else if (isThisMonth(time)) {
            monthMessage.push(message);
          } else {
            earlierMessage.push(message);
          }
          if (!isVideo) {
            previewItems.push({
              url: message.pictureElem.sourcePicture.url,
              clientMsgID: message.clientMsgID,
            });
          }
        });

        setLoadState((state) => ({
          loading: false,
          pageIndex: state.pageIndex + 1,
          hasMore: searchData.length === 20,
          weekMessage,
          monthMessage,
          earlierMessage,
          previewItems,
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

  const showAlbum = useCallback(
    (clientMsgID: string) => {
      const current = loadState.previewItems.findIndex(
        (img) => img.clientMsgID === clientMsgID,
      );
      if (current < 0) return;
      albumCurrnt.current = current;
      setAlbumVisible(true);
    },
    [loadState.previewItems.length],
  );

  const dataSource = [
    loadState.weekMessage,
    loadState.monthMessage,
    loadState.earlierMessage,
  ];

  return (
    <div className="h-full px-5.5 pb-2">
      {dataSource.flat().length > 0 ? (
        <Virtuoso
          className="h-full overflow-x-hidden"
          data={dataSource}
          endReached={() => loadMore()}
          components={{
            Footer: () => (loadState.loading ? <div>loading...</div> : null),
          }}
          itemContent={(index, messageList) => {
            switch (index) {
              case 0:
                return messageList.length ? (
                  <MediaMessageRow
                    title={"本周"}
                    messageList={messageList}
                    preview={showAlbum}
                  />
                ) : (
                  <PlaceholderEl />
                );
              case 1:
                return messageList.length ? (
                  <MediaMessageRow
                    title={"本月"}
                    messageList={messageList}
                    preview={showAlbum}
                  />
                ) : (
                  <PlaceholderEl />
                );
              case 2:
                return messageList.length ? (
                  <MediaMessageRow
                    title={"更早"}
                    messageList={messageList}
                    preview={showAlbum}
                  />
                ) : (
                  <PlaceholderEl />
                );
              default:
                return <PlaceholderEl />;
            }
          }}
        />
      ) : (
        <Empty
          className="flex h-full flex-col items-center justify-center"
          description={t("empty.noSearchResults")}
        />
      )}
      <div style={{ display: "none" }}>
        <Image.PreviewGroup
          preview={{
            current: albumCurrnt.current,
            visible: albumVisible,
            onVisibleChange: (vis) => setAlbumVisible(vis),
          }}
        >
          {albumVisible &&
            loadState.previewItems.map((img) => (
              <Image key={img.clientMsgID} src={img.url} />
            ))}
        </Image.PreviewGroup>
      </div>
    </div>
  );
};

export default MediaMessagePane;

const MediaMessageRow = ({
  title,
  messageList,
  preview,
}: {
  title: string;
  messageList: ExMessageItem[];
  preview?: (clientMsgID: string) => void;
}) => (
  <div className="mb-3">
    <div className="mb-3">{title}</div>
    <div className="grid grid-cols-4 gap-2">
      {messageList.map((message) => {
        const isVideo = message.contentType === MessageType.VideoMessage;
        const sourceUrl = isVideo
          ? message.videoElem.snapshotUrl
          : message.pictureElem.snapshotPicture.url;
        return (
          <div
            className={clsx(
              "grid-image relative flex h-[90px] items-center justify-center overflow-hidden rounded-md",
              { "cursor-pointer": isVideo },
            )}
            key={message.clientMsgID}
          >
            <Image
              src={sourceUrl}
              height={90}
              preview={
                isVideo
                  ? false
                  : { visible: false, src: message.pictureElem.sourcePicture.url }
              }
              onClick={() => !isVideo && preview?.(message.clientMsgID)}
            />
            {isVideo && (
              <img
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                width={40}
                src={play_icon}
                alt="play"
              />
            )}
          </div>
        );
      })}
    </div>
  </div>
);

const PlaceholderEl = () => <div className="h-px" />;
