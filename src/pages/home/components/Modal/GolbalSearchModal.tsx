import { DownloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useLatest, useReactive } from "ahooks";
import { Empty, Input, message, Modal, Progress, TabPaneProps, Tabs } from "antd";
import { t } from "i18next";
import { FC, forwardRef, ForwardRefRenderFunction, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useSelector, shallowEqual } from "react-redux";
import { useNavigate } from "react-router";
import { throttle } from "throttle-debounce";
import { Loading } from "../../../../components/Loading";
import MyAvatar from "../../../../components/MyAvatar";
import { TO_ASSIGN_CVE } from "../../../../constants/events";
import { GroupTypes, TipsType } from "../../../../constants/messageContentType";
import { RootState } from "../../../../store";
import { parseMessageType, im, parseLatestTime, switchFileIcon, downloadFileUtil, events, genAvatar } from "../../../../utils";
import { isFileDownloaded } from "../../../../utils/im";
import { RequestFunc } from "../../../../utils/open_im_sdk";
import { MessageItem, GroupItem, SessionType, MessageType, ConversationItem, WsResponse, FriendItem, SearchLocalLogData, GroupType } from "../../../../utils/open_im_sdk/types";
import SwitchMsgType from "../../Cve/MsgItem/SwitchMsgType/SwitchMsgType";
import group_icon from "@/assets/images/group_icon.png";

type ResultSectionProps = {
  toTab: (tabKey: TabKey) => void;
  resultItemDoubleClick: (item: any) => void;
  section: any;
};

type TabKey = "composite" | "contacts" | "groups" | "logs" | "files";

type CateItem = {
  list: any[];
  loading: boolean;
  hasMore: boolean;
};

type FileItem = MessageItem & FileExtend;

type FileExtend = {
  fileName: string;
  fileIcon: string;
  subKey: string;
};

