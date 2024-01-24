import { Divider } from "antd";
import { useEffect, useState } from "react";
import { Virtuoso } from "react-virtuoso";

import group from "@/assets/images/contact/my_groups.png";
import { IMSDK } from "@/layout/MainContentWrap";
import { NomalMessageItem } from "@/pages/chat/queryChat/SearchMessageDrawer/NomalMessagePane";
import { ExMessageItem } from "@/store";
import { getDefaultAvatar } from "@/utils/avatar";
import { formatMessageByType } from "@/utils/imCommon";
import { MessageType } from "@/utils/open-im-sdk-wasm/types/enum";

import Empty from "../Empty";
import NavLink from "../NavLink";
import SearchItem from "../SearchItem";

type SearchResultItems = {
  conversationID: string;
  conversationType: number;
  showName: string;
  faceURL: string;
  messageCount: number;
  messageList: ExMessageItem[];
};

type MessageInfo = {
  searchResultItems: SearchResultItems[];
};

type MessageProps = {
  keyword: string;
  cutting?: boolean;
  conversationID?: string;
  setActiveKey?: (id: string) => void;
  setConversationID?: (id: string) => void;
};

const Message = ({
  keyword,
  cutting,
  conversationID,
  setConversationID,
  setActiveKey,
}: MessageProps) => {
  const [loadState, setLoadState] = useState({
    loading: false,
    hasMore: true,
    pageIndex: 1,
    messageList: [] as SearchResultItems[],
  });

  const [first, setFirst] = useState(true);
  const [showID, setShowID] = useState("");

  useEffect(() => {
    if (conversationID) {
      setShowID(conversationID);
    }
  }, [conversationID]);

  useEffect(() => {
    loadMore(true);
    if (first) {
      setFirst(false);
    } else {
      setShowID("");
    }
  }, [keyword]);

  const loadMore = (clear = false) => {
    if (keyword === "") {
      setLoadState((state) => ({
        ...state,
        messageList: [],
      }));
      return;
    }
    if ((!loadState.hasMore && !clear) || loadState.loading) return;
    setLoadState((state) => ({ ...state, loading: true }));

    IMSDK.searchLocalMessages<MessageInfo>({
      conversationID: "",
      keywordList: [keyword],
      keywordListMatchType: 0,
      senderUserIDList: [],
      messageTypeList: [
        MessageType.TextMessage,
        MessageType.AtTextMessage,
        MessageType.FileMessage,
        MessageType.QuoteMessage,
      ],
      searchTimePosition: 0,
      searchTimePeriod: 0,
      pageIndex: clear ? 1 : loadState.pageIndex,
      count: 20,
    })
      .then(({ data }) => {
        const searchData = data.searchResultItems || [];
        setLoadState((state) => ({
          loading: false,
          pageIndex: state.pageIndex + 1,
          hasMore: searchData.length === 20,
          messageList: [...(clear ? [] : state.messageList), ...searchData],
        }));
      })
      .catch(() => {
        setLoadState((state) => ({
          ...state,
          loading: false,
          messageList: [],
        }));
      });
  };

  const getFristMessageText = (e: SearchResultItems) => {
    if (e.messageCount === 1) {
      return formatMessageByType(e.messageList[0]);
    }
    return `${e.messageCount}条相关的聊天记录`;
  };

  const msgLogo = (item: SearchResultItems) => {
    if (item.conversationType === 1) {
      return getDefaultAvatar(item.faceURL) || item.faceURL || "";
    }
    if (item.conversationType === 3) {
      return item.faceURL || group;
    }
    return "";
  };

  if (cutting) {
    if (!loadState.messageList.length) {
      return null;
    }
    return (
      <div>
        <NavLink
          title="聊天信息"
          hasMore={loadState.messageList.length > 2}
          callback={() => setActiveKey?.("3")}
        />
        {loadState.messageList.map((item, index) => {
          if (index < 2) {
            return (
              <SearchItem
                logo={msgLogo(item)}
                key={item.conversationID}
                name={item.showName}
                desc={getFristMessageText(item)}
                callback={() => {
                  setConversationID?.(item.conversationID);
                  setActiveKey?.("3");
                }}
              />
            );
          }
        })}
      </div>
    );
  }

  if (!loadState.messageList.length) {
    return <Empty />;
  }

  const messageItemList =
    loadState.messageList.find((item) => item.conversationID === showID)?.messageList ||
    [];

  // console.log(conversationID);
  // console.log(showID);

  return (
    <div className="flex h-full flex-row overflow-hidden">
      <div className="flex h-full flex-1 flex-col">
        <Virtuoso
          className="mt-1 h-full"
          data={loadState.messageList}
          endReached={() => loadMore()}
          itemContent={(_, item) => (
            <SearchItem
              logo={msgLogo(item)}
              key={item.conversationID}
              name={item.showName}
              desc={getFristMessageText(item)}
              isAction={item.conversationID === showID}
              callback={() => setShowID(item.conversationID)}
            />
          )}
        />

        <div className=" text-center text-sm text-gray-400">已展示全部结果</div>
      </div>
      <Divider type="vertical" className="border-1 mx-3 h-full border-[#F4F5F7]" />
      <div className="flex-1">
        <Virtuoso
          className="mt-1 h-full overflow-x-hidden"
          data={messageItemList}
          itemContent={(_, message) => <NomalMessageItem message={message} />}
        />
      </div>
    </div>
  );
};

export default Message;
