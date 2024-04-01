import { SearchOutlined } from "@ant-design/icons";
import { Empty, Input, TabPaneProps, Tabs, Typography, Image as AntdImage, Dropdown, Menu, message, Divider, Spin } from "antd";
import { t } from "i18next";
import { FC, forwardRef, memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { debounce, throttle } from "throttle-debounce";
import { bytesToSize, copy2Text, downloadFileUtil, events, formatDate, im, parseLatestTime, parseTime, switchFileIcon, s_to_hs } from "../../../../utils";
import { ConversationItem, MessageItem, MessageType, SessionType, WsResponse } from "../../../../utils/open_im_sdk/types";
import styles from "../../../../components/VirtualSearchBar/index.module.less";
import file_zip from "../../../../assets/images/file_zip.png";
import video_right_icon from "@/assets/images/video_right_icon.png";
import { shallowEqual, useSelector } from "react-redux";
import { RootState } from "../../../../store";
import { isFileDownloaded, parseMessageType } from "../../../../utils/im";
import { SHOW_PLAYER_MODAL } from "../../../../constants/events";
import { TipsType } from "../../../../constants/messageContentType";
import SwitchMsgType from "../MsgItem/SwitchMsgType/SwitchMsgType";
import { RequestFunc } from "../../../../utils/open_im_sdk";
import MyAvatar from "../../../../components/MyAvatar";
import VirtualList, { ListRef } from "rc-virtual-list";
import { Loading } from "../../../../components/Loading";
import useListHight from "../../../../utils/hooks/useListHight";
import { useLatest, useUpdate } from "ahooks";
import InfiniteScroll from "react-infinite-scroll-component";

const { Paragraph, Text } = Typography;

type MessageContentPorps = {
  senderNickname: string;
  createTime: number;
  senderFaceUrl: string;
  content: string;
  message: MessageItem;
};

type PicContentProps = {
  url: string;
};

type VideoContentProps = {
  videoUrl: string;
  snapshotUrl: string;
  duration: string;
};

type FileContentProps = {
  name: string;
  size: string;
  senderNickname: string;
  time: string;
  type: string;
  filePath: string;
  sourceUrl: string;
  msgID: string;
  isSelf: boolean;
};

export const SearchMessageDrawer = ({ curCve }: { curCve: ConversationItem }) => {
  const [activeKey, setActiveKey] = useState("101");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const [messageList, setMessageList] = useState({
    nomalList: [] as MessageItem[],
    picList: [] as MessageItem[],
    videoList: [] as MessageItem[],
    fileList: [] as MessageItem[],
  });

  useEffect(() => {
    setTimeout(() => {
      const ink: HTMLDivElement | null = window.document.querySelector(".ant-tabs-ink-bar");
      if (ink) ink.style.transform = "translateX(3px)";
    });
  }, []);

  const tabChange = (key: string) => {
    setActiveKey(key);
    if (key === "101") return;
    if (key === "102" && messageList.picList.length > 0) return;
    if (key === "104" && messageList.videoList.length > 0) return;
    if (key === "105" && messageList.fileList.length > 0) return;
    searchMessage("", Number(key));
  };

  const searchMessage = (key: string, type?: number) => {
    if (key === "" && !type) return;
    setLoading(true);
    const options = {
      conversationID: curCve.conversationID,
      keywordList: type ? [] : [key],
      keywordListMatchType: 0,
      senderUserIDList: [],
      messageTypeList: type ? [type] : [],
      searchTimePosition: 0,
      searchTimePeriod: 0,
      pageIndex: 1,
      count: 200,
    };
    console.log(options);

    im.searchLocalMessages(options)
      .then((res) => {
        const searchInfo = JSON.parse(res.data);
        const historyMsgList = searchInfo.searchResultItems ? searchInfo.searchResultItems[0].messageList : [];
        console.log(historyMsgList);
        const tempList = {
          ...messageList,
        };
        switch (type) {
          case 101:
            tempList.nomalList = historyMsgList;
            break;
          case 102:
            tempList.picList = historyMsgList;
            break;
          case 104:
            tempList.videoList = historyMsgList;
            break;
          case 105:
            tempList.fileList = historyMsgList;
            break;
          default:
            tempList.nomalList = historyMsgList;
        }
        setMessageList(tempList);
      })
      .finally(() => setLoading(false));
  };

  const debounceSearch = debounce(1000, searchMessage);

  return (
    <div className="search_message">
      <Tabs activeKey={activeKey} defaultActiveKey="101" onChange={tabChange}>
        <Tabs.TabPane tab="消息" key="101">
          <Spin spinning={loading}>
            <TextMessageList debounceSearch={debounceSearch} curCve={curCve} messageContent={messageList.nomalList} />
          </Spin>
        </Tabs.TabPane>
        <Tabs.TabPane tab="图片" key="102">
          <Spin spinning={loading}>
            <MediaMessageList mediaContent={messageList.picList} />
          </Spin>
        </Tabs.TabPane>
        <Tabs.TabPane tab="视频" key="104">
          <Spin spinning={loading}>
            <MediaMessageList mediaContent={messageList.videoList} />
          </Spin>
        </Tabs.TabPane>
        <Tabs.TabPane tab="文件" key="105">
          <Spin spinning={loading}>
            <FileMessageList fileContent={messageList.fileList} />
          </Spin>
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

const TextMessageList = ({ messageContent, curCve, debounceSearch }: any) => {
  const [renderState, setRenderState] = useState({
    list: [] as MessageItem[],
    ishistory: false,
    hasPrev: false,
    loadingPrev: false,
    hasNext: false,
    loadingNext: false,
  });
  const audioRef = useRef<HTMLAudioElement>(null);
  const { t } = useTranslation();
  const { listHeight, setListHeight } = useListHight(renderState.ishistory ? 167 : 209);
  const latestListHeight = useLatest(listHeight);
  const vRef = useRef<ListRef>(null);

  useEffect(() => {
    if (renderState.ishistory) {
      setListHeight(latestListHeight.current + 42);
    } else {
      // setListHeight(latestListHeight.current - 42)
    }
  }, [renderState.ishistory]);

  const getHistoryMsg = (message: MessageItem) => {
    const options = {
      userID: "",
      groupID: "",
      count: 20,
      startClientMsgID: message.clientMsgID,
      conversationID: curCve.conversationID,
    };
    let promiseArr: Array<Promise<WsResponse>> = [im.getHistoryMessageList(options), im.getHistoryMessageListReverse(options)];
    let prevs: MessageItem[] = [];
    let nexts: MessageItem[] = [];
    Promise.all(promiseArr).then((resArr) => {
      resArr.forEach((res) => {
        if (res.event.toUpperCase() === RequestFunc.GETHISTORYMESSAGELIST.toUpperCase()) {
          prevs = JSON.parse(res.data);
        } else {
          nexts = JSON.parse(res.data);
        }
      });
      setRenderState({
        ...renderState,
        list: [...prevs, message, ...nexts],
        ishistory: true,
        hasPrev: prevs.length > 19,
        hasNext: nexts.length > 19,
      });
      scrollToMsg(message.clientMsgID);
    });
  };

  const scrollToMsg = (id: string) => {
    if (id) {
      setTimeout(() => {
        vRef.current?.scrollTo({
          key: id,
          align: "top",
        });
      });
    }
  };

  const getPrevMsg = () => {
    renderState.loadingPrev = true;
    const lastList = renderState.list;
    const options = {
      userID: "",
      groupID: "",
      count: 20,
      startClientMsgID: lastList[0].clientMsgID,
      conversationID: curCve.conversationID,
    };
    im.getHistoryMessageList(options).then((res) => {
      const plist = JSON.parse(res.data);
      console.log(plist);
      
      const tmpState = {
        ...renderState,
        loadingPrev: false,
        hasPrev: plist.length > 19,
        list: [...plist, ...renderState.list],
      };

      setRenderState(tmpState);
      const lastItem = lastList.find((list) => !TipsType.includes(list.contentType) && list.contentType !== 1516);
      scrollToMsg(lastItem?.clientMsgID ?? "");
    });
  };

  const getNextMsg = () => {
    renderState.loadingNext = true;
    const lastList = renderState.list;
    const options = {
      userID: "",
      groupID: "",
      count: 20,
      startClientMsgID: lastList[lastList.length - 1].clientMsgID,
      conversationID: curCve.conversationID,
    };
    im.getHistoryMessageListReverse(options).then((res) => {
      const nlist = JSON.parse(res.data);
      console.log(nlist);
      
      const tmpState = {
        ...renderState,
        loadingNext: false,
        hasNext: nlist.length > 19,
        list: [...renderState.list, ...nlist],
      };
      setRenderState(tmpState);
      const lastItem = lastList.reverse().find((list) => !TipsType.includes(list.contentType) && list.contentType !== 1516);
      scrollToMsg(lastItem?.clientMsgID ?? "");
    });
  };

  const onRightScroll = (e: any) => {
    const prevFlag = e.target.scrollHeight - e.target.scrollTop > e.target.scrollHeight - 30 && !renderState.loadingPrev && renderState.hasPrev;
    const nextFlag = e.target.scrollHeight - e.target.scrollTop < e.target.clientHeight + 30 && !renderState.loadingNext && renderState.hasNext;

    if (prevFlag) {
      getPrevMsg();
    } else if (nextFlag) {
      getNextMsg();
    }
  };

  const throttleScroll = throttle(250, onRightScroll);

  const HistoryList = () =>
    renderState.list?.length > 0 ? (
      <VirtualList
        height={listHeight}
        data={renderState.list}
        itemHeight={57}
        ref={vRef}
        onScroll={throttleScroll}
        className="detail_list result_list"
        itemKey={"clientMsgID"}
        children={(item: MessageItem) => (!TipsType.includes(item.contentType) && item.contentType !== 1516 ? <HistoryMsgItem audioRef={audioRef} item={item} /> : <div />)}
      />
    ) : (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("EmptySearch")} />
    );

  const NomalList = () =>
    messageContent.length > 0 ? (
      <VirtualList
        height={listHeight}
        data={messageContent}
        itemHeight={65}
        itemKey={"clientMsgID"}
        children={(item: MessageItem) => <NomalMsgItem item={item} toggleToHistory={toggleToHistory} />}
      />
    ) : (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("EmptySearch")} />
    );

  const toggleToHistory = useCallback((item: MessageItem) => {
    getHistoryMsg(item);
  }, []);

  const inputOnChange = (key: React.ChangeEvent<HTMLInputElement>) => debounceSearch(key.target.value);

  return (
    <>
      {!renderState.ishistory && (
        <div className="message_search_input">
          <Input onChange={inputOnChange} placeholder={t("Search")} prefix={<SearchOutlined />} />
        </div>
      )}
      <div className="text_message_list">{renderState.ishistory ? <HistoryList /> : <NomalList />}</div>
      <audio hidden ref={audioRef} />
    </>
  );
};

type MediaItemProps = {
  item: MessageItem;
};

const MediaItem: FC<MediaItemProps> = memo(({ item }) => {
  const isPic = item.contentType === MessageType.PICTUREMESSAGE;
  const playVideo = () => {
    events.emit(SHOW_PLAYER_MODAL, item.videoElem.videoUrl);
  };
  const imgUrl = isPic ? item.pictureElem.sourcePicture.url : item.videoElem.snapshotUrl;
  return (
    <div className="media_item">
      <AntdImage preview={isPic ? undefined : false} loading="lazy" src={imgUrl} />
      {!isPic && (
        <div onClick={playVideo} className="video_mask">
          <img src={video_right_icon} alt="" />
          <div>{s_to_hs(item.videoElem.duration)}</div>
        </div>
      )}
    </div>
  );
});

const MediaMessageList = ({ mediaContent }: any) => {
  const { listHeight } = useListHight(167);

  return (
    <div className="media_message_list">
      {mediaContent.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("EmptySearch")} />
      ) : (
        <InfiniteScroll dataLength={mediaContent.length} next={() => {}} hasMore={false} loader={<Loading height="72px" />} endMessage={<Divider plain />} height={listHeight}>
          {mediaContent.length > 0 ? (
            mediaContent.map((item: MessageItem) => <MediaItem key={item.clientMsgID} item={item} />)
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("NoData")} />
          )}
        </InfiniteScroll>
      )}
    </div>
  );
};

