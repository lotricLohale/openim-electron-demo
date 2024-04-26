import { FC, memo, useEffect, useRef, useState, useMemo } from "react";
import { useSelector, shallowEqual } from "react-redux";
import { RootState } from "../../../store";
import { diffMemo, events, im, isSingleCve, sec2Time } from "../../../utils";
import ScrollView from "../../../components/ScrollView";
import { CVE_CONTENT_RENDER, MSG_FORCE_RENDER, MUTIL_MSG, SHOW_LOCATION_MODAL } from "../../../constants/events";
import MsgItem from "./MsgItem/MsgItem";
import { useTranslation } from "react-i18next";
import { ConversationItem, GroupAtType, MessageItem, MessageType, PictureElem, SessionType } from "../../../utils/open_im_sdk/types";
import { RevokeTypes, TipsType } from "../../../constants/messageContentType";
import { isNotify } from "../../../utils/im";
import { LngLat } from "react-amap";
import LocationModal from "../components/Modal/LocationModal";
import { useUpdate } from "ahooks";
import group_notify from "@/assets/images/group_notify.png";
import { CloseOutlined } from "@ant-design/icons";

type ChatContentProps = {
  msgList: MessageItem[];
  loadMore: (uid?: string, gid?: string, sMsg?: any, cveID?: string, lastMinSeq?: number) => void;
  hasMore: boolean;
  curCve?: ConversationItem;
  loading: boolean;
  merID?: string;
  flag?: string;
  isMerge?: boolean;
  lastMinSeq?: number;
};

