import { BrowserRouter, HashRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useLatest } from "ahooks";
import Mylayout from "../layout/MyLayout";
import Login from "../pages/login/Login";
import Home from "../pages/home/Cve/cve";
import Contacts from "../pages/home/Contact/contacts";
import Profile from "../pages/home/Profile/Profile";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useSelector, shallowEqual, useDispatch } from "react-redux";
import { RootState } from "../store";
import { events, im } from "../utils";
import { getIMApiUrl, getIMWsUrl } from "../config";
import { getCveList, setCurCve, setCveList } from "../store/actions/cve";
import {
  getBlackList,
  getRecvFriendApplicationList,
  getFriendList,
  getRecvGroupApplicationList,
  getGroupList,
  getUnReadCount,
  setUnReadCount,
  getSentFriendApplicationList,
  getSentGroupApplicationList,
  setSentGroupApplicationList,
  setSentFriendApplicationList,
  setRecvFriendApplicationList,
  setRecvGroupApplicationList,
  setFriendList,
  setBlackList,
  setGroupList,
  setGroupMemberList,
  setGroupInfo,
  getGroupMemberList,
  getOrganizationInfo,
} from "../store/actions/contacts";
import { getSelfInfo, setSelfInfo, setFullState, getAppGlobalConfig } from "../store/actions/user";
import { CbEvents, uuid } from "../utils/open_im_sdk";
import {
  AllowType,
  ConversationItem,
  FriendApplicationItem,
  GroupApplicationItem,
  GroupMemberItem,
  MessageItem,
  MessageType,
  OptType,
  RtcInvite,
  SessionType,
  WsResponse,
} from "../utils/open_im_sdk/types";
import {
  CUR_GROUPMEMBER_CHANGED,
  GROUP_INFO_UPDATED,
  OPEN_SINGLE_MODAL,
  SHOW_GOLBAL_SEARCH_MODAL,
  SHOW_PLAYER_MODAL,
  SIGNAL_INGINVITE,
  TO_ASSIGN_CVE,
  UPDATE_GLOBAL_LOADING,
} from "../constants/events";
import { cveSort } from "../utils";
import RtcModal, { RtcModalProps } from "../pages/home/Rtc/RtcModal";
import GolbalLoadingModal from "../pages/home/components/Modal/GolbalLoadingModal";
import GolbalSearchModal from "../pages/home/components/Modal/GolbalSearchModal";
import PlayVideoModal from "../pages/home/components/Modal/PlayVideoModal";
import { createNotification, getNotification, initEmoji } from "../utils/im";
import { CardType } from "../pages/home/components/UserCard";
import { message } from "antd";

// @ts-ignore
import ring from "../assets/newMsg.mp3";
import { throttle } from "throttle-debounce";

type GruopHandlerType = "added" | "deleted" | "info" | "memberAdded" | "memberDeleted" | "memberInfo";