const FileMessageList = ({ fileContent }: any) => {
  const { listHeight } = useListHight(167);

  return (
    <div className="file_message_list">
      {fileContent.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("EmptySearch")} />
      ) : (
        <VirtualList height={listHeight} data={fileContent} itemHeight={60} itemKey={"clientMsgID"} children={(item: MessageItem) => <FileItem item={item} />} />
      )}
    </div>
  );
};

type FileItemProps = {
  item: MessageItem;
};

const FileItem: FC<FileItemProps> = memo(
  forwardRef(({ item }, ref) => {
    const selfID = useSelector((state: RootState) => state.user.selfInfo.userID, shallowEqual);
    const update = useUpdate();

    const downloadFile = (url: string, msgID: string) => {
      const idx = url.lastIndexOf("/");
      const fileName = item.fileElem.fileName;
      downloadFileUtil(url, fileName, msgID);
      setTimeout(() => {
        update();
      });
    };

    const doubleClick = (item: MessageItem) => {
      const result = isFileDownloaded(item.clientMsgID);
      const isSelfPath = item.sendID === selfID && window.electron.fileExists(item.fileElem.filePath);
      const isDownLoadPath = result && window.electron.fileExists(result);
      if (isSelfPath || isDownLoadPath) {
        window.electron.openFile(isSelfPath ? item.fileElem.filePath : result);
      } else {
        message.info("请先下载后阅览！");
      }
    };

    const getFileIcon = (item: MessageItem) => {
      const suffix = item.fileElem.fileName.slice(item.fileElem.fileName.lastIndexOf(".") + 1);
      return switchFileIcon(suffix);
    };
    return (
      <div className="file_item" onDoubleClick={() => doubleClick(item)} key={item.clientMsgID}>
        <div className="box">
          <img src={getFileIcon(item)} alt="" style={{ width: "38px", height: "44px" }} />
          <div className="info">
            <div className="title">
              <Text style={{ maxWidth: "200px" }} ellipsis={{ tooltip: item.fileElem.fileName }}>
                {item.fileElem.fileName}
              </Text>
            </div>
            <div className="content">
              <span>{bytesToSize(item.fileElem.fileSize)}&nbsp;&nbsp;</span>
              <Text style={{ maxWidth: "100px" }} ellipsis={{ tooltip: item.senderNickname }}>
                {item.senderNickname}
              </Text>
              <span>&nbsp;&nbsp;{parseTime(item.sendTime, true)}</span>
            </div>
          </div>
        </div>
        {!isFileDownloaded(item.clientMsgID) && <span className="download" onClick={() => downloadFile(item.fileElem.sourceUrl, item.clientMsgID)}></span>}
      </div>
    );
  })
);