const ParseTip = ({ msg, curCve, isSelf }: { msg: MessageItem; isSelf: (id: string) => boolean; curCve: ConversationItem }): JSX.Element => {
  const { t } = useTranslation();

  if (RevokeTypes.includes(msg.contentType)) {
    let revokerID = msg.sendID;
    let revoker = isSelf(msg.sendID) ? t("You") : isSingleCve(curCve!) ? curCve?.showName : msg.senderNickname;
    let sourcer = "";
    const isAdvanced = msg.contentType === MessageType.ADVANCEREVOKEMESSAGE;
    let isAdminRevoke = false;
    if (isAdvanced) {
      const data = JSON.parse(msg.content);
      revokerID = data.revokerID;
      revoker = isSelf(data.revokerID) ? t("You") : isSingleCve(curCve!) ? curCve?.showName : data.revokerNickname;
      sourcer = isSelf(data.sourceMessageSendID) ? t("You") : data.sourceMessageSenderNickname;
      isAdminRevoke = data.revokerID !== data.sourceMessageSendID;
    }
    return (
      <>
        <b>{revoker}</b>
        {isAdminRevoke ? t("RevokeMessageAdvanced", { name: sourcer }) : t("RevokeMessage")}
      </>
    );
  }
  switch (msg.contentType) {
    case MessageType.FRIENDADDED:
      return t("AlreadyFriend");
    case MessageType.GROUPCREATED:
      const groupCreatedDetail = JSON.parse(msg.notificationElem.detail);
      const groupCreatedUser = groupCreatedDetail.opUser;
      return (
        <>
          <b>{isSelf(groupCreatedUser.userID) ? t("You") : groupCreatedUser.nickname}</b>
          {t("GroupCreated")}
        </>
      );
    case MessageType.GROUPINFOUPDATED:
      const groupUpdateDetail = JSON.parse(msg.notificationElem.detail);
      const groupUpdateUser = groupUpdateDetail.opUser;
      return (
        <>
          <b>{isSelf(groupUpdateUser.userID) ? t("You") : groupUpdateUser.nickname}</b>
          {t("ModifiedGroup")}
        </>
      );
    case MessageType.GROUPOWNERTRANSFERRED:
      const transferDetails = JSON.parse(msg.notificationElem.detail);
      const transferOpUser = transferDetails.opUser;
      const newOwner = transferDetails.newGroupOwner;
      return (
        <>
          <b>{isSelf(transferOpUser.userID) ? t("You") : transferOpUser.nickname}</b>
          {t("TransferTo")}
          <b>{isSelf(newOwner.userID) ? t("You") : newOwner.nickname}</b>
        </>
      );
    case MessageType.MEMBERQUIT:
      const quitDetails = JSON.parse(msg.notificationElem.detail);
      const quitUser = quitDetails.quitUser;
      return (
        <>
          <b>{isSelf(quitUser.userID) ? t("You") : quitUser.nickname}</b>
          {t("QuitedGroup")}
        </>
      );
    case MessageType.MEMBERINVITED:
      const inviteDetails = JSON.parse(msg.notificationElem.detail);
      const inviteOpUser = inviteDetails.opUser;
      const invitedUserList = inviteDetails.invitedUserList ?? [];
      let inviteUsers: any[] = [];
      invitedUserList.forEach((user: any, idx: number) => {
        if (idx < 3) {
          inviteUsers.push(<b key={user.userID}>{(isSelf(user.userID) ? t("You") : user.nickname) + (idx === invitedUserList.length - 1 || idx === 2 ? " " : "、")}</b>);
        }
      });
      return (
        <>
          <b>{isSelf(inviteOpUser.userID) ? t("You") : inviteOpUser.nickname}</b>
          {t("Invited")}
          {inviteUsers.map((user) => user)}
          {(invitedUserList.length > 3 ? t("Etc") : "") + t("IntoGroup")}
        </>
      );
    case MessageType.MEMBERKICKED:
      const kickDetails = JSON.parse(msg.notificationElem.detail);
      const kickOpUser = kickDetails.opUser;
      const kickdUserList = kickDetails.kickedUserList ?? [];
      let kickUsers: any[] = [];
      kickdUserList.forEach((user: any, idx: number) =>
        kickUsers.push(<b key={user.userID}>{(isSelf(user.userID) ? t("You") : user.nickname) + (idx === kickdUserList.length - 1 ? " " : "、")}</b>)
      );
      return (
        <>
          <b>{isSelf(kickOpUser.userID) ? t("You") : kickOpUser.nickname}</b>
          {t("Kicked")}
          {kickUsers.map((user) => user)}
          {t("OutGroup")}
        </>
      );
    case MessageType.MEMBERENTER:
      const enterDetails = JSON.parse(msg.notificationElem.detail);
      const enterUser = enterDetails.entrantUser;
      return (
        <>
          <b>{isSelf(enterUser.userID) ? t("You") : enterUser.nickname}</b>
          {t("JoinedGroup")}
        </>
      );
    case MessageType.GROUPDISMISSED:
      const dismissDetails = JSON.parse(msg.notificationElem.detail);
      const dismissUser = dismissDetails.opUser;
      return (
        <>
          <b>{isSelf(dismissUser.userID) ? t("You") : dismissUser.nickname}</b>
          {t("DismissedGroup")}
        </>
      );
    case MessageType.GROUPMUTED:
      const GROUPMUTEDDetails = JSON.parse(msg.notificationElem.detail);
      const groupMuteOpUser = GROUPMUTEDDetails.opUser;
      return `${isSelf(groupMuteOpUser.userID) ? t("You") : groupMuteOpUser.nickname}${t("MuteGroup")}` as unknown as JSX.Element;
    case MessageType.GROUPCANCELMUTED:
      const GROUPCANCELMUTEDDetails = JSON.parse(msg.notificationElem.detail);
      const groupCancelMuteOpUser = GROUPCANCELMUTEDDetails.opUser;
      return `${isSelf(groupCancelMuteOpUser.userID) ? t("You") : groupCancelMuteOpUser.nickname}${t("CancelMuteGroup")}` as unknown as JSX.Element;
    case MessageType.GROUPMEMBERMUTED:
      const gmMutedDetails = JSON.parse(msg.notificationElem.detail);
      const gmMuteOpUser = isSelf(gmMutedDetails.opUser.userID) ? t("You") : gmMutedDetails.opUser.nickname;
      const mutedUser = isSelf(gmMutedDetails.mutedUser.userID) ? t("You") : gmMutedDetails.mutedUser.nickname;
      const muteTime = sec2Time(gmMutedDetails.mutedSeconds);
      return t("MuteMemberGroup", { opUser: gmMuteOpUser, muteUser: mutedUser, muteTime });
    case MessageType.GROUPMEMBERCANCELMUTED:
      const gmcMutedDetails = JSON.parse(msg.notificationElem.detail);
      const gmcMuteOpUser = isSelf(gmcMutedDetails.opUser.userID) ? t("You") : gmcMutedDetails.opUser.nickname;
      const cmuteUser = isSelf(gmcMutedDetails.mutedUser.userID) ? t("You") : gmcMutedDetails.mutedUser.nickname;
      return t("CancelMuteMemberGroup", { cmuteUser, opUser: gmcMuteOpUser });
    case MessageType.BURNMESSAGECHANGE:
      const burnDetails = JSON.parse(msg.notificationElem.detail);
      return burnDetails.isPrivate ? t("BurnOn") : t("BurnOff");
    default:
      return msg.notificationElem.defaultTips as unknown as JSX.Element;
  }
};

const MemoParse = memo(ParseTip, () => true);

