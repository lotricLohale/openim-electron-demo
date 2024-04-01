import { Button, Image, Layout, message } from "antd";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../store";
import CveList from "./CveList/CveList";
import CveFooter from "./CveFooter/CveFooter";
import HomeSider from "../components/HomeSider";
import HomeHeader from "../components/HomeHeader";
import { createNotification, events, getNotification, im } from "../../../utils";
import ChatContent from "./ChatContent";
import home_bg from "@/assets/images/home_bg.png";
import { GroupTypes, notOssMessageTypes } from "../../../constants/messageContentType";
import { useDrop, useLatest, useReactive, useRequest } from "ahooks";
import { CbEvents } from "../../../utils/open_im_sdk";
import {
  ADD_DROP_TEXT,
  CHECK_USER_ONLINE,
  CVE_CONTENT_RENDER,
  DELETE_MESSAGE,
  IMG_PREVIEW_CLICK,
  INSERT_TO_CURCVE,
  IS_SET_DRAFT,
  MER_MSG_MODAL,
  MSG_UPDATE,
  MUTIL_MSG,
  OPEN_GROUP_MODAL,
  RESET_CVE,
  REVOKE_MSG,
  SEND_DROP_FILE,
  SEND_FORWARD_MSG,
  TO_ASSIGN_CVE,
} from "../../../constants/events";
import { animateScroll } from "react-scroll";
import MerModal from "../components/Modal/MerModal";
import { getGroupInfo, getGroupMemberList } from "../../../store/actions/contacts";
import {
  ConversationItem,
  FriendItem,
  GroupAtType,
  GroupItem,
  MergeElem,
  MergerMsgParams,
  MessageItem,
  MessageStatus,
  MessageType,
  OptType,
  PictureElem,
  SessionType,
  WsResponse,
} from "../../../utils/open_im_sdk/types";
import { useTranslation } from "react-i18next";
import { setCurCve } from "../../../store/actions/cve";
import { isNotify, isShowProgress, updateCommonContacts } from "../../../utils/im";
import { Loading } from "../../../components/Loading";

const { Content } = Layout;

type NMsgMap = {
  oid: string;
  mid: string;
  flag: boolean;
};

const WelcomeContent = () => {
  const { t } = useTranslation();
  const createGroup = () => {
    events.emit(OPEN_GROUP_MODAL, "create");
  };
  return (
    <div className="content_bg">
      <div className="content_bg_title">{t("CreateGroup")}</div>
      <div className="content_bg_sub">{t("CreateGroupTip")}</div>
      <img src={home_bg} alt="" />
      <Button onClick={createGroup} className="content_bg_btn" type="primary">
        {t("CreateNow")}
      </Button>
    </div>
  );
};

type ReactiveState = {
  historyMsgList: MessageItem[];
  typing: boolean;
  hasMore: boolean;
  merModal: boolean;
  merData: (MergeElem & { sender: string }) | undefined;
  searchStatus: boolean;
  searchCve: ConversationItem[];
  toggleCveLoading: boolean;
  lastMinSeq: number;
};

