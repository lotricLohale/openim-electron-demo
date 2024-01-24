import { useRequest } from "ahooks";
import { Image, Layout } from "antd";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";

import { SystemMessageTypes } from "@/constants/im";
import { OverlayVisibleHandle } from "@/hooks/useOverlayVisible";
import MergePreviewModal from "@/pages/common/MergePreviewModal";
import { useMessageStore, useUserStore } from "@/store";
import emitter from "@/utils/events";
import { MergeElem } from "@/utils/open-im-sdk-wasm/types/entity";

import MessageItem from "./MessageItem";
import SystemNotification from "./SystemNotification";

const START_INDEX = 10000;
const INITIAL_ITEM_COUNT = 20;

const ChatContent = () => {
  const { conversationID } = useParams();
  const virtuoso = useRef<VirtuosoHandle>(null);
  const [mergeData, setMergeData] = useState<MergeElem | null>(null);
  const mergePreviewRef = useRef<OverlayVisibleHandle>(null);

  const [albumVisible, setAlbumVisible] = useState(false);
  const [albumCurrent, setAlbumCurrent] = useState(0);
  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);
  const selfUserID = useUserStore((state) => state.selfInfo.userID);
  const messageList = useMessageStore((state) => state.historyMessageList);
  const previewImgList = useMessageStore((state) => state.previewImgList);
  const hasMoreMessage = useMessageStore((state) => state.hasMore);
  const getHistoryMessageList = useMessageStore(
    (state) => state.getHistoryMessageListByReq,
  );

  const { loading, runAsync, cancel } = useRequest(getHistoryMessageList, {
    manual: true,
  });

  useEffect(() => {
    const toBottomHandle = (isAppend: boolean) => {
      setTimeout(() =>
        virtuoso.current?.scrollToIndex({
          index: START_INDEX,
          behavior: "smooth",
        }),
      );
    };
    emitter.on("CHAT_LIST_SCROLL_TO_BOTTOM", toBottomHandle);
    return () => {
      cancel();
      emitter.off("CHAT_LIST_SCROLL_TO_BOTTOM", toBottomHandle);
    };
  }, []);

  const loadMoreMessage = useCallback(() => {
    if (loading || !hasMoreMessage) return;
    runAsync(true).then((count) => {
      setFirstItemIndex((idx) => idx - (count as number));
    });
  }, [loading, hasMoreMessage]);

  const showAlbum = useCallback(
    (clientMsgID: string) => {
      const current = previewImgList.findIndex(
        (img) => img.clientMsgID === clientMsgID,
      );
      if (current < 0) return;
      setAlbumCurrent(current);
      setAlbumVisible(true);
    },
    [previewImgList],
  );

  const showMergeModal = useCallback((data: MergeElem) => {
    setMergeData(data);
    mergePreviewRef.current?.openOverlay();
  }, []);

  return (
    <Layout.Content className="!bg-white">
      <Virtuoso
        className="h-full overflow-x-hidden"
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={INITIAL_ITEM_COUNT - 1}
        ref={virtuoso}
        data={messageList}
        startReached={loadMoreMessage}
        components={{
          Header: () => (loading ? <div>loading...</div> : null),
        }}
        computeItemKey={(_, item) => item.clientMsgID}
        itemContent={(_, message) => {
          if (SystemMessageTypes.includes(message.contentType)) {
            return <SystemNotification message={message} />;
          }
          const isSender = selfUserID === message.sendID;
          return (
            <MessageItem
              conversationID={conversationID}
              message={message}
              messageUpdateFlag={message.senderNickname + message.senderFaceUrl}
              isSender={isSender}
              showAlbum={showAlbum}
              showMergeModal={showMergeModal}
              key={message.clientMsgID}
            />
          );
        }}
      />
      <div style={{ display: "none" }}>
        <Image.PreviewGroup
          preview={{
            current: albumCurrent,
            visible: albumVisible,
            onVisibleChange: (vis) => setAlbumVisible(vis),
            onChange: (next) => setAlbumCurrent(next),
          }}
        >
          {albumVisible &&
            previewImgList.map((img) => <Image key={img.clientMsgID} src={img.url} />)}
        </Image.PreviewGroup>
      </div>
      <MergePreviewModal ref={mergePreviewRef} mergeData={mergeData!} />
    </Layout.Content>
  );
};

export default memo(ChatContent);
