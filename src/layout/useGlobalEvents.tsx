import { useLatest, useThrottleFn } from "ahooks";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BusinessAllowType } from "@/api/login";
import messageRing from "@/assets/audio/newMsg.mp3";
import { API_URL, WS_URL } from "@/config";
import {
  ExMessageItem,
  useConversationStore,
  useMessageStore,
  useUserStore,
} from "@/store";
import { useContactStore } from "@/store/contact";
import { feedbackToast } from "@/utils/common";
import emitter from "@/utils/events";
import { initStore, isGroupSession } from "@/utils/imCommon";
import { CbEvents } from "@/utils/open-im-sdk-wasm/constant";
import {
  BlackUserItem,
  ConversationItem,
  FriendApplicationItem,
  FriendUserItem,
  GroupApplicationItem,
  GroupItem,
  GroupMemberItem,
  RevokedInfo,
  SelfUserInfo,
  WSEvent,
  WsResponse,
} from "@/utils/open-im-sdk-wasm/types/entity";
import {
  MessageReceiveOptType,
  MessageType,
  SessionType,
} from "@/utils/open-im-sdk-wasm/types/enum";
import { clearIMProfile, getIMToken, getIMUserID } from "@/utils/storage";

import { IMSDK } from "./MainContentWrap";

export function useGlobalEvent() {
  const navigate = useNavigate();
  const [connectState, setConnectState] = useState({
    isSyncing: false,
    isLogining: false,
    isConnecting: false,
  });
  // user
  const updateSelfInfo = useUserStore((state) => state.updateSelfInfo);
  const getWorkMomentsUnreadCount = useUserStore(
    (state) => state.getWorkMomentsUnreadCount,
  );
  const userLogout = useUserStore((state) => state.userLogout);
  // conversation
  const updateConversationList = useConversationStore(
    (state) => state.updateConversationList,
  );
  const updateUnReadCount = useConversationStore((state) => state.updateUnReadCount);
  const updateCurrentGroupInfo = useConversationStore(
    (state) => state.updateCurrentGroupInfo,
  );
  const getCurrentGroupInfoByReq = useConversationStore(
    (state) => state.getCurrentGroupInfoByReq,
  );
  const getCurrentMemberInGroupByReq = useConversationStore(
    (state) => state.getCurrentMemberInGroupByReq,
  );
  const tryUpdateCurrentMemberInGroup = useConversationStore(
    (state) => state.tryUpdateCurrentMemberInGroup,
  );
  // message
  const pushNewMessage = useMessageStore((state) => state.pushNewMessage);
  const updateOneMessage = useMessageStore((state) => state.updateOneMessage);
  const updateMessageNicknameAndFaceUrl = useMessageStore(
    (state) => state.updateMessageNicknameAndFaceUrl,
  );
  // contact
  const updateFriend = useContactStore((state) => state.updateFriend);
  const pushNewFriend = useContactStore((state) => state.pushNewFriend);
  const updateBlack = useContactStore((state) => state.updateBlack);
  const pushNewBlack = useContactStore((state) => state.pushNewBlack);
  const updateGroup = useContactStore((state) => state.updateGroup);
  const pushNewGroup = useContactStore((state) => state.pushNewGroup);
  const updateRecvFriendApplication = useContactStore(
    (state) => state.updateRecvFriendApplication,
  );
  const updateSendFriendApplication = useContactStore(
    (state) => state.updateSendFriendApplication,
  );
  const updateRecvGroupApplication = useContactStore(
    (state) => state.updateRecvGroupApplication,
  );
  const updateSendGroupApplication = useContactStore(
    (state) => state.updateSendGroupApplication,
  );

  let cacheConversationList = [] as ConversationItem[];
  let audioEl: HTMLAudioElement | null = null;

  useEffect(() => {
    loginCheck();
    cacheConversationList = [];
    setElectronListener();
    setIMListener();
    return () => {
      disposeIMListener();
      disposeElectronListener();
    };
  }, []);

  const loginCheck = async () => {
    const IMToken = (await getIMToken()) as string;
    const IMUserID = (await getIMUserID()) as string;
    if (!IMToken || !IMUserID) {
      clearIMProfile();
      navigate("/login");
      return;
    }
    tryLogin();
    // IMSDK.getLoginStatus()
    //   .then((res) => {
    //     if (res.data !== 3) {
    //       tryLogin();
    //     }
    //   })
    //   .catch(() => {
    //     clearIMProfile();
    //     navigate("/login");
    //   });
  };

  const tryLogin = async () => {
    setConnectState((state) => ({ ...state, isLogining: true }));
    const IMToken = (await getIMToken()) as string;
    const IMUserID = (await getIMUserID()) as string;
    try {
      await IMSDK.login({
        userID: IMUserID,
        token: IMToken,
        platformID: window.electronAPI?.getPlatform() ?? 5,
        apiAddr: API_URL,
        wsAddr: WS_URL,
      });
      initStore();
    } catch (error) {
      if ((error as WsResponse).errCode !== 10102) {
        clearIMProfile();
        navigate("/login");
      }
    }

    setConnectState((state) => ({ ...state, isLogining: false }));
  };

  const setIMListener = () => {
    // account
    IMSDK.on(CbEvents.OnSelfInfoUpdated, selfUpdateHandler);
    IMSDK.on(CbEvents.OnConnecting, connectingHandler);
    IMSDK.on(CbEvents.OnConnectFailed, connectFailedHandler);
    IMSDK.on(CbEvents.OnConnectSuccess, connectSuccessHandler);
    IMSDK.on(CbEvents.OnKickedOffline, kickHandler);
    IMSDK.on(CbEvents.OnUserTokenExpired, expiredHandler);
    // sync
    IMSDK.on(CbEvents.OnSyncServerStart, syncStartHandler);
    IMSDK.on(CbEvents.OnSyncServerFinish, syncFinishHandler);
    IMSDK.on(CbEvents.OnSyncServerFailed, syncFailedHandler);
    // message
    IMSDK.on(CbEvents.OnRecvNewMessage, newMessageHandler);
    IMSDK.on(CbEvents.OnRecvNewMessages, newMessageHandler);
    IMSDK.on(CbEvents.OnNewRecvMessageRevoked, revokedMessageHandler);
    // conversation
    IMSDK.on(CbEvents.OnConversationChanged, conversationChnageHandler);
    IMSDK.on(CbEvents.OnNewConversation, newConversationHandler);
    IMSDK.on(CbEvents.OnTotalUnreadMessageCountChanged, totalUnreadChangeHandler);
    // friend
    IMSDK.on(CbEvents.OnFriendInfoChanged, friednInfoChangeHandler);
    IMSDK.on(CbEvents.OnFriendAdded, friednAddedHandler);
    IMSDK.on(CbEvents.OnFriendDeleted, friednDeletedHandler);
    // blacklist
    IMSDK.on(CbEvents.OnBlackAdded, blackAddedHandler);
    IMSDK.on(CbEvents.OnBlackDeleted, blackDeletedHandler);
    // group
    IMSDK.on(CbEvents.OnJoinedGroupAdded, joinedGroupAddedHandler);
    IMSDK.on(CbEvents.OnJoinedGroupDeleted, joinedGroupDeletedHandler);
    IMSDK.on(CbEvents.OnGroupInfoChanged, groupInfoChangedHandler);
    IMSDK.on(CbEvents.OnGroupMemberAdded, groupMemberAddedHandler);
    IMSDK.on(CbEvents.OnGroupMemberDeleted, groupMemberDeletedHandler);
    IMSDK.on(CbEvents.OnGroupMemberInfoChanged, groupMemberInfoChangedHandler);
    // application
    IMSDK.on(CbEvents.OnFriendApplicationAdded, friendApplicationProcessedHandler);
    IMSDK.on(CbEvents.OnFriendApplicationAccepted, friendApplicationProcessedHandler);
    IMSDK.on(CbEvents.OnFriendApplicationRejected, friendApplicationProcessedHandler);
    IMSDK.on(CbEvents.OnGroupApplicationAdded, groupApplicationProcessedHandler);
    IMSDK.on(CbEvents.OnGroupApplicationAccepted, groupApplicationProcessedHandler);
    IMSDK.on(CbEvents.OnGroupApplicationRejected, groupApplicationProcessedHandler);
    // custom
    IMSDK.on(CbEvents.OnRecvCustomBusinessMessage, customMessageHandler);
  };

  const selfUpdateHandler = ({ data }: WSEvent<SelfUserInfo>) => {
    updateSelfInfo(data);
  };
  const connectingHandler = () => {
    console.log("connecting...");
  };
  const connectFailedHandler = ({ errCode, errMsg }: WSEvent) => {
    console.log(errCode, errMsg);

    if (errCode === 705) {
      tryOut("当前登录已过期,请重新登录");
    }
  };
  const connectSuccessHandler = () => {
    console.log("connect success...");
  };
  const kickHandler = () => tryOut("您的账号已在其他设备登录,请重新登录");
  const expiredHandler = () => tryOut("当前登录已过期,请重新登录");

  const tryOut = (msg: string) =>
    feedbackToast({
      msg,
      error: msg,
      onClose: () => {
        userLogout(true);
      },
    });

  // sync
  const syncStartHandler = () => {
    setConnectState((state) => ({ ...state, isSyncing: true }));
  };
  const syncFinishHandler = () => {
    setConnectState((state) => ({ ...state, isSyncing: false }));
  };
  const syncFailedHandler = () => {
    feedbackToast({ msg: "同步失败！", error: "同步失败！" });
    setConnectState((state) => ({ ...state, isSyncing: false }));
  };

  // message
  const newMessageHandler = ({ data }: WSEvent<ExMessageItem | ExMessageItem[]>) => {
    if (connectState.isSyncing) return;
    if (Array.isArray(data)) {
      data.map((message) => handleNewMessage(message));
      return;
    }
    handleNewMessage(data);
  };

  const revokedMessageHandler = ({ data }: WSEvent<RevokedInfo>) => {
    updateOneMessage({
      clientMsgID: data.clientMsgID,
      contentType: MessageType.RevokeMessage,
      notificationElem: {
        detail: JSON.stringify(data),
      },
    } as ExMessageItem);
  };

  const newMessageNotify = async (newServerMsg: ExMessageItem) => {
    if (connectState.isSyncing) {
      return;
    }

    const selfInfo = useUserStore.getState().selfInfo;

    if (
      selfInfo.allowBeep === BusinessAllowType.NotAllow ||
      selfInfo.globalRecvMsgOpt !== MessageReceiveOptType.Nomal
    ) {
      return;
    }

    let cveItem = [
      ...useConversationStore.getState().conversationList,
      ...cacheConversationList,
    ].find((conversation) => {
      if (isGroupSession(newServerMsg.sessionType)) {
        return newServerMsg.groupID === conversation.groupID;
      }
      return newServerMsg.sendID === conversation.userID;
    });

    if (!cveItem) {
      try {
        const { data } = await IMSDK.getOneConversation<ConversationItem>({
          sessionType: newServerMsg.sessionType,
          sourceID: newServerMsg.groupID || newServerMsg.sendID,
        });
        cveItem = data;
        cacheConversationList = [...cacheConversationList, { ...cveItem }];
      } catch (e) {
        return;
      }
    }

    if (cveItem.recvMsgOpt !== MessageReceiveOptType.Nomal) {
      return;
    }

    if (!audioEl) {
      audioEl = document.createElement("audio");
    }
    audioEl.src = messageRing;
    audioEl.play();
  };

  const { run: checkOnline } = useThrottleFn(() => emitter.emit("ONLINE_STATE_CHECK"), {
    wait: 2000,
  });

  const { run: checkTyping } = useThrottleFn(() => emitter.emit("TYPING_UPDATE"), {
    wait: 2000,
  });

  const { run: newMessageNotification } = useThrottleFn(newMessageNotify, {
    wait: 2000,
  });

  const notPushType = [MessageType.TypingMessage, MessageType.RevokeMessage];

  const handleNewMessage = (newServerMsg: ExMessageItem) => {
    if (!inCurrentConversation(newServerMsg)) {
      const needNotification =
        !notPushType.includes(newServerMsg.contentType) &&
        newServerMsg.sendID !== useUserStore.getState().selfInfo.userID;
      if (needNotification) {
        newMessageNotification(newServerMsg);
      }
      return;
    }
    const isSingleMessage = newServerMsg.sessionType === SessionType.Single;

    if (isSingleMessage) {
      if (newServerMsg.contentType === MessageType.TypingMessage) {
        checkTyping();
      }
      checkOnline();
    }

    if (!notPushType.includes(newServerMsg.contentType)) {
      newServerMsg.isAppend = true;
      pushNewMessage(newServerMsg);
      emitter.emit("CHAT_LIST_SCROLL_TO_BOTTOM", true);
    }
  };

  const inCurrentConversation = (newServerMsg: ExMessageItem) => {
    switch (newServerMsg.sessionType) {
      case SessionType.Single:
        return (
          newServerMsg.sendID ===
            useConversationStore.getState().currentConversation?.userID ||
          (newServerMsg.sendID === useUserStore.getState().selfInfo.userID &&
            newServerMsg.recvID ===
              useConversationStore.getState().currentConversation?.userID)
        );
      case SessionType.Group:
      case SessionType.WorkingGroup:
        return (
          newServerMsg.groupID ===
          useConversationStore.getState().currentConversation?.groupID
        );
      case SessionType.Notification:
        return (
          newServerMsg.sendID ===
          useConversationStore.getState().currentConversation?.userID
        );
      default:
        return false;
    }
  };

  // conversation
  const conversationChnageHandler = ({ data }: WSEvent<ConversationItem[]>) => {
    updateConversationList(data, "filter");
  };
  const newConversationHandler = ({ data }: WSEvent<ConversationItem[]>) => {
    updateConversationList(data, "push");
  };
  const totalUnreadChangeHandler = ({ data }: WSEvent<number>) => {
    updateUnReadCount(data);
  };

  // friend
  const friednInfoChangeHandler = ({ data }: WSEvent<FriendUserItem>) => {
    if (data.userID === useConversationStore.getState().currentConversation?.userID) {
      updateMessageNicknameAndFaceUrl({
        sendID: data.userID,
        senderNickname: data.nickname,
        senderFaceUrl: data.faceURL,
      });
    }
    updateFriend(data);
  };
  const friednAddedHandler = ({ data }: WSEvent<FriendUserItem>) => {
    pushNewFriend(data);
  };
  const friednDeletedHandler = ({ data }: WSEvent<FriendUserItem>) => {
    updateFriend(data, true);
  };

  // blacklist
  const blackAddedHandler = ({ data }: WSEvent<BlackUserItem>) => {
    pushNewBlack(data);
  };
  const blackDeletedHandler = ({ data }: WSEvent<BlackUserItem>) => {
    updateBlack(data, true);
  };

  // group
  const joinedGroupAddedHandler = ({ data }: WSEvent<GroupItem>) => {
    if (data.groupID === useConversationStore.getState().currentConversation?.groupID) {
      updateCurrentGroupInfo(data);
      // getCurrentMemberInGroupByReq(group.groupID);
    }
    pushNewGroup(data);
  };
  const joinedGroupDeletedHandler = ({ data }: WSEvent<GroupItem>) => {
    if (data.groupID === useConversationStore.getState().currentConversation?.groupID) {
      getCurrentGroupInfoByReq(data.groupID);
      // getCurrentMemberInGroupByReq(data.groupID);
    }
    updateGroup(data, true);
  };
  const groupInfoChangedHandler = ({ data }: WSEvent<GroupItem>) => {
    updateGroup(data);
    if (data.groupID === useConversationStore.getState().currentConversation?.groupID) {
      updateCurrentGroupInfo(data);
    }
  };
  const groupMemberAddedHandler = ({ data }: WSEvent<GroupMemberItem>) => {
    if (
      data.groupID === useConversationStore.getState().currentConversation?.groupID &&
      data.userID === useUserStore.getState().selfInfo.userID
    ) {
      getCurrentMemberInGroupByReq(data.groupID);
    }
    console.log("groupMemberAddedHandler");
  };
  const groupMemberDeletedHandler = ({ data }: WSEvent<GroupMemberItem>) => {
    if (
      data.groupID === useConversationStore.getState().currentConversation?.groupID &&
      data.userID === useUserStore.getState().selfInfo.userID
    ) {
      getCurrentMemberInGroupByReq(data.groupID);
    }
  };
  const groupMemberInfoChangedHandler = ({ data }: WSEvent<GroupMemberItem>) => {
    if (data.groupID === useConversationStore.getState().currentConversation?.groupID) {
      updateMessageNicknameAndFaceUrl({
        sendID: data.userID,
        senderNickname: data.nickname,
        senderFaceUrl: data.faceURL,
      });
      tryUpdateCurrentMemberInGroup(data);
    }
  };

  //application
  const friendApplicationProcessedHandler = ({
    data,
  }: WSEvent<FriendApplicationItem>) => {
    const isRecv = data.toUserID === useUserStore.getState().selfInfo.userID;
    if (isRecv) {
      updateRecvFriendApplication(data);
    } else {
      updateSendFriendApplication(data);
    }
  };
  const groupApplicationProcessedHandler = ({
    data,
  }: WSEvent<GroupApplicationItem>) => {
    const isRecv = data.userID !== useUserStore.getState().selfInfo.userID;
    if (isRecv) {
      updateRecvGroupApplication(data);
    } else {
      updateSendGroupApplication(data);
    }
  };

  // custom
  const customMessageHandler = ({
    data: { key },
  }: WSEvent<{ key: string; data: string }>) => {
    if (key.includes("wm_")) {
      getWorkMomentsUnreadCount();
    }
  };

  const disposeIMListener = () => {
    IMSDK.off(CbEvents.OnSelfInfoUpdated, selfUpdateHandler);
    IMSDK.off(CbEvents.OnConnecting, connectingHandler);
    IMSDK.off(CbEvents.OnConnectFailed, connectFailedHandler);
    IMSDK.off(CbEvents.OnConnectSuccess, connectSuccessHandler);
    IMSDK.off(CbEvents.OnKickedOffline, kickHandler);
    IMSDK.off(CbEvents.OnUserTokenExpired, expiredHandler);
    // sync
    IMSDK.off(CbEvents.OnSyncServerStart, syncStartHandler);
    IMSDK.off(CbEvents.OnSyncServerFinish, syncFinishHandler);
    IMSDK.off(CbEvents.OnSyncServerFailed, syncFailedHandler);
    // message
    IMSDK.off(CbEvents.OnRecvNewMessage, newMessageHandler);
    IMSDK.off(CbEvents.OnRecvNewMessages, newMessageHandler);
    // conversation
    IMSDK.off(CbEvents.OnConversationChanged, conversationChnageHandler);
    IMSDK.off(CbEvents.OnNewConversation, newConversationHandler);
    IMSDK.off(CbEvents.OnTotalUnreadMessageCountChanged, totalUnreadChangeHandler);
    // friend
    IMSDK.off(CbEvents.OnFriendInfoChanged, friednInfoChangeHandler);
    IMSDK.off(CbEvents.OnFriendAdded, friednAddedHandler);
    IMSDK.off(CbEvents.OnFriendDeleted, friednDeletedHandler);
    // blacklist
    IMSDK.off(CbEvents.OnBlackAdded, blackAddedHandler);
    IMSDK.off(CbEvents.OnBlackDeleted, blackDeletedHandler);
    // group
    IMSDK.off(CbEvents.OnJoinedGroupAdded, joinedGroupAddedHandler);
    IMSDK.off(CbEvents.OnJoinedGroupDeleted, joinedGroupDeletedHandler);
    IMSDK.off(CbEvents.OnGroupInfoChanged, groupInfoChangedHandler);
    IMSDK.off(CbEvents.OnGroupMemberAdded, groupMemberAddedHandler);
    IMSDK.off(CbEvents.OnGroupMemberDeleted, groupMemberDeletedHandler);
    IMSDK.off(CbEvents.OnGroupMemberInfoChanged, groupMemberInfoChangedHandler);
    // application
    IMSDK.off(CbEvents.OnFriendApplicationAdded, friendApplicationProcessedHandler);
    IMSDK.off(CbEvents.OnFriendApplicationAccepted, friendApplicationProcessedHandler);
    IMSDK.off(CbEvents.OnFriendApplicationRejected, friendApplicationProcessedHandler);
    IMSDK.off(CbEvents.OnGroupApplicationAdded, groupApplicationProcessedHandler);
    IMSDK.off(CbEvents.OnGroupApplicationAccepted, groupApplicationProcessedHandler);
    IMSDK.off(CbEvents.OnGroupApplicationRejected, groupApplicationProcessedHandler);
    // custom
    IMSDK.off(CbEvents.OnRecvCustomBusinessMessage, customMessageHandler);
  };

  const setElectronListener = () => {
    window.electronAPI?.subscribe("getContactStoreData", getContactStoreDataHandler);
    window.electronAPI?.subscribe("downloadSuccess", downloadSuccessHandler);
  };

  const getContactStoreDataHandler = (_: unknown, key: string) => {
    window.electronAPI?.ipcInvoke("transferContactStoreData", {
      key,
      data: JSON.stringify({
        friendList: useContactStore.getState().friendList,
        groupList: useContactStore.getState().groupList,
      }),
    });
  };

  const downloadSuccessHandler = (_: unknown, url: string, savePath: string) => {
    const flagID = useMessageStore.getState().downloadMap[url];
    if (!flagID) return;
    const infoArr = flagID.split("-");

    IMSDK.setMessageLocalEx({
      clientMsgID: infoArr[0],
      conversationID: infoArr[1],
      localEx: savePath,
    }).then(() =>
      updateOneMessage({
        clientMsgID: infoArr[0],
        localEx: savePath,
      } as ExMessageItem),
    );
  };

  const disposeElectronListener = () => {
    window.electronAPI?.unsubscribe("getContactStoreData", getContactStoreDataHandler);
    window.electronAPI?.unsubscribe("downloadSuccess", downloadSuccessHandler);
  };

  return [connectState];
}