const Home = () => {
  const [isHovering, setIsHovering] = useState(false);
  const selectCveList = (state: RootState) => state.cve.cves;
  const cveList = useSelector(selectCveList, shallowEqual);
  const latestCveList = useLatest(cveList);
  const selectCveLoading = (state: RootState) => state.cve.cveInitLoading;
  const cveLoading = useSelector(selectCveLoading, shallowEqual);
  const selfID = useSelector((state: RootState) => state.user.selfInfo.userID, shallowEqual);
  const curCve = useSelector((state: RootState) => state.cve.curCve, shallowEqual);
  const latestCve = useLatest(curCve);
  const dispatch = useDispatch();
  const rs = useReactive<ReactiveState>({
    historyMsgList: [],
    typing: false,
    hasMore: true,
    merModal: false,
    merData: undefined,
    searchStatus: false,
    searchCve: [],
    toggleCveLoading: false,
    lastMinSeq: 0,
  });
  const timer = useRef<NodeJS.Timeout | null>(null);

  const {
    loading,
    run: getMsgList,
    cancel: msgCancel,
  } = useRequest(im.getAdvancedHistoryMessageList, {
    manual: true,
    onSuccess: handleMsg,
    onError: (err) => {
      console.log("GetChatRecordFailed:", err);

      message.error(t("GetChatRecordFailed"));
    },
  });
  const { t } = useTranslation();
  let nMsgMaps: NMsgMap[] = [];
  const markCveReadTimer = useRef<NodeJS.Timer | null>(null);
  const maxRenderList = 200;

  useDrop(document.getElementById("cve_drop_container"), {
    onText: (text, e) => {
      if (!isHovering) return;
      events.emit(ADD_DROP_TEXT, text);
      setIsHovering(false);
    },
    onFiles: (files, e) => {
      if (!isHovering) return;
      events.emit(SEND_DROP_FILE, files);
      setIsHovering(false);
    },
    onDragEnter: () => setIsHovering(true),
    onDragLeave: () => setIsHovering(false),
  });

  useEffect(() => {
    getNotification();
    return () => {
      resetCve();
    };
  }, []);

  useEffect(() => {
    im.on(CbEvents.ONRECVMESSAGEREVOKED, revokeMsgHandler);
    im.on(CbEvents.ONNEWRECVMESSAGEREVOKED, newRevokeMsgHandler);
    im.on(CbEvents.ONRECVC2CREADRECEIPT, c2cMsgHandler);
    im.on(CbEvents.ONPROGRESS, onProgressHandler);
    return () => {
      im.off(CbEvents.ONRECVMESSAGEREVOKED, revokeMsgHandler);
      im.off(CbEvents.ONNEWRECVMESSAGEREVOKED, newRevokeMsgHandler);
      im.off(CbEvents.ONRECVC2CREADRECEIPT, c2cMsgHandler);
      im.off(CbEvents.ONPROGRESS, onProgressHandler);
    };
  }, []);

  useEffect(() => {
    events.on(RESET_CVE, resetCve);
    events.on(DELETE_MESSAGE, deleteMsg);
    events.on(REVOKE_MSG, revokeMyMsgHandler);
    events.on(MER_MSG_MODAL, merModalHandler);
    events.on(INSERT_TO_CURCVE, insertMsgHandler);
    events.on(MSG_UPDATE, msgUpdateHandler);
    window.electron && window.electron.addIpcRendererListener("DownloadFinish", downloadFinishHandler, "downloadListener");
    window.electron && window.electron.addIpcRendererListener("DownloadUpdated", downloadUpdatedHandler, "DownloadUpdatedListener");
    return () => {
      events.off(RESET_CVE, resetCve);
      events.off(DELETE_MESSAGE, deleteMsg);
      events.off(REVOKE_MSG, revokeMyMsgHandler);
      events.off(MER_MSG_MODAL, merModalHandler);
      events.off(INSERT_TO_CURCVE, insertMsgHandler);
      events.off(MSG_UPDATE, msgUpdateHandler);
      window.electron && window.electron.removeIpcRendererListener("downloadListener");
      window.electron && window.electron.removeIpcRendererListener("DownloadUpdatedListener");
    };
  }, []);

  useEffect(() => {
    events.on(SEND_FORWARD_MSG, sendForwardHandler);
    events.on(TO_ASSIGN_CVE, assignHandler);
    im.on(CbEvents.ONRECVNEWMESSAGE, newMsgHandler);
    im.on(CbEvents.ONRECVNEWMESSAGES, newMsgsHandler);
    im.on(CbEvents.ONRECVNEWMESSAGEFROMOTHERWEB, otherWebMsgsHandler);
    im.on(CbEvents.ONRECVGROUPREADRECEIPT, groupMsgHandler);
    return () => {
      events.off(SEND_FORWARD_MSG, sendForwardHandler);
      events.off(TO_ASSIGN_CVE, assignHandler);
      im.off(CbEvents.ONRECVNEWMESSAGE, newMsgHandler);
      im.off(CbEvents.ONRECVNEWMESSAGES, newMsgsHandler);
      im.off(CbEvents.ONRECVNEWMESSAGEFROMOTHERWEB, otherWebMsgsHandler);
      im.off(CbEvents.ONRECVGROUPREADRECEIPT, groupMsgHandler);
    };
  }, [curCve.conversationID]);

  //  event hander

  const msgUpdateHandler = (msg: MessageItem, status?: MessageStatus) => {
    const idx = rs.historyMsgList.findIndex((m) => m.clientMsgID === msg.clientMsgID);
    if (idx > -1) {
      status ? (rs.historyMsgList[idx].status = status) : (rs.historyMsgList[idx] = { ...msg });
      msgForceRender(msg.clientMsgID);
    }
  };

  const merModalHandler = (el: MergeElem, sender: string) => {
    rs.merData = { ...el, sender };
    rs.merModal = true;
  };

  const assignHandler = (id: string, type: SessionType) => {
    getOneCve(id, type)
      .then((cve) => clickItem(cve))
      .catch((err) => message.error(t("GetCveFailed")));
  };

  const groupMsgHandler = (data: any) => {
    const val = JSON.parse(data.data);
    val.forEach((obj: any) => {
      if (obj.groupID === latestCve.current?.groupID) {
        rs.historyMsgList.find((item) => {
          if (item.clientMsgID === obj.msgIDList[0]) {
            if (item.attachedInfoElem.groupHasReadInfo.hasReadUserIDList === null) {
              item.attachedInfoElem.groupHasReadInfo.hasReadUserIDList = [];
            }
            item.isRead = true;
            item.attachedInfoElem.groupHasReadInfo.hasReadCount += 1;
            item.attachedInfoElem.groupHasReadInfo.hasReadUserIDList = [...(item.attachedInfoElem.groupHasReadInfo.hasReadUserIDList ?? []), obj.userID];
            msgForceRender(item.clientMsgID);
            return;
          }
        });
      }
    });
  };

  const sendForwardHandler = (options: string | MergerMsgParams, type: MessageType | "card_share", list: any[]) => {
    list.map(async (s, idx) => {
      const uid = (s as FriendItem).userID ?? "";
      const gid = (s as GroupItem).groupID ?? "";
      let data;
      if (type === "card_share") {
        data = await im.createCardMessage(options as string);
      } else {
        switch (type) {
          case MessageType.MERGERMESSAGE:
            data = await im.createMergerMessage(options as MergerMsgParams);
            break;
          case MessageType.CUSTOMMESSAGE:
            data = await im.createCustomMessage({
              data: options as string,
              extension: "",
              description: "",
            });
            break;
          default:
            data = await im.createForwardMessage(options as string);
        }
      }

      sendMsg(data.data, type as MessageType, uid, gid, idx === list.length - 1);
      if (type === MessageType.MERGERMESSAGE && idx === list.length - 1) {
        events.emit(MUTIL_MSG, false);
      }
    });
  };

  const insertMsgHandler = (message: MessageItem) => {
    rs.historyMsgList = [message, ...rs.historyMsgList];
  };

  //  im hander
  const newMsgHandler = async (data: WsResponse) => {
    const newServerMsg: MessageItem = JSON.parse(data.data);
    handleNewMsg(newServerMsg);
  };

  const newMsgsHandler = (data: WsResponse) => {
    const newServerMsgs: MessageItem[] = JSON.parse(data.data);
    console.log(newServerMsgs);
    newServerMsgs.forEach(handleNewMsg);
  };

  const otherWebMsgsHandler = ({ data }: WsResponse) => {
    const newMessage = JSON.parse(data);
    if (inCurCve(newMessage)) {
      msgLimitPush(newMessage, 0);
    }
  };

  const handleNewMsg = async (newServerMsg: MessageItem) => {
    if (!isEmptyCve) {
      if (inCurCve(newServerMsg)) {
        events.emit(CHECK_USER_ONLINE);
        if (newServerMsg.contentType === MessageType.TYPINGMESSAGE) {
          typingUpdate();
        } else {
          if (newServerMsg.contentType === MessageType.REVOKEMESSAGE) {
            const nomaList = rs.historyMsgList.filter((ms) => ms.clientMsgID !== newServerMsg.content);
            rs.historyMsgList = [newServerMsg, ...nomaList];
          } else {
            msgLimitPush(newServerMsg, 0);
          }
          if (markCveReadTimer.current) clearTimeout(markCveReadTimer.current);
          markCveReadTimer.current = setTimeout(() => markCveHasRead(latestCve.current, 1), 2000);
        }
      }
    }
  };

  const msgLimitPush = (newMsg: MessageItem, duration = 350) => {
    const sliceFlag = rs.historyMsgList.length > maxRenderList;
    sliceFlag && scrollTo(true, duration);
    rs.historyMsgList = [newMsg, ...(sliceFlag ? rs.historyMsgList.slice(0, maxRenderList - 1) : rs.historyMsgList)];
  };

  const revokeMsgHandler = (data: WsResponse) => {
    // const idx = rs.historyMsgList.findIndex((m) => m.clientMsgID === data.data);
    // if (idx > -1) {
    //   rs.historyMsgList.splice(idx, 1);
    // }
  };

  const newRevokeMsgHandler = ({ data }: WsResponse) => {
    const revokeContent = JSON.parse(data);
    const idx = rs.historyMsgList.findIndex((m) => m.clientMsgID === revokeContent.clientMsgID);
    if (idx > -1) {
      rs.historyMsgList[idx].contentType = MessageType.ADVANCEREVOKEMESSAGE;
      rs.historyMsgList[idx].content = data;
      msgForceRender(rs.historyMsgList[idx].clientMsgID);
    }
  };

  const c2cMsgHandler = (data: WsResponse) => {
    JSON.parse(data.data).map((cr: any) => {
      cr.msgIDList.map((crt: string) => {
        rs.historyMsgList.find((hism) => {
          if (hism.clientMsgID === crt) {
            hism.isRead = true;
            msgForceRender(hism.clientMsgID);
            return;
          }
        });
      });
    });
  };

  const onProgressHandler = (data: WsResponse) => {
    const parseData = JSON.parse(data.data);
    console.log(parseData);
    const idx = rs.historyMsgList.findIndex((his) => his.clientMsgID === parseData.clientMsgID);
    if (idx !== -1 && isShowProgress(rs.historyMsgList[idx].contentType)) {
      rs.historyMsgList[idx].progress = parseData.progress > 100 ? 100 : parseData.progress;
      msgForceRender(rs.historyMsgList[idx].clientMsgID);
    }
  };

  //  ipc hander
  const downloadFinishHandler = (ev: any, state: "completed" | "cancelled" | "interrupted", msgID: string, path: string, isNotify: boolean) => {
    if (isNotify) {
      switch (state) {
        case "completed":
          const IMFileMap = JSON.parse(localStorage.getItem("IMFileMap") ?? "{}");
          IMFileMap[msgID] = {
            path,
            status: state,
          };
          localStorage.setItem("IMFileMap", JSON.stringify(IMFileMap));
          message.success("下载成功！");
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
    if (isNotify) {
      const idx = rs.historyMsgList.findIndex((his) => his.clientMsgID === msgID);
      if (idx !== -1 && isShowProgress(rs.historyMsgList[idx].contentType)) {
        rs.historyMsgList[idx].downloadProgress = progress;
        msgForceRender(rs.historyMsgList[idx].clientMsgID);
      }
    }
  };

  const inCurCve = (newServerMsg: MessageItem): boolean => {
    switch (newServerMsg.sessionType) {
      case SessionType.Single:
        return newServerMsg.sendID === latestCve.current?.userID || (newServerMsg.sendID === selfID && newServerMsg.recvID === latestCve.current?.userID);
      case SessionType.Group:
      case SessionType.SuperGroup:
        return newServerMsg.groupID === latestCve.current?.groupID;
      case SessionType.Notification:
        return newServerMsg.sendID === latestCve.current?.userID;
      default:
        return false;
    }
  };

  const resetCve = () => {
    dispatch(setCurCve({} as ConversationItem));
  };

  const deleteMsg = (mid: string, isCid?: boolean, isNotify = true) => {
    if (isCid) {
      rs.historyMsgList = [];
    } else {
      const idx = rs.historyMsgList.findIndex((h) => h.clientMsgID === mid);
      let tmpList = [...rs.historyMsgList];
      tmpList.splice(idx, 1);
      rs.historyMsgList = tmpList;
    }
    isNotify && message.success(t("DeleteMessageSuc"));
  };

  const revokeMyMsgHandler = (mid: string) => {
    const idx = rs.historyMsgList.findIndex((h) => h.clientMsgID === mid);
    rs.historyMsgList[idx].contentType = MessageType.REVOKEMESSAGE;
    msgForceRender(rs.historyMsgList[idx].clientMsgID);
  };

  const typingUpdate = () => {
    rs.typing = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      rs.typing = false;
    }, 1000);
  };

  const clickItem = useCallback((cve: ConversationItem) => {
    if (cve.conversationID === latestCve.current?.conversationID) return;

    if (!isEmptyCve) {
      events.emit(IS_SET_DRAFT, latestCve.current);
    }
    rs.toggleCveLoading = true;
    rs.historyMsgList = [];
    console.log(cve);

    dispatch(setCurCve(cve));
    rs.hasMore = true;
    getInfo(cve);
    msgCancel();
    const initMinSeq = cve.conversationType === SessionType.SuperGroup ? 0 : undefined;
    getHistoryMsg(cve.userID, cve.groupID, undefined, cve.conversationID, initMinSeq);
    markCveHasRead(cve);
    events.emit(IMG_PREVIEW_CLICK, "", true);
  }, []);

  const getInfo = (cve: ConversationItem) => {
    if (GroupTypes.includes(cve.conversationType)) {
      dispatch(getGroupInfo(cve.groupID));
      const options = {
        groupID: cve.groupID,
        offset: 0,
        filter: 0,
        count: 50,
      };
      dispatch(getGroupMemberList(options));
    }
  };

  const markCveHasRead = (cve: ConversationItem, type?: number) => {
    const nomalTypes = [GroupAtType.AtAll, GroupAtType.AtAllAtMe, GroupAtType.AtMe];
    if (nomalTypes.includes(cve.groupAtType)) {
      im.resetConversationGroupAtType(cve.conversationID);
    }
    if (cve.unreadCount === 0 && !type) return;
    markCveHasReadByCid(cve.conversationID);
  };

  const getOneCve = (sourceID: string, sessionType: number): Promise<ConversationItem> => {
    return new Promise((resolve, reject) => {
      im.getOneConversation({ sourceID, sessionType })
        .then((res) => resolve(JSON.parse(res.data)))
        .catch((err) => reject(err));
    });
  };

  const markCveHasReadByCid = (cid: string) => {
    im.markMessageAsReadByConID({ conversationID: cid, msgIDList: [] });
  };

  const getHistoryMsg = useCallback((uid?: string, gid?: string, sMsg?: MessageItem, cveID?: string, lastMinSeq = 0) => {
    const config = {
      userID: uid ?? "",
      groupID: gid ?? "",
      count: 20,
      startClientMsgID: sMsg?.clientMsgID ?? "",
      conversationID: cveID ?? "",
      lastMinSeq,
    };
    getMsgList(config);
  }, []);

  function handleMsg({ data }: WsResponse) {
    rs.toggleCveLoading = false;
    const historyData = JSON.parse(data);
    const messages = historyData.messageList;
    rs.historyMsgList = [...rs.historyMsgList, ...[...messages].reverse()];
    rs.hasMore = !historyData.isEnd && messages.length === 20;
    console.log(rs.historyMsgList);
    if (rs.historyMsgList.length > 0) {
      // @ts-ignore
      rs.lastMinSeq = rs.historyMsgList.at(-1)!.seq;
    }
    rs.toggleCveLoading = false;
  }

  const uuid = () => {
    return (Math.random() * 36).toString(36).slice(2) + new Date().getTime().toString();
  };

  const scrollTo = (isreverse = true, duration = 350) => {
    const options = {
      duration: duration,
      smooth: true,
      containerId: "scr_container",
    };
    if (!isreverse) {
      animateScroll.scrollToBottom(options);
    } else {
      animateScroll.scrollToTop(options);
    }
  };

  const sendMsg = useCallback(
    async (nMsg: string, type: MessageType, uid?: string, gid?: string, showNotification = false, fileArrayBuffer?: ArrayBuffer, snpFileArrayBuffer?: ArrayBuffer) => {
      const operationID = uuid();
      if ((uid && latestCve.current.userID === uid) || (gid && latestCve.current.groupID === gid) || (!uid && !gid)) {
        const parsedMsg = JSON.parse(nMsg);
        const tMsgMap = {
          oid: operationID,
          mid: parsedMsg.clientMsgID,
          flag: false,
        };
        nMsgMaps = [...nMsgMaps, tMsgMap];
        if (!isShowProgress(parsedMsg.contentType)) parsedMsg.status = 2;
        msgLimitPush(parsedMsg);
        setTimeout(() => {
          const item = nMsgMaps.find((n) => n.mid === parsedMsg.clientMsgID);
          if (item && !item.flag) {
            rs.historyMsgList.find((h, idx) => {
              if (h.clientMsgID === item.mid) {
                // h.status = 1;
                rs.historyMsgList[idx].status = 1;
                msgForceRender(h.clientMsgID);
                return h;
              }
            });
          }
        }, 2000);
        scrollTo();
      }
      const offlinePushInfo = {
        title: "你有一条新消息",
        desc: "你有一条新消息",
        ex: "",
        iOSPushSound: "+1",
        iOSBadgeCount: true,
      };
      const sendOption = {
        recvID: uid ?? latestCve.current.userID,
        groupID: gid ?? latestCve.current.groupID,
        offlinePushInfo,
        message: nMsg,
        fileArrayBuffer,
        snpFileArrayBuffer,
      };
      nMsgMaps = nMsgMaps.filter((f) => !f.flag);
      if (notOssMessageTypes.includes(type)) {
        console.log(sendOption);

        im.sendMessageByBuffer(sendOption, operationID)
          .then((res) => sendMsgCB(res, type, showNotification))
          .catch((err) => sendMsgCB(err, type, showNotification, true));
      } else {
        im.sendMessage(sendOption, operationID)
          .then((res) => {
            console.log(res);
            sendMsgCB(res, type, showNotification);
          })
          .catch((err) => {
            console.log(err);
            sendMsgCB(err, type, showNotification, true);
          });
      }
      updateCommonContacts({
        sourceID: latestCve.current.userID,
        userID: latestCve.current.userID,
        faceURL: latestCve.current.faceURL,
        nickname: latestCve.current.showName,
        owenerID: selfID,
      });
    },
    [rs.historyMsgList, curCve.conversationID]
  );

  const sendMsgCB = (res: WsResponse, type: MessageType, showNotification: boolean, err?: boolean) => {
    const parseData = err ? "" : JSON.parse(res.data);
    nMsgMaps.map((tn) => {
      if (tn.oid === res.operationID) {
        const idx = rs.historyMsgList.findIndex((his) => his.clientMsgID === tn?.mid);
        if (idx !== -1) {
          tn.flag = true;
          if (err) {
            rs.historyMsgList[idx].status = 3;
            try {
              rs.historyMsgList[idx].errCode = res.errCode;
            } catch (error) {
              console.log(error);
            }
          } else {
            rs.historyMsgList[idx] = { ...parseData };
          }
          msgForceRender(rs.historyMsgList[idx].clientMsgID);
        }
      }
    });
    if (showNotification && !err) {
      if (type === MessageType.CUSTOMMESSAGE) {
        message.success("邀请成功！");
        return;
      }
      message.success(t("ForwardSuccessTip"));
    }
  };

  const closeMer = () => {
    rs.merModal = false;
  };

  const msgForceRender = (cid: string) => {
    events.emit(CVE_CONTENT_RENDER, cid);
  };

  const isEmptyCve = useMemo(() => JSON.stringify(curCve) === "{}", [curCve.conversationID]);

  const isNomalCve = useMemo(() => !isEmptyCve && !isNotify(curCve!.conversationType), [curCve.conversationID]);

  return (
    <>
      <HomeSider>
        <CveList curCve={curCve} loading={cveLoading} cveList={rs.searchStatus ? rs.searchCve : cveList} clickItem={clickItem} />
      </HomeSider>
      <Layout id="cve_drop_container">
        {!isEmptyCve && <HomeHeader typing={rs.typing} curCve={curCve} type="chat" />}

        <Content className={`total_content`}>
          {!isEmptyCve ? (
            !rs.toggleCveLoading ? (
              <ChatContent
                lastMinSeq={rs.lastMinSeq}
                loadMore={getHistoryMsg}
                loading={loading}
                msgList={rs.historyMsgList}
                // msgList={[...rs.historyMsgList].reverse()}
                hasMore={rs.hasMore}
                curCve={curCve}
              />
            ) : (
              <Loading />
            )
          ) : (
            <WelcomeContent />
          )}
          <ImageGroup />
          {rs.merModal && <MerModal visible={rs.merModal} close={closeMer} curCve={curCve!} info={rs.merData!} />}
        </Content>
        {isNomalCve && <CveFooter curCve={curCve} sendMsg={sendMsg} />}
        {isHovering && (
          <div className="drop_mask">
            <div className="drop_desc">拖动到这里发送给 {curCve.showName}</div>
          </div>
        )}
      </Layout>
    </>
  );
};