const GolbalSearchModal = ({ visible, close }: { visible: boolean; close: () => void }) => {
  const [searchInput, setSearchInput] = useState("");
  const latestInput = useLatest(searchInput);
  const [activeKey, setActiveKey] = useState<TabKey>("composite");
  const searchState = useReactive({
    contacts: {
      list: [] as FriendItem[],
      loading: false,
      hasMore: false,
    },
    groups: {
      list: [] as GroupItem[],
      loading: false,
      hasMore: false,
    },
    logs: {
      list: [] as SearchLocalLogData[],
      loading: false,
      hasMore: false,
    },
    files: {
      list: [] as FileItem[],
      loading: false,
      hasMore: false,
    },
  });
  const [searchFlag, setSearchFlag] = useState(false);
  const groupList = useSelector((state: RootState) => state.contacts.groupList, shallowEqual);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const logResultRef = useRef<LogsResultHandler>(null);
  const navigate = useNavigate();

  const toTab = useCallback((tabKey: TabKey) => {
    setActiveKey(tabKey);
  }, []);

  const onTabChange = (tabKey: string) => {
    setActiveKey(tabKey as TabKey);
  };

  const resultItemDoubleClick = useCallback(
    (item: any) => {
      if (item.userID || item.groupName) {
        navigate("/");
        setTimeout(() =>
          events.emit(
            TO_ASSIGN_CVE,
            item.userID ? item.userID : item.groupID,
            item.userID ? SessionType.Single : item.groupType === GroupType.NomalGroup ? SessionType.Group : SessionType.SuperGroup
          )
        );
        close();
      } else if (item.messageCount) {
        toTab("logs");
        setTimeout(() => logResultRef.current?.clickLeftItem(item));
      } else if (item.fileName) {
        const result = isFileDownloaded(item.clientMsgID);
        const isSelfPath = item.isSelf && window.electron.fileExists(item.fileElem.filePath);
        const isDownLoadPath = result && window.electron.fileExists(result);
        if (isSelfPath || isDownLoadPath) {
          window.electron.openFile(isSelfPath ? item.filePath : result);
        } else {
          message.info("请先下载后阅览！");
        }
      }
    },
    [searchFlag]
  );

  const sections = [
    {
      title: t('Contact'),
      key: "contacts",
      ischat: false,
      data: searchState.contacts,
      nameKey: "nickname",
      urlKey: "faceURL",
      timeKey: "timeKey",
      subKey: "remark",
    },
    {
      title: "群组",
      key: "groups",
      ischat: false,
      data: searchState.groups,
      nameKey: "groupName",
      urlKey: "faceURL",
      timeKey: "timeKey",
      subKey: "subKey",
    },
    {
      title: "聊天记录",
      key: "logs",
      ischat: true,
      data: searchState.logs,
      nameKey: "showName",
      urlKey: "faceURL",
      timeKey: "sendTime",
      subKey: "latestMsg",
    },
    {
      title: "文档",
      key: "files",
      ischat: true,
      data: searchState.files,
      nameKey: "fileName",
      urlKey: "fileIcon",
      timeKey: "sendTime",
      subKey: "subKey",
    },
  ];

  const switchKey = useMemo(() => {
    const keyObj = {
      nameKey: "nameKey",
      urlKey: "urlKey",
      timeKey: "timeKey",
      subKey: "subKey",
      data: { list: [] } as any,
    };
    switch (activeKey) {
      case "contacts":
        keyObj.data = searchState.contacts;
        keyObj.nameKey = "nickname";
        keyObj.subKey = "departmentName";
        keyObj.timeKey = "position";
        keyObj.urlKey = "faceURL";
        break;
      case "groups":
        keyObj.nameKey = "groupName";
        keyObj.urlKey = "faceURL";
        keyObj.data = searchState.groups;
        break;
      case "logs":
        keyObj.nameKey = "showName";
        keyObj.timeKey = "sendTime";
        keyObj.urlKey = "faceURL";
        keyObj.subKey = "latestMsg";
        keyObj.data = searchState.logs;
        break;
      case "files":
        keyObj.nameKey = "fileName";
        keyObj.timeKey = "sendTime";
        keyObj.urlKey = "fileIcon";
        keyObj.data = searchState.files;
        break;
    }
    return keyObj;
  }, [searchState.contacts.loading, searchState.groups.loading, searchState.logs.loading, searchState.files.loading, activeKey, searchFlag]);

  const onInputChanged = (value: string) => {
    setSearchInput(value);
    if (value !== "") {
      debounceSearch(value);
    } else {
      logResultRef.current?.resetState();
      resetState();
    }
  };

  const resetState = () => {
    searchState.contacts = {
      list: [] as FriendItem[],
      loading: false,
      hasMore: false,
    };
    searchState.groups = {
      list: [] as GroupItem[],
      loading: false,
      hasMore: false,
    };
    searchState.logs = {
      list: [] as SearchLocalLogData[],
      loading: false,
      hasMore: false,
    };
    searchState.files = {
      list: [] as FileItem[],
      loading: false,
      hasMore: false,
    };

    setSearchFlag((v) => !v);
  };

  const getComposite = (value: string) => {
    if (!latestInput.current) return;

    switch (activeKey) {
      case "composite":
        getContacts(value);
        getGroups(value);
        getLogs(value);
        getFiles(value);
        break;
      case "contacts":
        getContacts(value);
        break;
      case "groups":
        getGroups(value);
        break;
      case "logs":
        getLogs(value);
        break;
      case "files":
        getFiles(value);
        break;
      default:
        resetState();
        return false;
    }
    setTimeout(() => setSearchFlag((v) => !v));
  };

  const debounceSearch = (value: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      getComposite(value);
    }, 500);
  };

  const reg = new RegExp("[\\u4E00-\\u9FFF]+", "g");

  const getContacts = (value: string) => {
    searchState.contacts.loading = true;
    im.searchFriends({
      keywordList: [value],
      isSearchUserID: false,
      isSearchNickname: true,
      isSearchRemark: true,
    })
      .then(({ data }) => {
        let arr = [];
        try {
          arr = JSON.parse(data);
        } catch (error) {}
        searchState.contacts = {
          list: arr,
          loading: false,
          hasMore: arr.length > 3,
        };
      })
      .catch((err) => {
        searchState.contacts = {
          list: [],
          loading: false,
          hasMore: false,
        };
      });
  };

  // const getContacts = (value: string, size = 100) => {
  //   searchState.contacts.loading = true;
  //   const options = {
  //     input: {
  //       keyWord: value,
  //       isSearchUserName: true,
  //       isSearchEnglishName: false,
  //       isSearchPosition: false,
  //       isSearchUserID: false,
  //       isSearchMobile: false,
  //       isSearchEmail: false,
  //       isSearchTelephone: false,
  //     },
  //     offset: 0,
  //     count: 200,
  //   };
  //   im.searchOrganization(options)
  //     .then(({ data }) => {
  //       const orzData = JSON.parse(data).departmentMemberList ?? [];
  //       console.log(JSON.parse(data));
  //       orzData.forEach((member: any) => {
  //         let str = "";
  //         member.parentDepartmentList.forEach((dep: any) => {
  //           str += `-${dep.name}`;
  //         });
  //         if (str.length > 0) {
  //           str = str.slice(1);
  //         }
  //         member.departmentName = str;
  //         member.faceURL = genAvatar(member.nickname, 36);
  //       });
  //       searchState.contacts = {
  //         list: orzData,
  //         loading: false,
  //         hasMore: orzData.length > 3,
  //       };
  //     })
  //     .catch((err) => {
  //       searchState.contacts = {
  //         list: [],
  //         loading: false,
  //         hasMore: false,
  //       };
  //     });
  // };

  const getGroups = (value: string) => {
    searchState.groups.loading = true;
    const filterList = groupList.filter((group) => group.groupName.includes(value));
    searchState.groups = {
      list: filterList,
      loading: false,
      hasMore: filterList.length > 3,
    };
  };

  const parseLatestMsg = (item: MessageItem) => {
    switch (item.contentType) {
      case MessageType.TEXTMESSAGE:
        return item.content;
      case MessageType.ATTEXTMESSAGE:
        return parseMessageType(item);
      case MessageType.FILEMESSAGE:
        return "[" + item.fileElem.fileName + "]";
      default:
        return item.content;
    }
  };

  const getLogs = (value: string) => {
    searchState.logs.loading = true;
    const options = getSearchLocalOptions(value);
    im.searchLocalMessages(options)
      .then((res) => {
        const data: SearchLocalLogData[] = JSON.parse(res.data).searchResultItems ?? [];
        data.forEach((item) => {
          if (GroupTypes.includes(item.conversationType) && !item.faceURL) {
            item.faceURL = group_icon;
          }
          item.sendTime = parseLatestTime(item.messageList[0].sendTime);
          item.latestMsg = item.messageCount > 1 ? `${item.messageCount}条相关聊天记录` : parseLatestMsg(item.messageList[0]);
        });
        searchState.logs = {
          list: data,
          loading: false,
          hasMore: data.length > 3,
        };
      })
      .catch((err) => console.log(err));
  };

  const getFiles = (value: string) => {
    searchState.files.loading = true;
    const options = getSearchLocalOptions(value, true);
    im.searchLocalMessages(options)
      .then((res) => {
        const data: SearchLocalLogData[] = JSON.parse(res.data).searchResultItems ?? [];
        const flatList: FileItem[] = [];
        data.forEach((item) => {
          item.messageList.forEach((message) => {
            const suffix = message.fileElem.fileName.slice(message.fileElem.fileName.lastIndexOf(".") + 1);
            flatList.push({
              ...message,
              fileName: message.fileElem.fileName,
              fileIcon: switchFileIcon(suffix),
              subKey: item.showName,
              sendTime: parseLatestTime(message.sendTime) as any,
            });
          });
        });
        searchState.files = {
          list: flatList,
          loading: false,
          hasMore: flatList.length > 3,
        };
      })
      .catch((err) => console.log(err));
  };

  const getSearchLocalOptions = (value: string, isFile = false) => ({
    conversationID: "",
    keywordList: [value],
    keywordListMatchType: 0,
    senderUserIDList: [],
    messageTypeList: !isFile ? [] : [MessageType.FILEMESSAGE],
    searchTimePosition: 0,
    searchTimePeriod: 0,
    pageIndex: 0,
    count: 0,
  });

  return (
    <Modal className="golbal_search_modal" onCancel={close} maskClosable closable={false} footer={null} visible={visible}>
      <div className="container">
        <Input allowClear value={searchInput} onChange={(v) => onInputChanged(v.target.value)} placeholder={t("Search")} prefix={<SearchOutlined />} />
        <Tabs activeKey={activeKey} onChange={onTabChange}>
          <Tabs.TabPane tab="综合" key="composite">
            <div className="scroll_container">
              {sections.map((section) => (
                <ResultSection resultItemDoubleClick={resultItemDoubleClick} toTab={toTab} key={section.key} section={section} />
              ))}
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab={t('Contact')} key="contacts">
            <div className="scroll_container">
              <ResultList resultItemDoubleClick={resultItemDoubleClick} {...switchKey} />
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab="群组" key="groups">
            <div className="scroll_container">
              <ResultList resultItemDoubleClick={resultItemDoubleClick} {...switchKey} />
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab="聊天记录" key="logs">
            <div className="scroll_container">
              <LogsResultForWard ref={logResultRef} {...switchKey} />
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab="文档" key="files">
            <div className="scroll_container">
              <ResultList resultItemDoubleClick={resultItemDoubleClick} {...switchKey} />
            </div>
          </Tabs.TabPane>
        </Tabs>
      </div>
    </Modal>
  );
};

