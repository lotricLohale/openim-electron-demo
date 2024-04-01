import { SearchOutlined } from "@ant-design/icons";
import { Empty, Input, TabPaneProps, Tabs, Typography, Image as AntdImage, Dropdown, Menu, message } from "antd";
import { t } from "i18next";
import { FC, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { debounce, throttle } from "throttle-debounce";
import { bytesToSize, copy2Text, downloadFileUtil, events, formatDate, im, parseLatestTime, switchFileIcon, s_to_hs } from "../../../../utils";
import { ConversationItem, MessageItem, MessageType, SessionType, WsResponse } from "../../../../utils/open_im_sdk/types";
import styles from "../../../../components/VirtualSearchBar/index.module.less";
import file_zip from "../../../../assets/images/file_zip.png";
import { shallowEqual, useSelector } from "react-redux";
import { RootState } from "../../../../store";
import { isFileDownloaded, parseMessageType } from "../../../../utils/im";
import { SHOW_PLAYER_MODAL } from "../../../../constants/events";
import { TipsType } from "../../../../constants/messageContentType";
import SwitchMsgType from "../MsgItem/SwitchMsgType/SwitchMsgType";
import { RequestFunc } from "../../../../utils/open_im_sdk";
import MyAvatar from "../../../../components/MyAvatar";

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
  const { t } = useTranslation();
  const [messageContent, setMessageContent] = useState<MessageContentPorps[]>([]);
  const [picContent, setPicContent] = useState<PicContentProps[]>([]);
  const [videoContent, setVideoContent] = useState<VideoContentProps[]>([]);
  const [fileContent, setFileContent] = useState<FileContentProps[]>([]);
  const selfID = useSelector((state: RootState) => state.user.selfInfo.userID, shallowEqual);

  useEffect(() => {
    setTimeout(() => {
      const ink: HTMLDivElement | null = window.document.querySelector(".ant-tabs-ink-bar");
      if (ink) ink.style.transform = "translateX(3px)";
    });
  }, []);

  const tabChange = (key: string) => {
    setActiveKey(key);
    if (key === "101") return;
    searchMessage("", Number(key));
  };

  const searchMessage = (key: string, type?: number) => {
    if (key === "" && !type) return;
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

    im.searchLocalMessages(options).then((res) => {
      console.log(JSON.parse(res.data));
      const searchInfo = JSON.parse(res.data);
      const haveData = searchInfo.searchResultItems ? searchInfo.searchResultItems[0].messageList : null;
      switch (type) {
        case 102:
          if (!haveData) {
            setPicContent([]);
            return false;
          }
          const picData = haveData.map((item: any) => {
            return {
              url: item.pictureElem.snapshotPicture.url,
            };
          });
          setPicContent(picData);
          break;
        case 104:
          if (!haveData) {
            setVideoContent([]);
            return false;
          }
          const videoData = haveData.map((item: any) => {
            return {
              videoUrl: item.videoElem.videoUrl,
              snapshotUrl: item.videoElem.snapshotUrl,
              duration: s_to_hs(item.videoElem.duration),
            };
          });
          setVideoContent(videoData);
          break;
        case 105:
          if (!haveData) {
            setFileContent([]);
            return false;
          }
          const fileData = haveData.map((item: MessageItem) => {
            const filesuffix = item.fileElem.fileName.split(".");
            const type = switchFileIcon(filesuffix[filesuffix.length - 1]);
            return {
              name: item.fileElem.fileName,
              size: bytesToSize(item.fileElem.fileSize),
              senderNickname: item.senderNickname,
              time: formatDate(item.createTime)[3] + " " + formatDate(item.createTime)[4],
              type,
              sourceUrl: item.fileElem.sourceUrl,
              filePath: item.fileElem.filePath,
              msgID: item.clientMsgID,
              isSelf: item.sendID === selfID,
            };
          });
          setFileContent(fileData);
          break;
        default:
          if (!haveData) {
            setMessageContent([]);
            return false;
          }
          const messageData = haveData.map((item: MessageItem) => {
            return {
              senderNickname: item.senderNickname,
              createTime: formatDate(item.createTime)[3] + " " + formatDate(item.createTime)[4],
              senderFaceUrl: item.senderFaceUrl,
              content: parseMessageType(item),
              message: item,
            };
          });
          setMessageContent(messageData);
          break;
      }
    });
  };

  const debounceSearch = debounce(1000, searchMessage);

  return (
    <div className="search_message">
      <Tabs activeKey={activeKey} defaultActiveKey="101" onChange={tabChange}>
        <Tabs.TabPane tab="消息" key="101">
          <TextMessageList debounceSearch={debounceSearch} curCve={curCve} messageContent={messageContent} />
        </Tabs.TabPane>
        <Tabs.TabPane tab="图片" key="102">
          <PicMessageList picContent={picContent} />
        </Tabs.TabPane>
        <Tabs.TabPane tab="视频" key="104">
          <VideoMessageList videoContent={videoContent} />
        </Tabs.TabPane>
        <Tabs.TabPane tab="文件" key="105">
          <FileMessageList fileContent={fileContent} />
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
        if (res.event === RequestFunc.GETHISTORYMESSAGELIST) {
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

  const scrollToMsg = (id: string, isBottom = false) => {
    if (id) {
      setTimeout(() => {
        const el = document.getElementById(id);
        el?.scrollIntoView(!isBottom);
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
      const tmpState = {
        ...renderState,
        loadingNext: false,
        hasNext: nlist.length > 19,
        list: [...renderState.list, ...nlist],
      };
      setRenderState(tmpState);
      const lastItem = lastList.reverse().find((list) => !TipsType.includes(list.contentType) && list.contentType !== 1516);
      scrollToMsg(lastItem?.clientMsgID ?? "", true);
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

  const HistoryList = () => (
    <div id="log_scroll" onScroll={throttleScroll} className="detail_list result_list">
      {renderState.list.map(
        (item) =>
          !TipsType.includes(item.contentType) &&
          item.contentType !== 1516 && (
            <div
              id={item.clientMsgID}
              data-time={parseLatestTime(item.sendTime)}
              key={item.clientMsgID}
              // onDoubleClick={() => rightItemDoubleClick(item)}
              className="result_item"
            >
              <MyAvatar src={item.senderFaceUrl} size={36} />
              <div className="item_info">
                <div className="title">{item.senderNickname}</div>
                <div className={`sub_info ${item.contentType === MessageType.CARDMESSAGE ? "sub_card" : ""}`}>
                  {<SwitchMsgType audio={audioRef} isMerge={true} msg={item} curCve={curCve} selfID={""} />}
                </div>
              </div>
            </div>
          )
      )}
    </div>
  );

  const NomalList = () => (
    <ul className="content_list">
      {messageContent.map((item: MessageContentPorps, index: number) => {
        return (
          <li key={index} onDoubleClick={() => toggleToHistory(item.message)}>
            <MyAvatar src={item.senderFaceUrl} size={38} />
            <div className="info">
              <div className="title">
                <Text style={{ maxWidth: "150px" }} ellipsis={{ tooltip: item.senderNickname }}>
                  {item.senderNickname}
                </Text>
                <span>{item.createTime}</span>
              </div>
              <div className="content">
                <span>
                <Paragraph copyable={{ text: item.content, onCopy: () => copy2Text(item.content) }}>
                    <Text ellipsis={{ tooltip: item.content }}>
                      {item.content}
                    </Text>
                  </Paragraph>
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );

  const toggleToHistory = (item: MessageItem) => {
    getHistoryMsg(item);
  };

  const inputOnChange = (key: React.ChangeEvent<HTMLInputElement>) => debounceSearch(key.target.value);

  return (
    <>
      {!renderState.ishistory && (
        <div className="message_search_input">
          <Input onChange={inputOnChange} placeholder={t("Search")} prefix={<SearchOutlined />} />
        </div>
      )}
      <div className="text_message_list">
        {messageContent.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("EmptySearch")} /> : renderState.ishistory ? <HistoryList /> : <NomalList />}
      </div>
      <audio hidden ref={audioRef} />
    </>
  );
};

const preservation = () => {
  console.log("保存");
};

const faceMenu = () => (
  <Menu className={styles.btn_menu}>
    <Menu.Item key="1" onClick={() => preservation()}>
      {t("AddMsg")}
    </Menu.Item>
  </Menu>
);

const PicMessageList = ({ picContent }: any) => {
  return (
    <div className="pic_message_list">
      {picContent.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("EmptySearch")} />
      ) : (
        <>
          <div className="week">
            {/* <span>本周</span> */}
            <div className="content">
              {picContent.map((item: PicContentProps, index: number) => {
                return (
                  <div className="item" key={index}>
                    {/* <Dropdown overlay={faceMenu} trigger={["contextMenu"]} placement="bottom"> */}
                    <AntdImage
                      // preview={false}
                      style={{ borderRadius: "5px" }}
                      height={80}
                      width={80}
                      src={item.url}
                      onContextMenu={() => {}}
                    />
                    {/* </Dropdown> */}
                  </div>
                );
              })}
            </div>
          </div>
          {/* <div className="month">
          <span>本月</span>
          <div className="content">
            {
              new Array(16).fill(null).map((item, index) => {
                return <div className="item" key={index}>
                  <Dropdown
                  overlay={faceMenu}
                  trigger={['contextMenu']}
                  placement='bottom'
                  >
                    <AntdImage
                    // preview={false}
                    style={{borderRadius: '5px'}}
                    height={80}
                    width={80}
                    src={'https://scpic1.chinaz.net/Files/pic/pic9/202203/apic39782_s.jpg'}
                    onContextMenu={() => {}}
                    />
                  </Dropdown>
                </div>
              })
            }
          </div>
        </div> */}
        </>
      )}
    </div>
  );
};

const VideoMessageList = ({ videoContent }: any) => {
  const playVideo = (videoUrl: string) => {
    events.emit(SHOW_PLAYER_MODAL, videoUrl);
  };
  return (
    <div className="video_message_list">
      {videoContent.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("EmptySearch")} />
      ) : (
        <>
          <div className="week">
            {/* <span>本周</span> */}
            <div className="content">
              {videoContent.map((item: VideoContentProps, index: number) => {
                return (
                  <div className="item" key={index}>
                    <AntdImage preview={false} style={{ borderRadius: "5px" }} height={80} width={80} src={item.snapshotUrl} onClick={() => playVideo(item.videoUrl)} />
                    <div className="title">
                      <span></span>
                      <span>{item.duration}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* <div className="month">
          <span>本月</span>
          <div className="content">
            {
              new Array(16).fill(null).map((item, index) => {
                return <div className="item" key={index}>
                  <AntdImage
                  preview={false}
                  style={{borderRadius: '5px'}}
                  height={80}
                  width={80}
                  src={'https://scpic1.chinaz.net/Files/pic/pic9/202203/apic39782_s.jpg'}
                  onContextMenu={() => {}}
                  />
                  <div className="title">
                    <span></span>
                    <span>5:20</span>
                  </div>
                </div>
              })
            }
          </div>
        </div> */}
        </>
      )}
    </div>
  );
};

const FileMessageList = ({ fileContent }: any) => {
  const [foceRender, setFoceRender] = useState(0);

  const downloadFile = (url: string, msgID: string) => {
    const idx = url.lastIndexOf("/");
    const fileName = url.slice(idx + 1);
    downloadFileUtil(url, fileName, msgID);
    setTimeout(() => {
      setFoceRender(Date.now());
    });
  };

  const doubleClick = (item: FileContentProps) => {
    const result = isFileDownloaded(item.msgID);
    const isSelfPath = item.isSelf && window.electron.fileExists(item.filePath);
    const isDownLoadPath = result && window.electron.fileExists(result);
    if (isSelfPath || isDownLoadPath) {
      window.electron.openFile(isSelfPath ? item.filePath : result);
    } else {
      message.info("请先下载后阅览！");
    }
  };

  return (
    <div className="file_message_list">
      {fileContent.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("EmptySearch")} />
      ) : (
        <ul key={foceRender} className="content_list">
          {fileContent.map((item: FileContentProps) => {
            return (
              <li onDoubleClick={() => doubleClick(item)} key={item.msgID}>
                <div className="box">
                  <img src={item.type} alt="" style={{ width: "38px", height: "44px" }} />
                  <div className="info">
                    <div className="title">
                      <Text style={{ maxWidth: "200px" }} ellipsis={{ tooltip: item.name }}>
                        {item.name}
                      </Text>
                    </div>
                    <div className="content">
                      <span>{item.size}&nbsp;&nbsp;</span>
                      <Text style={{ maxWidth: "100px" }} ellipsis={{ tooltip: item.senderNickname }}>
                        {item.senderNickname}
                      </Text>
                      <span>&nbsp;&nbsp;{item.time}</span>
                    </div>
                  </div>
                </div>
                {!isFileDownloaded(item.msgID) && <span className="download" onClick={() => downloadFile(item.sourceUrl, item.msgID)}></span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