export default memo(Home);

const ImageGroup = memo(() => {
  const [visible, setVisible] = useState(false);
  const [imgGroup, setImgGroup] = useState<Array<string>>([]);
  const latestImgGroup = useLatest(imgGroup);
  const [curIdx, setCurIdx] = useState(0);

  useEffect(() => {
    events.on(IMG_PREVIEW_CLICK, imgClickHandler);
    return () => {
      events.off(IMG_PREVIEW_CLICK, imgClickHandler);
    };
  }, []);

  const imgClickHandler = (el: PictureElem, isReset = false) => {
    if (isReset) {
      setImgGroup([]);
      return;
    }
    const url = el.sourcePicture.url;
    const idx = latestImgGroup.current.findIndex((t) => t === url);

    if (idx > -1) {
      setCurIdx(idx);
    } else {
      const tmpArr = [...latestImgGroup.current, url];
      setImgGroup(tmpArr);
      setCurIdx(tmpArr.length - 1);
    }
    setVisible(true);
  };

  return (
    <div style={{ display: "none" }}>
      <Image.PreviewGroup
        preview={{
          visible,
          onVisibleChange: (vis) => setVisible(vis),
          current: curIdx,
        }}
      >
        {latestImgGroup.current.map((img) => (
          <Image key={img} src={img} />
        ))}
      </Image.PreviewGroup>
    </div>
  );
});
