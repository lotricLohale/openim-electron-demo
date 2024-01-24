import { useEffect, useState } from "react";
import { Virtuoso } from "react-virtuoso";

import file from "@/assets/images/messageItem/file_icon.png";
import { IMSDK } from "@/layout/MainContentWrap";
import { ExMessageItem } from "@/store";
import { MessageType } from "@/utils/open-im-sdk-wasm/types/enum";

import Empty from "../Empty";
import NavLink from "../NavLink";
import SearchItem from "../SearchItem";

type SearchResultItems = {
  conversationID: string;
  showName: string;
  faceURL: string;
  messageCount: number;
  messageList: ExMessageItem[];
};

type MessageInfo = {
  searchResultItems: SearchResultItems[] | null;
};

type FileProps = {
  keyword: string;
  cutting?: boolean;
  setActiveKey?: (id: string) => void;
};

const File = ({ keyword, cutting, setActiveKey }: FileProps) => {
  const [loadState, setLoadState] = useState({
    loading: false,
    hasMore: true,
    pageIndex: 1,
    messageList: [] as SearchResultItems[],
  });

  useEffect(() => {
    loadMore(true);
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
      messageTypeList: [MessageType.FileMessage],
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
        }));
      });
  };

  if (cutting) {
    if (!loadState.messageList.length) {
      return null;
    }
    let showNum = 0;
    return (
      <div>
        <NavLink
          title="文档"
          hasMore={loadState.messageList.flatMap((e) => e.messageList).length > 2}
          callback={() => setActiveKey?.("4")}
        />
        {loadState.messageList.map((items) => {
          return (
            <div key={items.conversationID}>
              {(items.messageList || []).map((messageItem) => {
                if (showNum === 2) return null;
                showNum++;
                return (
                  <SearchItem
                    logo={file}
                    key={messageItem.serverMsgID}
                    name={messageItem.fileElem.fileName}
                    time={messageItem.sendTime}
                    desc={items.showName}
                    isFile
                    localEx={messageItem.localEx}
                    fileUrl={messageItem.fileElem.sourceUrl}
                    flagID={`${messageItem.clientMsgID}-${items.conversationID}`}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  if (!loadState.messageList.length) {
    return <Empty />;
  }

  return (
    <div className="mt-1 flex h-full flex-col">
      <div className="flex-1">
        <Virtuoso
          className="h-full overflow-x-hidden"
          data={loadState.messageList}
          endReached={() => loadMore()}
          itemContent={(_, items) => (
            <div key={items.conversationID}>
              {(items.messageList || []).map((messageItem) => (
                <SearchItem
                  logo={file}
                  key={messageItem.serverMsgID}
                  name={messageItem.fileElem.fileName}
                  time={messageItem.sendTime}
                  desc={items.showName}
                  isFile
                  localEx={messageItem.localEx}
                  fileUrl={messageItem.fileElem.sourceUrl}
                  flagID={`${messageItem.clientMsgID}-${items.conversationID}`}
                />
              ))}
            </div>
          )}
        />
      </div>

      <div className="text-center text-sm text-gray-400">已展示全部结果</div>
    </div>
  );
};

export default File;