const ChatContent: FC<ChatContentProps> = (props) => {
  const { merID, msgList, loadMore, hasMore, curCve, loading, flag, isMerge, lastMinSeq } = props;
  const [mutilSelect, setMutilSelect] = useState(false);
  const [showLocation, setShowLocation] = useState({
    state: false,
    position: null as unknown as LngLat,
  });
  const selectValue = (state: RootState) => state.user.selfInfo;
  const selfID = useSelector(selectValue, shallowEqual).userID!;
  const robots = useSelector((state: RootState) => state.user.appConfig.robots, shallowEqual) || [];
  const audioRef = useRef<HTMLAudioElement>(null);
  const update = useUpdate();

  const isRobot = useMemo(() => robots.includes(curCve?.userID ?? ""), [curCve?.userID, robots]);

  useEffect(() => {
    events.on(MUTIL_MSG, mutilHandler);
    events.on(SHOW_LOCATION_MODAL, showLocationModal);
    events.on(CVE_CONTENT_RENDER, reRenderHandler);
    return () => {
      events.off(MUTIL_MSG, mutilHandler);
      events.off(SHOW_LOCATION_MODAL, showLocationModal);
      events.off(CVE_CONTENT_RENDER, reRenderHandler);
    };
  }, []);

  const reRenderHandler = (cid: string) => {
    update();
    setTimeout(() => events.emit(MSG_FORCE_RENDER, cid));
  };

  const mutilHandler = (flag: boolean) => {
    setMutilSelect(flag);
  };

  const isSelf = (id: string) => id === selfID;

  const nextFuc = () => {
    console.log(lastMinSeq);

    // loadMore(curCve?.userID, curCve?.groupID,!isNotify(curCve!.conversationType) ? msgList[msgList.length - 1] : msgList[0], curCve?.conversationID);
    loadMore(curCve?.userID, curCve?.groupID, msgList[msgList.length - 1], curCve?.conversationID, lastMinSeq);
  };

  const showLocationModal = (position: LngLat) => {
    setShowLocation({ state: true, position });
  };

  const closeLocation = () => {
    setShowLocation({ state: false, position: null as unknown as LngLat });
  };

  const notGroupNotice = (msg: MessageItem) => {
    if (msg.contentType !== MessageType.GROUPINFOUPDATED) {
      return true;
    }
    const detail = JSON.parse(msg.notificationElem.detail);
    return detail.group.notification === undefined;
  };

  return (
    <div style={{ padding: isMerge ? "24px" : "0" }} className="chat_bg">
      <ScrollView tip={null} reverse={!isNotify(curCve!.conversationType)} holdHeight={30} loading={loading} data={msgList} fetchMoreData={nextFuc} hasMore={hasMore}>
        {msgList?.map((msg) => {
          console.log("msgList", msg);
          return TipsType.includes(msg.contentType) && notGroupNotice(msg) ? (
            <div key={msg.clientMsgID} className="chat_bg_tips">
              <MemoParse msg={msg} isSelf={isSelf} curCve={curCve!} />
            </div>
          ) : (
            <MsgItem
              isRobot={isRobot}
              isMerge={isMerge}
              audio={audioRef}
              flag={flag}
              key={msg.clientMsgID}
              mutilSelect={mutilSelect}
              msg={msg}
              selfID={merID ?? selfID}
              curCve={curCve!}
            />
          );
        })}
      </ScrollView>
      <audio ref={audioRef} />
      {curCve?.groupAtType === GroupAtType.AtGroupNotice && <NoticeCard conversationID={curCve.conversationID} />}
      {showLocation.state && <LocationModal position={showLocation.position} isModalVisible={showLocation.state} close={closeLocation} />}
    </div>
  );
};

const diffKey = ["merID", "loading", "hasMore", "flag", "msgList", "lastMinSeq"];
const deepKey = ["conversationID", "showName", "faceURL", "groupAtType"];
export default memo(ChatContent, (p, n) => {
  const shallowFlag = diffMemo(p, n, diffKey);
  const deepFlag = diffMemo(p.curCve, n.curCve, deepKey);
  return shallowFlag && deepFlag;
});

const NoticeCard = memo(({ conversationID }: { conversationID: string }) => {
  const groupInfo = useSelector((state: RootState) => state.contacts.groupInfo, shallowEqual);

  const resetGroupAt = () => {
    im.resetConversationGroupAtType(conversationID);
  };

  return (
    <div className="group_notice_card">
      <div className="top_title">
        <div className="left_content">
          <img src={group_notify} />
          <span>群公告</span>
        </div>
        <CloseOutlined onClick={resetGroupAt} />
      </div>
      <div className="notice_content">{groupInfo.notification}</div>
      {/* <div className="bottom_info">
        <MyAvatar size={20} />
        <span>历史</span>
      </div> */}
    </div>
  );
});