const Auth = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [golbalLoading, setGolbalLoading] = useState(false);
  const [golbalSearch, setGolbalSearch] = useState(false);
  const [showPlayer, setShowPlayer] = useState({
    state: false,
    url: "",
  });
  const cves = useSelector((state: RootState) => state.cve.cves, shallowEqual);
  const latestCves = useLatest(cves);
  const selfInfo = useSelector((state: RootState) => state.user.selfInfo, shallowEqual);
  const sentGroupApplicationList = useSelector((state: RootState) => state.contacts.sentGroupApplicationList, shallowEqual);
  const latestSentGroupApplicationList = useLatest(sentGroupApplicationList);
  const recvGroupApplicationList = useSelector((state: RootState) => state.contacts.recvGroupApplicationList, shallowEqual);
  const latestRecvGroupApplicationList = useLatest(recvGroupApplicationList);
  const sentFriendApplicationList = useSelector((state: RootState) => state.contacts.sentFriendApplicationList, shallowEqual);
  const latestSentFriendApplicationList = useLatest(sentFriendApplicationList);
  const recvFriendApplicationList = useSelector((state: RootState) => state.contacts.recvFriendApplicationList, shallowEqual);
  const latestRecvFriendApplicationList = useLatest(recvFriendApplicationList);
  const friendList = useSelector((state: RootState) => state.contacts.friendList, shallowEqual);
  const latestFriendList = useLatest(friendList);
  const blackList = useSelector((state: RootState) => state.contacts.blackList, shallowEqual);
  const latestBlackList = useLatest(blackList);
  const groupList = useSelector((state: RootState) => state.contacts.groupList, shallowEqual);
  const latestGroupList = useLatest(groupList);
  const curCve = useSelector((state: RootState) => state.cve.curCve, shallowEqual);
  const latestCve = useLatest(curCve);
  const groupMemberList = useSelector((state: RootState) => state.contacts.groupMemberList, shallowEqual);
  const latestGroupMemberList = useLatest(groupMemberList);
  const [rtcConfig, setRtcConfig] = useState<Omit<RtcModalProps, "myClose">>({
    visible: false,
    isVideo: false,
    isSingle: false,
    isCalled: false,
    invitation: {} as RtcInvite,
  });
  const userID = window.electron?.getStoreKey("IMUserID") ?? localStorage.getItem("IMuserID")!;
  const token = window.electron?.getStoreKey("IMProfile") ?? localStorage.getItem(`improfile-${userID ?? selfInfo.userID}`)!;

  const wsState = useRef<any>(null);
  const syncState = useRef<any>(null);
  const kickFlag = useRef(false);
  const messageNotifitionRef = useRef<HTMLAudioElement>(null);
  const tmpCves = useRef<ConversationItem[]>([]);

  useEffect(() => {
    window.electron?.addIpcRendererListener("MainWinSizeChange", () => dispatch(setFullState(uuid("window"))), "mainWinSizeChange");
    window.electron?.addIpcRendererListener("WakeUp", () => im.wakeUp(), "wakeUp");
    events.on(UPDATE_GLOBAL_LOADING, updateLoadingHandler);
    return () => {
      window.electron?.removeIpcRendererListener("mainWinSizeChange");
      window.electron?.removeIpcRendererListener("wakeUp");
      events.off(UPDATE_GLOBAL_LOADING, updateLoadingHandler);
    };
  }, []);

  // global click event
  useEffect(() => {
    window.userClick = async (id: string, groupID?: string, allowFriend?: AllowType) => {
      if (id === "AtAllTag" || !id) {
        return;
      }

      let member;
      if (groupID) {
        const { data } = await im.getGroupMembersInfo({ groupID: groupID, userIDList: [id] });
        member = JSON.parse(data)[0];
        console.log(member);
      }

      if (id === selfInfo.userID) {
        const cardData = { self: selfInfo, groupMemberItem: { ...member, allowFriend } };
        events.emit(OPEN_SINGLE_MODAL, cardData, CardType.SelfInfo);
        return;
      }

      if (id.indexOf("-") > -1) {
        id = id.replace("-", ".");
      }
      const { data } = await im.getUsersInfo([id]);
      const isFriend = JSON.parse(data)[0]?.friendInfo;
      const cardData: any = isFriend ? { friend: isFriend } : { public: JSON.parse(data)[0]?.publicInfo };
      cardData.groupMemberItem = { ...member, allowFriend };
      const cardType = isFriend ? CardType.FriendInfo : CardType.UserInfo;
      events.emit(OPEN_SINGLE_MODAL, cardData, cardType);
    };
    window.urlClick = (url: string) => {
      if (url.indexOf("http") === -1 && url.indexOf("https") === -1) {
        url = `http://${url}`;
      }
      if (window.electron) {
        window.electron.openExternal(url);
      } else {
        window.open(url, "_blank");
      }
    };
  }, [selfInfo]);

  // try login with token
  useEffect(() => {
    if (token && userID) {
      setGolbalLoading(true);
      // syncMessageStartHandler();
      im.getLoginStatus()
        .then(({ data }) => {
          if (data === 101) {
            setGolbalLoading(false);
          } else {
            imLogin();
          }
        })
        .catch((err) => imLogin());
      // .finally(() => localStorage.removeItem("IMuserID"));
    } else {
      invalid();
    }
  }, []);

  const totalUnreadHander = (data: any) => {
    dispatch(setUnReadCount(Number(data.data)));
  };

  const wsConnectingHandler = () => {
    if (!kickFlag.current) {
      wsState.current?.();
      wsState.current = message.loading("连接中...", 0);
    }
  };

  const wsConnectsuccessHandler = () => {
    if (wsState.current) {
      wsState.current();
      wsState.current = null;
    }
  };

  const kickoffHandler = () => {
    if (kickFlag.current) return;
    kickFlag.current = true;
    forceLogout();
  };

  const expiredHandler = () => {
    forceLogout(false);
  };

  const forceLogout = async (isKick = true) => {
    im.logout();
    message.warning(isKick ? "你的账号在其他设备上登录，请重新登录！" : "登录已过期，请重新登录！");
    setTimeout(() => {
      window.electron?.removeStoreKey("IMUserID");
      window.electron?.removeStoreKey("IMProfile");
      localStorage.removeItem(`improfile-${selfInfo.userID}`);
      navigate("/login");
    }, 500);
  };

  const showPlayerModal = (url: string) => {
    setShowPlayer({ state: true, url });
  };

  const closePlay = () => {
    setShowPlayer({ state: false, url: "" });
  };

  const showGolbalSearch = () => setGolbalSearch(true);

  const updateLoadingHandler = (flag: boolean) => setGolbalLoading(flag);

  useEffect(() => {
    im.on(CbEvents.ONTOTALUNREADMESSAGECOUNTCHANGED, totalUnreadHander);
    im.on(CbEvents.ONWSCONNECTING, wsConnectingHandler);
    im.on(CbEvents.ONCONNECTING, wsConnectingHandler);
    im.on(CbEvents.ONWSCONNECTSUCCESS, wsConnectsuccessHandler);
    im.on(CbEvents.ONCONNECTSUCCESS, wsConnectsuccessHandler);
    im.on(CbEvents.ONKICKEDOFFLINE, kickoffHandler);
    im.on(CbEvents.ONUSERTOKENEXPIRED, expiredHandler);
    events.on(SHOW_PLAYER_MODAL, showPlayerModal);
    events.on(SHOW_GOLBAL_SEARCH_MODAL, showGolbalSearch);
    window.ononline = wsConnectsuccessHandler;
    window.onoffline = wsConnectingHandler;
    getNotification();
    return () => {
      im.off(CbEvents.ONTOTALUNREADMESSAGECOUNTCHANGED, totalUnreadHander);
      im.off(CbEvents.ONWSCONNECTING, wsConnectingHandler);
      im.off(CbEvents.ONCONNECTING, wsConnectingHandler);
      im.off(CbEvents.ONWSCONNECTSUCCESS, wsConnectsuccessHandler);
      im.off(CbEvents.ONCONNECTSUCCESS, wsConnectsuccessHandler);
      im.off(CbEvents.ONKICKEDOFFLINE, kickoffHandler);
      im.off(CbEvents.ONUSERTOKENEXPIRED, expiredHandler);
      events.off(SHOW_PLAYER_MODAL, showPlayerModal);
      events.off(SHOW_GOLBAL_SEARCH_MODAL, showGolbalSearch);
      wsConnectsuccessHandler();
    };
  }, [selfInfo.userID]);

  // self update
  const selfUpdateHandler = ({ data }: any) => {
    const updatedInfo = JSON.parse(data);
    delete updatedInfo.birth;
    dispatch(setSelfInfo({ ...selfInfo, ...updatedInfo }));
  };

  useEffect(() => {
    im.on(CbEvents.ONSELFINFOUPDATED, selfUpdateHandler);
    return () => {
      im.off(CbEvents.ONSELFINFOUPDATED, selfUpdateHandler);
    };
  }, [selfInfo]);

  // messsage notifications
  const newMsgsHandler = ({ data }: WsResponse) => {
    if (syncState.current) {
      return;
    }

    const newServerMsgs: MessageItem[] = JSON.parse(data);
    newServerMsgs.forEach(handleNewMsg);
  };

  const handleNewMsg = async (newServerMsg: MessageItem) => {
    if (newServerMsg.contentType !== MessageType.TYPINGMESSAGE && newServerMsg.sendID !== selfInfo.userID) {
      let cveItem = [...latestCves.current, ...tmpCves.current].find((cve) =>
        newServerMsg.sessionType === SessionType.Single ? newServerMsg.sendID === cve.userID : newServerMsg.groupID === cve.groupID
      );

      if (!cveItem) {
        const tmpCveStr = (
          await im.getOneConversation({
            sessionType: newServerMsg.sessionType,
            sourceID: newServerMsg.sessionType === SessionType.Single ? newServerMsg.sendID : newServerMsg.groupID,
          })
        ).data;
        cveItem = JSON.parse(tmpCveStr);
        tmpCves.current = [...tmpCves.current, cveItem!];
      }
      if (cveItem && cveItem?.recvMsgOpt === OptType.Nomal) {
        throttleRemind(newServerMsg);
      }
    }
  };

  const throttleRemind = throttle(500, (newServerMsg) => {
    createNotification(newServerMsg, (id, sessionType) => {
      window.electron ? window.electron.focusHomePage() : window.focus();
      navigate("/");
      setTimeout(() => {
        events.emit(TO_ASSIGN_CVE, id, sessionType);
      });
    });
    if (messageNotifitionRef.current && selfInfo.allowBeep === 1) {
      messageNotifitionRef.current.src = ring;
      messageNotifitionRef.current.play().catch((err) => {});
    }
  });

  const syncMessageStartHandler = () => {
    syncMessageFinishHandler();
    syncState.current = message.loading("同步中", 0);
  };

  const syncMessageFinishHandler = () => {
    syncState.current?.();
    syncState.current = null;
  };

  useEffect(() => {
    im.on(CbEvents.ONSYNCSERVERSTART, syncMessageStartHandler);
    im.on(CbEvents.ONSYNCSERVERFAILED, syncMessageFinishHandler);
    im.on(CbEvents.ONSYNCSERVERFINISH, syncMessageFinishHandler);
    return () => {
      im.off(CbEvents.ONSYNCSERVERSTART, syncMessageStartHandler);
      im.off(CbEvents.ONSYNCSERVERFAILED, syncMessageFinishHandler);
      im.off(CbEvents.ONSYNCSERVERFINISH, syncMessageFinishHandler);
      syncMessageFinishHandler();
    };
  }, []);

  useEffect(() => {
    im.on(CbEvents.ONRECVNEWMESSAGES, newMsgsHandler);
    return () => {
      im.off(CbEvents.ONRECVNEWMESSAGES, newMsgsHandler);
    };
  }, [selfInfo.allowBeep, selfInfo.userID, curCve.conversationID]);

  // cve update
  const conversationChnageHandler = (data: WsResponse) => {
    let tmpCves = latestCves.current;
    let filterArr: ConversationItem[] = [];
    const changes: ConversationItem[] = JSON.parse(data.data);
    const chids = changes.map((ch) => ch.conversationID);
    filterArr = tmpCves.filter((tc) => !chids.includes(tc.conversationID));
    const idx = changes.findIndex((c) => c.conversationID === latestCve.current?.conversationID);
    if (idx !== -1) dispatch(setCurCve(changes[idx]));
    const result = [...changes, ...filterArr];
    dispatch(setCveList(cveSort(result)));
  };

  const newConversationHandler = (data: WsResponse) => {
    let tmpCves = latestCves.current;
    const news: ConversationItem[] = JSON.parse(data.data);
    const result = [...news, ...tmpCves];
    dispatch(setCveList(cveSort(result)));
  };

  useEffect(() => {
    im.on(CbEvents.ONCONVERSATIONCHANGED, conversationChnageHandler);
    im.on(CbEvents.ONNEWCONVERSATION, newConversationHandler);
    return () => {
      im.off(CbEvents.ONCONVERSATIONCHANGED, conversationChnageHandler);
      im.off(CbEvents.ONNEWCONVERSATION, newConversationHandler);
    };
  }, []);

  // friend update
  const friendHandlerTemplate = (data: WsResponse, type: "info" | "added" | "deleted") => {
    const user = JSON.parse(data.data);
    const tmpArr = [...latestFriendList.current];
    if (type === "info") {
      const idx = tmpArr.findIndex((f) => f.userID === user.userID);
      if (idx !== -1) tmpArr[idx] = user;
    } else if (type === "added") {
      tmpArr.push(user);
    } else {
      const idx = tmpArr.findIndex((f) => f.userID === user.userID);
      if (idx !== -1) tmpArr.splice(idx, 1);
    }
    dispatch(setFriendList(tmpArr));
  };

  const friednInfoChangeHandler = (data: WsResponse) => friendHandlerTemplate(data, "info");
  const friednAddedHandler = (data: WsResponse) => friendHandlerTemplate(data, "added");
  const friednDeletedHandler = (data: WsResponse) => friendHandlerTemplate(data, "deleted");

  useEffect(() => {
    im.on(CbEvents.ONFRIENDINFOCHANGED, friednInfoChangeHandler);
    im.on(CbEvents.ONFRIENDADDED, friednAddedHandler);
    im.on(CbEvents.ONFRIENDDELETED, friednDeletedHandler);
    return () => {
      im.off(CbEvents.ONFRIENDINFOCHANGED, friednInfoChangeHandler);
      im.off(CbEvents.ONFRIENDADDED, friednAddedHandler);
      im.off(CbEvents.ONFRIENDDELETED, friednDeletedHandler);
    };
  }, []);

  // black update
  const blackAddedHandler = (data: WsResponse) => {
    const black = JSON.parse(data.data);
    const tmpBlackArr = [...latestBlackList.current];
    const tmpFriendArr = [...latestFriendList.current];
    const idx = tmpFriendArr.findIndex((f) => f.userID === black.userID);
    if (idx !== -1) tmpFriendArr.splice(idx, 1);
    tmpBlackArr.push(black);
    dispatch(setBlackList(tmpBlackArr));
    dispatch(setFriendList(tmpFriendArr));
  };
  const blackDeletedHandler = async (data: WsResponse) => {
    const black = JSON.parse(data.data);
    const tmpBlackArr = [...latestBlackList.current];
    const tmpFriendArr = [...latestFriendList.current];
    let { data: result } = await im.getDesignatedFriendsInfo([black.userID]);
    result = JSON.parse(result);
    if (result.length > 0 && result[0].friendInfo) {
      tmpFriendArr.push(result[0].friendInfo);
    }
    const delIdx = tmpBlackArr.findIndex((b) => b.userID === black.userID);
    if (delIdx !== -1) tmpBlackArr.splice(delIdx, 1);
    dispatch(setBlackList(tmpBlackArr));
    dispatch(setFriendList(tmpFriendArr));
  };

  useEffect(() => {
    im.on(CbEvents.ONBLACKADDED, blackAddedHandler);
    im.on(CbEvents.ONBLACKDELETED, blackDeletedHandler);
    return () => {
      im.off(CbEvents.ONBLACKADDED, blackAddedHandler);
      im.off(CbEvents.ONBLACKDELETED, blackDeletedHandler);
    };
  }, []);

  // group update
  const isCurGroup = (gid: string) => latestCve.current?.groupID === gid;

  const groupHandlerTemplate = (data: WsResponse, type: GruopHandlerType) => {
    const result = JSON.parse(data.data);
    const tmpArr = [...latestGroupList.current];
    const idx = tmpArr.findIndex((f) => f.groupID === result.groupID);
    switch (type) {
      case "info":
        if (idx !== -1) tmpArr[idx] = result;
        if (isCurGroup(result.groupID)) dispatch(setGroupInfo(result));
        events.emit(GROUP_INFO_UPDATED, result);
        break;
      case "added":
        tmpArr.push(result);
        if (isCurGroup(result.groupID)) {
          // const options = {
          //   groupID: result.groupID,
          //   offset: 0,
          //   filter: 0,
          //   count: 9999999,
          // };
          // dispatch(getGroupMemberList(options));
          dispatch(setGroupInfo(result));
        }
        events.emit(GROUP_INFO_UPDATED, result);
        break;
      case "deleted":
        if (idx !== -1) {
          tmpArr[idx].memberCount -= 1;
          events.emit(GROUP_INFO_UPDATED, tmpArr[idx]);
          if (isCurGroup(result.groupID)) dispatch(setGroupInfo(tmpArr[idx]));
          tmpArr.splice(idx, 1);
        }
        break;
      case "memberAdded":
        if (idx !== -1) {
          // tmpArr[idx].memberCount += 1;
          if (isCurGroup(result.groupID)) {
            const tempArr2 = [...latestGroupMemberList.current];
            tempArr2.push(result);
            // dispatch(setGroupInfo(tmpArr[idx]));
            dispatch(setGroupMemberList(tempArr2));
          }
        }
        break;
      case "memberDeleted":
        if (idx !== -1) {
          // tmpArr[idx].memberCount -= 1;
          // events.emit(GROUP_INFO_UPDATED,tmpArr[idx])
          if (isCurGroup(result.groupID)) {
            const tempArr2 = [...latestGroupMemberList.current];
            const delIdx = tempArr2.findIndex((m) => m.userID === result.userID);
            if (delIdx !== -1) tempArr2.splice(delIdx, 1);
            // dispatch(setGroupInfo(tmpArr[idx]));
            dispatch(setGroupMemberList(tempArr2));
          }
        }
        break;
      case "memberInfo":
        if (isCurGroup(result.groupID)) {
          const tempArr2 = [...latestGroupMemberList.current];
          const changeIdx = tempArr2.findIndex((t2) => t2.userID === result.userID);
          if (changeIdx > -1) {
            tempArr2[changeIdx] = result;
          }
          events.emit(CUR_GROUPMEMBER_CHANGED, result);
          dispatch(setGroupMemberList(tempArr2));
        }
    }

    if (type !== "memberInfo") {
      dispatch(setGroupList(tmpArr));
    }
  };

  const joinedGroupAddedHandler = (data: WsResponse) => groupHandlerTemplate(data, "added");

  const joinedGroupDeletedHandler = (data: WsResponse) => groupHandlerTemplate(data, "deleted");

  const groupInfoChangedHandler = (data: WsResponse) => groupHandlerTemplate(data, "info");

  const groupMemberAddedHandler = (data: WsResponse) => groupHandlerTemplate(data, "memberAdded");

  const groupMemberDeletedHandler = (data: WsResponse) => groupHandlerTemplate(data, "memberDeleted");

  const groupMemberInfoChangedHandler = (data: WsResponse) => groupHandlerTemplate(data, "memberInfo");

  useEffect(() => {
    im.on(CbEvents.ONJOINEDGROUPADDED, joinedGroupAddedHandler);
    im.on(CbEvents.ONJOINEDGROUPDELETED, joinedGroupDeletedHandler);
    im.on(CbEvents.ONGROUPINFOCHANGED, groupInfoChangedHandler);
    im.on(CbEvents.ONGROUPMEMBERADDED, groupMemberAddedHandler);
    im.on(CbEvents.ONGROUPMEMBERDELETED, groupMemberDeletedHandler);
    im.on(CbEvents.ONGROUPMEMBERINFOCHANGED, groupMemberInfoChangedHandler);
    return () => {
      im.off(CbEvents.ONJOINEDGROUPADDED, joinedGroupAddedHandler);
      im.off(CbEvents.ONJOINEDGROUPDELETED, joinedGroupDeletedHandler);
      im.off(CbEvents.ONGROUPINFOCHANGED, groupInfoChangedHandler);
      im.off(CbEvents.ONGROUPMEMBERADDED, groupMemberAddedHandler);
      im.off(CbEvents.ONGROUPMEMBERDELETED, groupMemberDeletedHandler);
      im.off(CbEvents.ONGROUPMEMBERINFOCHANGED, groupMemberInfoChangedHandler);
    };
  }, []);

  // RTC
  const newInvitationHandler = ({ data }: { data: any }) => {
    data = JSON.parse(data);
    if (rtcConfig.visible) return;
    setRtcConfig({
      isCalled: true,
      isSingle: data.invitation.sessionType === SessionType.Single,
      isVideo: data.invitation.mediaType === "video",
      invitation: data.invitation,
      visible: true,
    });
  };

  const sendInviteHandler = (invitation: any) => {
    setRtcConfig({
      isCalled: false,
      isSingle: invitation.sessionType === SessionType.Single,
      isVideo: invitation.mediaType === "video",
      invitation,
      visible: true,
    });
  };

  const otherHandler = () => {
    if (rtcConfig.visible) {
      closeRtcModal();
    }
  };

  useEffect(() => {
    im.on(CbEvents.ONRECEIVENEWINVITATION, newInvitationHandler);
    im.on(CbEvents.ONINVITEEACCEPTEDBYOTHERDEVICE, otherHandler);
    im.on(CbEvents.ONINVITEEREJECTEDBYOTHERDEVICE, otherHandler);
    events.on(SIGNAL_INGINVITE, sendInviteHandler);
    return () => {
      im.off(CbEvents.ONRECEIVENEWINVITATION, newInvitationHandler);
      im.off(CbEvents.ONINVITEEACCEPTEDBYOTHERDEVICE, otherHandler);
      im.off(CbEvents.ONINVITEEREJECTEDBYOTHERDEVICE, otherHandler);
      events.off(SIGNAL_INGINVITE, sendInviteHandler);
    };
  }, [rtcConfig]);

  // application update
  const applicationHandlerTemplate = (data: any, field: string, reqFlag: boolean = false) => {
    let dispatchFn = (list: any) => {};
    let tmpArr: any[] = [];
    switch (field) {
      case "toUserID":
        dispatchFn = setSentFriendApplicationList;
        tmpArr = [...latestSentFriendApplicationList.current];
        break;
      case "fromUserID":
        dispatchFn = setRecvFriendApplicationList;
        tmpArr = [...latestRecvFriendApplicationList.current];
        break;
      case "groupID":
        dispatchFn = setSentGroupApplicationList;
        tmpArr = [...latestSentGroupApplicationList.current];
        break;
      case "userID":
        dispatchFn = setRecvGroupApplicationList;
        tmpArr = [...latestRecvGroupApplicationList.current];
        break;
    }
    const application = JSON.parse(data.data);
    const idx = tmpArr.findIndex((a) => a[field] === application[field] && (reqFlag || a.reqMsg !== application.reqMsg));
    if (idx !== -1) tmpArr.splice(idx, 1);
    tmpArr.unshift(application);
    dispatch(dispatchFn(tmpArr));
  };

  const isReceivedFriendApplication = (fromUserID: string) => fromUserID !== selfInfo.userID;
  const isReceivedGroupApplication = (userID: string) => userID !== selfInfo.userID;

  const friendApplicationAddedHandler = (data: WsResponse) => {
    const application: FriendApplicationItem = JSON.parse(data.data);
    isReceivedFriendApplication(application.fromUserID) ? applicationHandlerTemplate(data, "fromUserID") : applicationHandlerTemplate(data, "toUserID");
  };
  const friendApplicationProcessedHandler = (data: WsResponse) => {
    const application: FriendApplicationItem = JSON.parse(data.data);
    isReceivedFriendApplication(application.fromUserID) ? applicationHandlerTemplate(data, "fromUserID", true) : applicationHandlerTemplate(data, "toUserID", true);
  };

  const groupApplicationAddedHandler = (data: WsResponse) => {
    const application: GroupApplicationItem = JSON.parse(data.data);
    isReceivedGroupApplication(application.userID) ? applicationHandlerTemplate(data, "userID") : applicationHandlerTemplate(data, "groupID");
  };
  const groupApplicationProcessedHandler = (data: WsResponse) => {
    const application: GroupApplicationItem = JSON.parse(data.data);
    isReceivedGroupApplication(application.userID) ? applicationHandlerTemplate(data, "userID", true) : applicationHandlerTemplate(data, "groupID", true);
  };

  useEffect(() => {
    im.on(CbEvents.ONFRIENDAPPLICATIONADDED, friendApplicationAddedHandler);
    im.on(CbEvents.ONFRIENDAPPLICATIONACCEPTED, friendApplicationProcessedHandler);
    im.on(CbEvents.ONFRIENDAPPLICATIONREJECTED, friendApplicationProcessedHandler);
    return () => {
      im.off(CbEvents.ONFRIENDAPPLICATIONADDED, friendApplicationAddedHandler);
      im.off(CbEvents.ONFRIENDAPPLICATIONACCEPTED, friendApplicationProcessedHandler);
      im.off(CbEvents.ONFRIENDAPPLICATIONREJECTED, friendApplicationProcessedHandler);
    };
  }, [selfInfo]);

  useEffect(() => {
    im.on(CbEvents.ONGROUPAPPLICATIONADDED, groupApplicationAddedHandler);
    im.on(CbEvents.ONGROUPAPPLICATIONACCEPTED, groupApplicationProcessedHandler);
    im.on(CbEvents.ONGROUPAPPLICATIONREJECTED, groupApplicationProcessedHandler);
    return () => {
      im.off(CbEvents.ONGROUPAPPLICATIONADDED, groupApplicationAddedHandler);
      im.off(CbEvents.ONGROUPAPPLICATIONACCEPTED, groupApplicationProcessedHandler);
      im.off(CbEvents.ONGROUPAPPLICATIONREJECTED, groupApplicationProcessedHandler);
    };
  }, [selfInfo]);

  const imLogin = async () => {
    initEmoji(userID);
    let platformID = window.electron ? window.electron.platform : 5;
    const config = {
      userID,
      token,
      apiAddress: getIMApiUrl(),
      wsAddress: getIMWsUrl(),
      platformID,
      object_storage: "minio",
    };
    im.login(config)
      .then((res) => {
        getStore(userID);
        setGolbalLoading(false);
        localStorage.removeItem(`IMuserID`);
      })
      .catch((err) => {
        invalid();
      });
  };

  const getStore = (userID: string) => {
    dispatch(getSelfInfo());
    dispatch(getCveList());
    dispatch(getFriendList());
    dispatch(getRecvFriendApplicationList());
    dispatch(getSentFriendApplicationList());
    dispatch(getGroupList());
    dispatch(getRecvGroupApplicationList());
    dispatch(getSentGroupApplicationList());
    dispatch(getUnReadCount());
    dispatch(getBlackList());
    dispatch(getOrganizationInfo(userID));
    dispatch(getAppGlobalConfig());
  };

  const invalid = () => {
    setGolbalLoading(false);
    // message.warning("登录失效，请重新登录！");
    localStorage.removeItem(`improfile-${userID}`);
    localStorage.removeItem("IMuserID");
    window.electron?.removeStoreKey("IMUserID");
    window.electron?.removeStoreKey("IMProfile");
    syncMessageFinishHandler();
    navigate("/login");
  };

  const deWeightThree = (cves: ConversationItem[]) => {
    let map = new Map();
    for (let item of cves) {
      if (!map.has(item.conversationID)) {
        map.set(item.conversationID, item);
      }
    }
    return [...map.values()];
  };

  const closeRtcModal = () => setRtcConfig({ ...rtcConfig, visible: false });

  return (
    <>
      {token ? <Mylayout /> : <Navigate to="/login" />}
      {golbalLoading && <GolbalLoadingModal golbalLoading={golbalLoading} />}
      {showPlayer.state && <PlayVideoModal url={showPlayer.url} isModalVisible={showPlayer.state} close={closePlay} />}
      {rtcConfig.visible && <RtcModal myClose={closeRtcModal} {...rtcConfig} />}
      {golbalSearch && <GolbalSearchModal close={() => setGolbalSearch(false)} visible={golbalSearch} />}
      <audio ref={messageNotifitionRef} />
    </>
  );
};

