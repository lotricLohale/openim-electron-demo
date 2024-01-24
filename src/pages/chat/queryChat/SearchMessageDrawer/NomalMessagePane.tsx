import { SearchOutlined } from "@ant-design/icons";
import { Empty, Input } from "antd";
import { t } from "i18next";
import { FC, useEffect, useState } from "react";
import { Virtuoso } from "react-virtuoso";

import OIMAvatar from "@/components/OIMAvatar";
import { IMSDK } from "@/layout/MainContentWrap";
import { ExMessageItem } from "@/store";
import { feedbackToast } from "@/utils/common";
import { formatMessageTime } from "@/utils/imCommon";
import { MessageType } from "@/utils/open-im-sdk-wasm/types/enum";

import { IMessageItemProps } from "../MessageItem";
import CardMessageRenderer from "../MessageItem/CardMessageRenderer";
import CatchMessageRender from "../MessageItem/CatchMsgRenderer";
import FileMessageRenderer from "../MessageItem/FileMessageRenderer";
import LocationMessageRenderer from "../MessageItem/LocationMessageRenderer";
import MediaMessageRender from "../MessageItem/MediaMessageRender";
import TextMessageRender from "../MessageItem/TextMessageRender";
import VoiceMessageRender from "../MessageItem/VoiceMessageRender";

const canSearchMessageTypes = [
  MessageType.TextMessage,
  MessageType.AtTextMessage,
  MessageType.FileMessage,
  MessageType.QuoteMessage,
];

const initialData = {
  loading: false,
  hasMore: true,
  pageIndex: 1,
  messageList: [] as ExMessageItem[],
};

const NomalMessagePane = ({
  conversationID,
  isOverlayOpen,
}: {
  conversationID?: string;
  isOverlayOpen: boolean;
}) => {
  const [keyword, setKeyword] = useState("");
  const [loadState, setLoadState] = useState({ ...initialData });

  useEffect(() => {
    if (isOverlayOpen) {
      loadMore(true, "");
    }
    return () => {
      if (!isOverlayOpen) {
        setLoadState({ ...initialData });
        setKeyword("");
      }
    };
  }, [conversationID, isOverlayOpen]);

  const loadMore = (clear = false, value = "") => {
    if ((!loadState.hasMore && !clear) || loadState.loading || !conversationID) return;
    setLoadState((state) => ({ ...state, loading: true }));

    IMSDK.searchLocalMessages<any>({
      conversationID,
      keywordList: [value],
      keywordListMatchType: 0,
      senderUserIDList: [],
      messageTypeList: canSearchMessageTypes,
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
      <div className="m-2 flex-1">
        {loadState.messageList.length > 0 ? (
          <Virtuoso
            className="h-full overflow-x-hidden"
            data={loadState.messageList}
            endReached={() => loadMore()}
            components={{
              Header: () => (loadState.loading ? <div>loading...</div> : null),
            }}
            itemContent={(_, message) => <NomalMessageItem message={message} />}
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

export default NomalMessagePane;

const components: Record<number, FC<IMessageItemProps>> = {
  [MessageType.TextMessage]: TextMessageRender,
  [MessageType.AtTextMessage]: TextMessageRender,
  [MessageType.QuoteMessage]: TextMessageRender,
  [MessageType.VoiceMessage]: VoiceMessageRender,
  [MessageType.PictureMessage]: MediaMessageRender,
  [MessageType.VideoMessage]: MediaMessageRender,
  [MessageType.CardMessage]: CardMessageRenderer,
  [MessageType.FileMessage]: FileMessageRenderer,
  [MessageType.LocationMessage]: LocationMessageRenderer,
};

export const NomalMessageItem = ({ message }: { message: ExMessageItem }) => {
  const MessageRenderComponent = components[message.contentType] || CatchMessageRender;

  return (
    <div className="flex items-start rounded-md px-3.5 py-3 hover:bg-[var(--primary-active)]">
      <OIMAvatar src={message.senderFaceUrl} text={message.senderNickname} />
      <div className="ml-3 flex-1">
        <div className="mb-1 flex items-center text-xs">
          <div
            title={message.senderNickname}
            className="max-w-[30%] truncate text-[var(--sub-text)]"
          >
            {message.senderNickname}
          </div>
          <div className="ml-2 text-[var(--sub-text)]">
            {formatMessageTime(message.sendTime)}
          </div>
        </div>
        <MessageRenderComponent disabled={false} message={message} isSender={false} />
        {/* <div>{formatMessageByType(message)}</div> */}
      </div>
    </div>
  );
};
