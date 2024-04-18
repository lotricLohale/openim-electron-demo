// import { OpenIMSDK } from 'open-im-sdk'
import { t } from "i18next";
import { CommonContacts } from "../@types/open_im";
import { customType } from "../constants/messageContentType";
import { sec2Time } from "./common";
import { getSDK } from "./lib";
// import { getSDK } from "open-im-sdk-web-wasm";
import localforage from "localforage";
import { ConversationItem, FriendApplicationItem, GroupApplicationItem, MessageItem, MessageType, SessionType } from "./open_im_sdk/types";
import store from "../store";
import { getNoticeCodeWidthTitle } from "../pages/home/Cve/MsgItem/notice";

// export const im = new OpenIMSDK();
export const im = getSDK("./openIM.wasm");

//utils
export const isSingleCve = (cve: ConversationItem) => {
  return cve.userID !== "" && cve.groupID === "";
};

const switchCustomMsg = (cMsg: any, isSelfMsg: boolean) => {
  switch (cMsg.customType) {
    case customType.MassMsg:
      return "[通知消息]";
    case customType.TextMsg:
      return "[转发消息]";
    case customType.Call:
      return "[语音通话]";
    case customType.MeetingInvitation:
      return "[会议邀请]";
    default:
      return "";
  }
};

export const parseMessageType = (pmsg: MessageItem, curUid?: string, isNotify = false): string => {
  const noticeCodeWidthTitle = getNoticeCodeWidthTitle(t);
  const isSelf = (id: string) => id === curUid;
  let noticeDetail;
  try {
    noticeDetail = JSON.parse(pmsg.content);
  } catch {}
  const isNotice = noticeDetail?.contentType && noticeCodeWidthTitle[noticeDetail.contentType];
  if (isNotice) return isNotice;
  switch (pmsg.contentType) {
    case MessageType.TEXTMESSAGE:
      return pmsg.content;
    case MessageType.EDITMESSAGE:
      const cItem = JSON.parse(JSON.parse(pmsg.content).data);
      return cItem.newContent;
    case MessageType.ATTEXTMESSAGE:
      let mstr = pmsg.atElem.text ?? "";
      const pattern = /@\S+\s/g;
      const arr = mstr.match(pattern);
      arr?.map((a) => {
        const member = (pmsg.atElem.atUsersInfo ?? []).find((gm) => gm.atUserID === a.slice(1, -1));
        if (member) {
          mstr = mstr.replaceAll(a, `@${member.groupNickname} `);
        }
      });
      return mstr;
    case MessageType.PICTUREMESSAGE:
      return t("PictureMessage");
    case MessageType.VIDEOMESSAGE:
      return t("VideoMessage");
    case MessageType.VOICEMESSAGE:
      return t("VoiceMessage");
    case MessageType.LOCATIONMESSAGE:
      return t("LocationMessage");
    case MessageType.CARDMESSAGE:
      return t("CardMessage");
    case MessageType.MERGERMESSAGE:
      return t("MergeMessage");
    case MessageType.FILEMESSAGE:
      return t("FileMessage") + pmsg.fileElem.fileName;
    case MessageType.REVOKEMESSAGE:
    case MessageType.ADVANCEREVOKEMESSAGE:
      let revoker = isSelf(pmsg.sendID) ? t("You") : pmsg.senderNickname;
      let sourcer = "";
      const isAdvanced = pmsg.contentType === MessageType.ADVANCEREVOKEMESSAGE;
      let isAdminRevoke = false;
      if (isAdvanced) {
        const data = JSON.parse(pmsg.content);
        revoker = isSelf(data.revokerID) ? t("You") : data.revokerNickname;
        sourcer = isSelf(data.sourceMessageSendID) ? t("You") : data.sourceMessageSenderNickname;
        isAdminRevoke = data.revokerID !== data.sourceMessageSendID;
      }
      return `${revoker}${isAdminRevoke ? t("RevokeMessageAdvanced", { name: sourcer }) : t("RevokeMessage")}`;
    case MessageType.CUSTOMMESSAGE:
      const customEl = pmsg.customElem;
      try {
        const customData = JSON.parse(customEl.data);
        if (customData.customType) {
          return switchCustomMsg(customData, isSelf(pmsg.sendID));
        }
      } catch (error) {}
      return t("CustomMessage");
    case MessageType.QUOTEMESSAGE:
      return t("QuoteMessage");
    case MessageType.FACEMESSAGE:
      return t("FaceMessage");
    case MessageType.FRIENDADDED:
      return t("AlreadyFriend");
    case MessageType.MEMBERENTER:
      const enterDetails = JSON.parse(pmsg.notificationElem.detail);
      const enterUser = enterDetails.entrantUser;
      return `${isSelf(enterUser.userID) ? t("You") : enterUser.nickname}${t("JoinedGroup")}`;
    case MessageType.GROUPCREATED:
      const groupCreatedDetail = JSON.parse(pmsg.notificationElem.detail);
      const groupCreatedUser = groupCreatedDetail.opUser;
      return `${isSelf(groupCreatedUser.userID) ? t("You") : groupCreatedUser.nickname}${t("GroupCreated")}`;
    case MessageType.MEMBERINVITED:
      const inviteDetails = JSON.parse(pmsg.notificationElem.detail);
      const inviteOpUser = inviteDetails.opUser;
      const invitedUserList = inviteDetails.invitedUserList ?? [];
      let inviteStr = "";
      invitedUserList.forEach((user: any, idx: number) => idx < 3 && (inviteStr += (isSelf(user.userID) ? t("You") : user.nickname) + " "));
      return `${isSelf(inviteOpUser.userID) ? t("You") : inviteOpUser.nickname}${t("Invited")}${inviteStr}${invitedUserList.length > 3 ? t("Etc") : ""}${t("IntoGroup")}`;
    case MessageType.MEMBERKICKED:
      const kickDetails = JSON.parse(pmsg.notificationElem.detail);
      const kickOpUser = kickDetails.opUser;
      const kickdUserList = kickDetails.kickedUserList ?? [];
      let kickStr = "";
      kickdUserList.forEach((user: any) => (kickStr += (isSelf(user.userID) ? t("You") : user.nickname) + " "));
      return `${isSelf(kickOpUser.userID) ? t("You") : kickOpUser.nickname}${t("Kicked")}${kickStr}${t("OutGroup")}`;
    case MessageType.MEMBERQUIT:
      const quitDetails = JSON.parse(pmsg.notificationElem.detail);
      const quitUser = quitDetails.quitUser;
      return `${isSelf(quitUser.userID) ? t("You") : quitUser.nickname}${t("QuitedGroup")}`;
    case MessageType.GROUPINFOUPDATED:
      const groupUpdateDetail = JSON.parse(pmsg.notificationElem.detail);
      const groupUpdateUser = groupUpdateDetail.opUser;
      if (groupUpdateDetail.group.notification) {
        return (isSelf(groupUpdateUser.userID) ? t("You") : groupUpdateUser.nickname) + t("ModifiedGroupNotice");
      }
      return `${isSelf(groupUpdateUser.userID) ? t("You") : groupUpdateUser.nickname}${t("ModifiedGroup")}`;
    case MessageType.GROUPOWNERTRANSFERRED:
      const transferDetails = JSON.parse(pmsg.notificationElem.detail);
      const transferOpUser = transferDetails.opUser;
      const newOwner = transferDetails.newGroupOwner;
      return `${isSelf(transferOpUser.userID) ? t("You") : transferOpUser.nickname}${t("TransferTo")}${isSelf(newOwner.userID) ? t("You") : newOwner.nickname}`;
    case MessageType.GROUPDISMISSED:
      const dismissDetails = JSON.parse(pmsg.notificationElem.detail);
      const dismissUser = dismissDetails.opUser;
      return `${isSelf(dismissUser.userID) ? t("You") : dismissUser.nickname}${t("DismissedGroup")}`;
    case MessageType.GROUPMUTED:
      const GROUPMUTEDDetails = JSON.parse(pmsg.notificationElem.detail);
      const groupMuteOpUser = GROUPMUTEDDetails.opUser;
      return `${isSelf(groupMuteOpUser.userID) ? t("You") : groupMuteOpUser.nickname}${t("MuteGroup")}`;
    case MessageType.GROUPCANCELMUTED:
      const GROUPCANCELMUTEDDetails = JSON.parse(pmsg.notificationElem.detail);
      const groupCancelMuteOpUser = GROUPCANCELMUTEDDetails.opUser;
      return `${isSelf(groupCancelMuteOpUser.userID) ? t("You") : groupCancelMuteOpUser.nickname}${t("CancelMuteGroup")}`;
    case MessageType.GROUPMEMBERMUTED:
      const gmMutedDetails = JSON.parse(pmsg.notificationElem.detail);
      const gmMuteOpUser = isSelf(gmMutedDetails.opUser.userID) ? t("You") : gmMutedDetails.opUser.nickname;
      const mutedUser = isSelf(gmMutedDetails.mutedUser.userID) ? t("You") : gmMutedDetails.mutedUser.nickname;
      const muteTime = sec2Time(gmMutedDetails.mutedSeconds);
      return t("MuteMemberGroup", { opUser: gmMuteOpUser, muteUser: mutedUser, muteTime });
    case MessageType.GROUPMEMBERCANCELMUTED:
      const gmcMutedDetails = JSON.parse(pmsg.notificationElem.detail);
      const gmcMuteOpUser = isSelf(gmcMutedDetails.opUser.userID) ? t("You") : gmcMutedDetails.opUser.nickname;
      const cmuteUser = isSelf(gmcMutedDetails.mutedUser.userID) ? t("You") : gmcMutedDetails.mutedUser.nickname;
      return t("CancelMuteMemberGroup", { cmuteUser, opUser: gmcMuteOpUser });
    case MessageType.NOTIFICATION:
      const customNoti = JSON.parse(pmsg.notificationElem.detail);
      return customNoti.text;
    case MessageType.BURNMESSAGECHANGE:
      const burnDetails = JSON.parse(pmsg.notificationElem.detail);
      return burnDetails.isPrivate ? t("BurnOn") : t("BurnOff");
    default:
      return pmsg.notificationElem.defaultTips;
    // return JSON.parse(pmsg.content).defaultTips;
  }
};