const RouterWrapper = ({ children }: { children: ReactNode }) => {
  return window.electron ? <HashRouter>{children}</HashRouter> : <BrowserRouter>{children}</BrowserRouter>;
};

const MyRoute = () => {
  const rootState = useSelector((state: RootState) => state, shallowEqual);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getAppGlobalConfig());
  }, []);

  window.onbeforeunload = function () {
    // localStorage.removeItem("IMuserID");
    im.logout();
    localStorage.setItem("IMuserID", rootState.user.selfInfo.userID ?? "");
    localStorage.setItem(`${rootState.user.selfInfo.userID}userStore`, JSON.stringify(rootState.user));
    localStorage.setItem(`${rootState.user.selfInfo.userID}cveStore`, JSON.stringify(rootState.cve));
    localStorage.setItem(`${rootState.user.selfInfo.userID}consStore`, JSON.stringify(rootState.contacts));
  };

  return (
    <RouterWrapper>
      <Routes>
        <Route path="/" element={<Auth />}>
          <Route index element={<Home />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="profile" element={<Profile />} />
          {/* <Route path="workbench" element={<Workbench/>} /> */}
          {/* <Route path="togetherSend" element={<TogetherSend />} /> */}
        </Route>
        <Route path="/login/*" element={<Login />} />
      </Routes>
    </RouterWrapper>
  );
};

export default MyRoute;