export default memo(GolbalSearchModal);

const ResultSection: FC<ResultSectionProps> = memo(({ toTab, resultItemDoubleClick, section }) => {
  return (
    <div className={section.ischat ? "result_chat" : "result_cons"}>
      <div className="result_header">
        <span className="title">{section.title}</span>
        {section.data.hasMore && (
          <span onClick={() => toTab(section.key)} className="action">
            查看更多
          </span>
        )}
      </div>
      <ResultList islimit={true} resultItemDoubleClick={resultItemDoubleClick} {...section} data={section.data} />
    </div>
  );
});

type ResultListProps = {
  data: CateItem;
  islimit?: boolean;
  nameKey: string;
  urlKey: string;
  timeKey: string;
  subKey: string;
  selected?: string;
  resultItemClick?: (item: any) => void;
  resultItemDoubleClick?: (item: any) => void;
};

const ResultList: FC<ResultListProps> = memo((props) => {
  const { data, nameKey, urlKey, timeKey, subKey, selected, resultItemClick, resultItemDoubleClick, islimit = false } = props;
  const [_, forceRender] = useState(false);

  useEffect(() => {
    if (nameKey === "fileName") {
      window.electron && window.electron.addIpcRendererListener("DownloadFinish", downloadFinishHandler, "SearchDownloadListener");
      window.electron && window.electron.addIpcRendererListener("DownloadUpdated", downloadUpdatedHandler, "SearchDownloadUpdatedListener");
    }
    return () => {
      if (nameKey === "fileName") {
        window.electron && window.electron.removeIpcRendererListener("SearchDownloadListener");
        window.electron && window.electron.removeIpcRendererListener("SearchDownloadUpdatedListener");
      }
    };
  }, []);

  const downloadFinishHandler = (ev: any, state: "completed" | "cancelled" | "interrupted", msgID: string, path: string, isNotify: boolean) => {
    if (!isNotify) {
      switch (state) {
        case "completed":
          const IMFileMap = JSON.parse(localStorage.getItem("IMFileMap") ?? "{}");
          IMFileMap[msgID] = {
            path,
            status: state,
          };
          localStorage.setItem("IMFileMap", JSON.stringify(IMFileMap));
          message.success("下载成功！");
          forceRender((v) => !v);
          break;
        case "cancelled":
          message.warn("下载已取消！");
          break;
        case "interrupted":
          message.error("下载失败！");
          break;
        default:
          break;
      }
    }
  };

  const downloadUpdatedHandler = (ev: any, state: "", progress: number, msgID: string, isNotify: boolean) => {
    if (!isNotify) {
      const idx = data.list.findIndex((his) => his.clientMsgID === msgID);
      console.log(idx, data.list, msgID);
      data.list[idx].downloadProgress = progress;
    }
  };

  const downloadFile = (item: MessageItem) => {
    const url = item.fileElem.sourceUrl;
    const idx = url.lastIndexOf("/");
    const fileName = item.fileElem.fileName;
    downloadFileUtil(url, fileName, item.clientMsgID, true);
  };

  return (
    <div className="result_list">
      {data.loading ? (
        <Loading />
      ) : data.list.length > 0 ? (
        data.list.map((item, idx) =>
          islimit && idx > 2 ? null : (
            <div
              key={idx}
              onClick={() => resultItemClick && resultItemClick(item)}
              onDoubleClick={() => resultItemDoubleClick && resultItemDoubleClick(item)}
              className={`result_item ${selected && selected === item.conversationID ? "result_item_active" : ""}`}
            >
              <MyAvatar nickname={item.nickname} src={item[urlKey]} size={36} />
              <div data-time={item[timeKey] ?? ""} className="item_info">
                <div className="title">
                  <span>{item[nameKey]}</span>
                  <span className={`sub_title ${timeKey === "position" ? "sub_position" : ""}`}>{item[timeKey] ?? ""}</span>
                </div>
                <div className="sub_info">{item[subKey]}</div>
              </div>
              {item.downloadProgress && item.downloadProgress !== 100 && <Progress type="circle" percent={item.downloadProgress} width={32} />}
              {nameKey === "fileName" && !isFileDownloaded(item.clientMsgID) && <DownloadOutlined onClick={() => downloadFile(item)} />}
            </div>
          )
        )
      ) : (
        <Empty style={{ margin: "12px 0" }} description={"暂无搜索结果"} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </div>
  );
});

type LogsResultHandler = {
  clickLeftItem: (item: SearchLocalLogData) => void;
  resetState: () => void;
};

const LogsResult: ForwardRefRenderFunction<LogsResultHandler, any> = (props, ref) => {
  const [rightState, setRrightState] = useState({
    list: [] as MessageItem[],
    cid: "",
    cve: {} as ConversationItem,
    ishistory: false,
    hasPrev: false,
    loadingPrev: false,
    hasNext: false,
    loadingNext: false,
    fixedFlag: "",
  });
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const clickLeftItem = async (item: SearchLocalLogData) => {
    if (rightState.cid !== item.conversationID) {
      const data = await im.getMultipleConversation([item.conversationID]);
      setRrightState({
        list: item.messageList,
        cid: item.conversationID,
        cve: JSON.parse(data.data)[0],
        ishistory: false,
        hasPrev: false,
        loadingPrev: false,
        hasNext: false,
        loadingNext: false,
        fixedFlag: "",
      });
    }
  };

  const resetState = () => {
    setRrightState({
      list: [] as MessageItem[],
      cid: "",
      cve: {} as ConversationItem,
      ishistory: false,
      hasPrev: false,
      loadingPrev: false,
      hasNext: false,
      loadingNext: false,
      fixedFlag: "",
    });
  };

  const rightItemDoubleClick = (item: MessageItem) => {
    const selectedLeftIDs = props.data.list.find((left: any) => left.conversationID === rightState.cid)?.messageList.map((message: MessageItem) => message.clientMsgID);
    if (selectedLeftIDs.includes(item.clientMsgID)) {
      getHistoryMsg(item);
    }
  };

  const getHistoryMsg = (message: MessageItem) => {
    const options = {
      userID: "",
      groupID: "",
      count: 20,
      startClientMsgID: message.clientMsgID,
      conversationID: rightState.cid,
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
      setRrightState({
        ...rightState,
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

  const switchContent = (item: MessageItem) => {
    // if (!rightState.ishistory) return parseMessageType(item);
    return <SwitchMsgType audio={audioRef} msg={item} curCve={rightState.cve} isMerge={true} selfID={""} />;
  };

  const onRightScroll = (e: any) => {
    const prevFlag = e.target.scrollHeight - e.target.scrollTop > e.target.scrollHeight - 30 && !rightState.loadingPrev && rightState.hasPrev;
    const nextFlag = e.target.scrollHeight - e.target.scrollTop < e.target.clientHeight + 30 && !rightState.loadingNext && rightState.hasNext;

    if (prevFlag) {
      getPrevMsg();
    } else if (nextFlag) {
      getNextMsg();
    }
  };

  const getPrevMsg = () => {
    rightState.loadingPrev = true;
    const lastList = rightState.list;
    const options = {
      userID: "",
      groupID: "",
      count: 20,
      startClientMsgID: lastList[0].clientMsgID,
      conversationID: rightState.cid,
    };
    im.getHistoryMessageList(options).then((res) => {
      const plist = JSON.parse(res.data);
      const tmpState = {
        ...rightState,
        loadingPrev: false,
        hasPrev: plist.length > 19,
        list: [...plist, ...rightState.list],
      };
      setRrightState(tmpState);
      const lastItem = lastList.find((list) => !TipsType.includes(list.contentType) && list.contentType !== 1516);
      scrollToMsg(lastItem?.clientMsgID ?? "");
    });
  };

  const getNextMsg = () => {
    rightState.loadingNext = true;
    const lastList = rightState.list;
    const options = {
      userID: "",
      groupID: "",
      count: 20,
      startClientMsgID: lastList[lastList.length - 1].clientMsgID,
      conversationID: rightState.cid,
    };
    im.getHistoryMessageListReverse(options).then((res) => {
      const nlist = JSON.parse(res.data);
      const tmpState = {
        ...rightState,
        loadingNext: false,
        hasNext: nlist.length > 19,
        list: [...rightState.list, ...nlist],
      };
      setRrightState(tmpState);
      const lastItem = lastList.reverse().find((list) => !TipsType.includes(list.contentType) && list.contentType !== 1516);
      scrollToMsg(lastItem?.clientMsgID ?? "", true);
    });
  };
  useImperativeHandle(ref, () => ({ clickLeftItem, resetState }));

  const throttleScroll = throttle(500, onRightScroll);

  return (
    <div className="logs_container">
      <div className="container_left">
        <ResultList selected={rightState.cid} resultItemClick={clickLeftItem} {...props} />
      </div>
      <div className="container_right">
        <div id="log_scroll" onScroll={throttleScroll} ref={scrollRef} className="detail_list result_list">
          {rightState.list.map(
            (item, idx) =>
              !TipsType.includes(item.contentType) &&
              item.contentType !== 1516 && (
                <div
                  id={item.clientMsgID}
                  data-time={parseLatestTime(item.sendTime)}
                  key={item.clientMsgID}
                  onDoubleClick={() => rightItemDoubleClick(item)}
                  className="result_item"
                >
                  <MyAvatar nickname={item.senderNickname} src={item.senderFaceUrl} size={36} />
                  <div className="item_info">
                    <div className="title">{item.senderNickname}</div>
                    <div className={`sub_info ${item.contentType === MessageType.CARDMESSAGE ? "sub_card" : ""}`}>{switchContent(item)}</div>
                  </div>
                </div>
              )
          )}
        </div>
      </div>
      <audio ref={audioRef} />
    </div>
  );
};

const LogsResultForWard = memo(forwardRef(LogsResult));