export const getNotification = (cb?: () => void) => {
  if (Notification && (Notification.permission === "default" || Notification.permission === "denied")) {
    Notification.requestPermission((permission) => {
      if (permission === "granted") {
        cb && cb();
      }
    });
  } else {
    cb && cb();
  }
};

export const createNotification = async (message: MessageItem, click?: (id: string, type: SessionType) => void, tag?: string) => {
  if (Notification && document.hidden) {
    let title = message.senderNickname;
    if (message.contentType === MessageType.FRIENDADDED) {
      title = t("FriendNotice");
    }
    const groupNoticeTypes = [
      MessageType.GROUPCREATED,
      MessageType.GROUPDISMISSED,
      MessageType.GROUPCANCELMUTED,
      MessageType.GROUPDISMISSED,
      MessageType.GROUPMEMBERCANCELMUTED,
      MessageType.GROUPINFOUPDATED,
      MessageType.GROUPMEMBERMUTED,
      MessageType.GROUPMUTED,
      MessageType.GROUPOWNERTRANSFERRED,
      MessageType.MEMBERQUIT,
      MessageType.MEMBERENTER,
      MessageType.MEMBERINVITED,
      MessageType.MEMBERKICKED,
    ];
    if (groupNoticeTypes.includes(message.contentType)) {
      const el = JSON.parse(message.notificationElem.detail);
      title = el?.group?.groupName ?? "群组通知";
      if (!el?.group?.groupName && el?.group?.groupID) {
        try {
          const { data } = await im.getGroupsInfo([el?.group?.groupID]);
          title = JSON.parse(data)[0].groupName;
        } catch (error) {}
      }
    }
    const notification = new Notification(title, {
      dir: "auto",
      tag: tag ?? (message.groupID ? message.groupID : message.sendID),
      renotify: true,
      icon: message.senderFaceUrl,
      body: parseMessageType(message, undefined, true),
      requireInteraction: true,
    });
    const id = message.sessionType === SessionType.Single ? (message.contentType === MessageType.FRIENDADDED ? message.recvID : message.sendID) : message.groupID;
    notification.onclick = () => {
      click && click(id, message.sessionType);
      notification.close();
    };
  }
};