type HistoryMsgItemProps = {
  item: MessageItem;
  audioRef: React.RefObject<HTMLAudioElement>;
};
const HistoryMsgItem: FC<HistoryMsgItemProps> = memo(
  forwardRef(({ item, audioRef }, ref) => {
    const curCve = useSelector((state: RootState) => state.cve.curCve, shallowEqual);
    return (
      <div data-time={parseLatestTime(item.sendTime)} className="result_item">
        <MyAvatar src={item.senderFaceUrl} size={36} />
        <div className="item_info">
          <div className="title">{item.senderNickname}</div>
          <div className={`sub_info ${item.contentType === MessageType.CARDMESSAGE ? "sub_card" : ""}`}>
            {<SwitchMsgType audio={audioRef} isMerge={true} msg={item} curCve={curCve} selfID={""} />}
          </div>
        </div>
      </div>
    );
  }),
  () => true
);

const NomalMsgItem = memo(
  forwardRef(({ item, toggleToHistory }: { item: MessageItem; toggleToHistory: (item: MessageItem) => void }, ref) => {
    return (
      <div className="text_msg_item" key={item.clientMsgID} onDoubleClick={() => toggleToHistory(item)}>
        <MyAvatar src={item.senderFaceUrl} size={38} />
        <div className="info">
          <div className="top_desc">
            <div className="sender">{item.senderNickname}</div>
            <span>{parseTime(item.sendTime, true)}</span>
          </div>
          <div className="content">{parseMessageType(item)}</div>
        </div>
      </div>
    );
  })
);