export const cveSort = (cveList: ConversationItem[]) => {
  const arr: string[] = [];
  const filterArr = cveList.filter((c) => !arr.includes(c.conversationID) && arr.push(c.conversationID));
  filterArr.sort((a, b) => {
    if (a.isPinned === b.isPinned) {
      const aCompare = a.draftTextTime! > a.latestMsgSendTime! ? a.draftTextTime! : a.latestMsgSendTime!;
      const bCompare = b.draftTextTime! > b.latestMsgSendTime! ? b.draftTextTime! : b.latestMsgSendTime!;
      if (aCompare > bCompare) {
        return -1;
      } else if (aCompare < bCompare) {
        return 1;
      } else {
        return 0;
      }
    } else if (a.isPinned && !b.isPinned) {
      return -1;
    } else {
      return 1;
    }
  });
  return filterArr;
};

export const isNotify = (type: SessionType) => type === SessionType.Notification;

export const isFileDownloaded = (msgid: string) => {
  const IMFileMap = JSON.parse(localStorage.getItem("IMFileMap") ?? "{}");
  const item = IMFileMap[msgid];
  return item && item.status === "completed" && window.electron.fileExists(item.path) ? item.path : "";
};

export const isShowProgress = (type: MessageType) => {
  const List = [MessageType.FILEMESSAGE, MessageType.PICTUREMESSAGE, MessageType.VIDEOMESSAGE];
  return List.includes(type);
};

export const initEmoji = (userID: string) => {
  if (!localStorage.getItem("userEmoji")) {
    localStorage.setItem("userEmoji", JSON.stringify([]));
  }
  const userEmojiInfo = {
    userID,
    emoji: [],
  };
  const allUserEmoji = JSON.parse(localStorage.getItem("userEmoji")!);
  const flag = allUserEmoji.some((item: any) => item?.userID === userID);
  if (!flag) {
    localStorage.setItem("userEmoji", JSON.stringify([...allUserEmoji, userEmojiInfo]));
  }
};

export const updateCommonContacts = async (user: CommonContacts) => {
  if (!user.userID) return;
  const commonContacts: CommonContacts[] = (await localforage.getItem(`${store.getState().user.selfInfo.userID}CommonContacts`)) ?? [];
  const idx = commonContacts.findIndex((c) => c.userID === user.userID);
  if (idx === -1) {
    localforage.setItem(`${store.getState().user.selfInfo.userID}CommonContacts`, [user, ...commonContacts]);
  }
};

export const getApplicationIsReaded = async (application: GroupApplicationItem | FriendApplicationItem) => {
  if ((application as GroupApplicationItem).groupID) {
    const tmpApplication = application as GroupApplicationItem;
    const sourceID = `${tmpApplication.userID}_${tmpApplication.groupID}_${tmpApplication.reqTime}`;
    const accessedApplications: string[] = (await localforage.getItem(`${store.getState().user.selfInfo.userID}AccessedGroupApplications`)) ?? [];
    return accessedApplications.find((item) => item === sourceID);
  } else {
    const tmpApplication = application as FriendApplicationItem;
    const sourceID = `${tmpApplication.fromUserID}_${tmpApplication.toUserID}_${tmpApplication.createTime}`;
    const accessedApplications: string[] = (await localforage.getItem(`${store.getState().user.selfInfo.userID}AccessedFriendApplications`)) ?? [];
    return accessedApplications.find((item) => item === sourceID);
  }
};

export const updateReadedApplications = async (applications: GroupApplicationItem[] | FriendApplicationItem[]) => {
  if (applications.length === 0) return;
  const sourceIDList = applications.map((application: any) =>
    application.groupID ? `${application.userID}_${application.groupID}_${application.reqTime}` : `${application.fromUserID}_${application.toUserID}_${application.createTime}`
  );
  if ((applications[0] as GroupApplicationItem).groupID) {
    const accessedApplications: string[] = (await localforage.getItem(`${store.getState().user.selfInfo.userID}AccessedGroupApplications`)) ?? [];
    const needStore = sourceIDList.filter((item) => !accessedApplications.includes(item));
    await localforage.setItem(`${store.getState().user.selfInfo.userID}AccessedGroupApplications`, [...needStore, ...accessedApplications]);
  } else {
    const accessedApplications: string[] = (await localforage.getItem(`${store.getState().user.selfInfo.userID}AccessedFriendApplications`)) ?? [];
    const needStore = sourceIDList.filter((item) => !accessedApplications.includes(item));
    await localforage.setItem(`${store.getState().user.selfInfo.userID}AccessedFriendApplications`, [...needStore, ...accessedApplications]);
  }
};

export const getCommonContacts = async () => {
  // if (window.electron) {
  //   return getAllDataInLocalStorage('CommonContacts');
  // }
  return (await localforage.getItem(`${store.getState().user.selfInfo.userID}CommonContacts`)) ?? [];
};
