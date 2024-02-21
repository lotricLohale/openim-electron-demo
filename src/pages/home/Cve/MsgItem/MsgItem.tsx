import { LoadingOutlined, ExclamationCircleFilled } from "@ant-design/icons";
import { Spin, Checkbox, Popover, message, Tooltip } from "antd";
import { FC, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import MyAvatar from "../../../../components/MyAvatar";
import { diffMemo, events, formatDate, im, isSingleCve, parseTime } from "../../../../utils";
import { AT_STATE_UPDATE, DELETE_MESSAGE, MSG_FORCE_RENDER, MSG_UPDATE, MUTIL_MSG_CHANGE } from "../../../../constants/events";
import { useInViewport, useLatest, useLongPress, useMount, useUnmount, useUpdate, useUpdateEffect } from "ahooks";
import SwitchMsgType from "./SwitchMsgType/SwitchMsgType";
import MsgMenu from "./MsgMenu/MsgMenu";
import { useTranslation } from "react-i18next";
import {
  AllowType,
  ConversationItem,
  GetGroupMemberByTimeParams,
  GroupMemberItem,
  MessageItem,
  MessageStatus,
  MessageType,
  PictureElem,
  SessionType,
} from "../../../../utils/open_im_sdk/types";
import { shallowEqual, useSelector } from "react-redux";
import { RootState } from "../../../../store";
import { DetailType } from "../../../../@types/open_im";
import useTimer from "../../../../utils/hooks/useTimer";
import { isNotify, isShowProgress } from "../../../../utils/im";
import { customType, GroupTypes, sendMessageErrorType } from "../../../../constants/messageContentType";
import List from "rc-virtual-list";
import noti_icon from "@/assets/images/cve_noti.png";
import { throttle } from "throttle-debounce";

type MsgItemProps = {
  msg: MessageItem;
  selfID: string;
  flag?: string;
  audio: React.RefObject<HTMLAudioElement>;
  curCve: ConversationItem;
  mutilSelect?: boolean;
  isMerge?: boolean;
  isRobot: boolean;
};

const canSelectTypes = [
  MessageType.TEXTMESSAGE,
  MessageType.ATTEXTMESSAGE,
  MessageType.PICTUREMESSAGE,
  MessageType.VIDEOMESSAGE,
  MessageType.VOICEMESSAGE,
  MessageType.CARDMESSAGE,
  MessageType.FILEMESSAGE,
  MessageType.LOCATIONMESSAGE,
  MessageType.FACEMESSAGE,
];

const MsgItem: FC<MsgItemProps> = (props) => {
  const { msg, curCve, mutilSelect, selfID, audio, isRobot, isMerge = false } = props;
  const selfName = useSelector((state: RootState) => state.user.selfInfo.nickname, shallowEqual);
  const groupInfo = useSelector((state: RootState) => state.contacts.groupInfo, shallowEqual);
  const [lastChange, setLastChange] = useState(false);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const avaRef = useRef<HTMLDivElement>(null);
  const msgItemRef = useRef<HTMLDivElement>(null);
  const [inViewport] = useInViewport(msgItemRef);
  const { t } = useTranslation();
  const isSingle = useRef<boolean>(isSingleCve(curCve));

  const update = useUpdate();

  const isNoti = useMemo(() => isNotify(curCve!.conversationType), []);

  useEffect(() => {
    events.on(MSG_FORCE_RENDER, msgRendrHander);
    return () => {
      events.off(MSG_FORCE_RENDER, msgRendrHander);
    };
  }, []);

  const msgRendrHander = (cid: string) => {
    if (msg.clientMsgID === cid) {
      update();
    }
  };

  useEffect(() => {
    if (lastChange) {
      setLastChange(false);
    }
  }, [mutilSelect]);

  useEffect(() => {
    if (inViewport && curCve.userID === msg.sendID && !msg.isRead && !isNoti) {
      markC2CHasRead(msg.sendID, msg.clientMsgID);
    }
    if (
      inViewport &&
      curCve.groupID === msg.groupID &&
      curCve.groupID !== "" &&
      !msg.isRead &&
      msg.sendID !== selfID &&
      msg.contentType !== MessageType.GROUPINFOUPDATED &&
      !isNoti
    ) {
      markGroupC2CHasRead();
    }
  }, [inViewport, msg.isRead]);

  const isSelf = (sendID: string): boolean => {
    return selfID === sendID;
  };

  const switchOnline = (oType: string, details?: DetailType[]) => {
    switch (oType) {
      case "offline":
        return t("Offline");
      case "online":
        let str = "";
        details?.map((detail) => {
          if (detail.status === "online") {
            str += `${detail.platform}/`;
          }
        });
        return `${str.slice(0, -1)} ${t("Online")}`;
      default:
        return "";
    }
  };

  const markC2CHasRead = (userID: string, msgID: string) => {
    im.markC2CMessageAsRead({ userID, msgIDList: [msgID] }).then(() => {
      msg.isRead = true;
      update();
    });
  };

  const markGroupC2CHasRead = () => {
    im.markGroupMessageAsRead({ groupID: curCve.groupID, msgIDList: [msg.clientMsgID] }).then(() => (msg.isRead = true));
  };

  const switchStyle = useMemo(
    () =>
      isSelf(msg.sendID)
        ? {
            marginLeft: "12px",
          }
        : {
            marginRight: "12px",
          },
    []
  );

  const mutilCheckItem = () => {
    const els = document.querySelectorAll(".ant-checkbox-wrapper-checked");
    if (els.length >= 20) {
      message.info(t("MergeTip"));
      return;
    }
    if (mutilSelect && canSelectTypes.includes(msg.contentType)) {
      events.emit(MUTIL_MSG_CHANGE, !lastChange, msg);
      setLastChange((v) => !v);
    }
  };

  const avatarLongPress = () => {
    if (!isSingle.current) {
      events.emit(AT_STATE_UPDATE, msg.sendID, msg.senderNickname);
    }
  };

  useLongPress(avatarLongPress, avaRef, {
    onClick: () => {
      if (msg.sessionType !== SessionType.Notification) {
        if (msg.sessionType !== SessionType.Single && groupInfo.groupID === msg.groupID && groupInfo.lookMemberInfo === AllowType.NotAllowed) {
          return;
        }
        window.userClick(msg.sendID, msg.groupID, groupInfo?.applyMemberFriend);
      }
    },
    delay: 500,
  });

  const menuVisibleChange = useCallback((v: boolean) => setContextMenuVisible(v), []);

  const switchFaceUrl = useMemo(() => {
    if (isNoti) {
      return noti_icon;
    }
    if (msg.contentType === MessageType.GROUPINFOUPDATED) {
      return JSON.parse(msg.notificationElem.detail).opUser.faceURL;
    }
    return msg.senderFaceUrl;
  }, []);

  const SenderFace = useMemo(
    () => (
      <div className="cs">
        <div ref={avaRef}>
          <MyAvatar className="chat_bg_msg_icon" size={42} src={switchFaceUrl} />
        </div>
      </div>
    ),
    []
  );

  const contentStyle = useMemo(() => (isNoti ? { width: "90%" } : { maxWidth: "80%" }), []);

  const notificationDetail = useMemo(() => (isNoti ? JSON.parse(msg.notificationElem.detail) : {}), []);

  const MsgNameAndTime = useMemo(() => {
    const switchName = () => {
      if (msg.contentType === MessageType.GROUPINFOUPDATED) {
        return JSON.parse(msg.notificationElem.detail).opUser.nickname;
      }
      const isSelfMsg = msg.sendID === selfID;
      switch (msg.sessionType) {
        case SessionType.Single:
          return isSelfMsg ? selfName : curCve.showName;
        case SessionType.Group:
        case SessionType.SuperGroup:
          return msg.senderNickname;
        case SessionType.Notification:
          return notificationDetail.notificationName;
        default:
          return "";
      }
    };

    const getSendTime = parseTime(msg.sendTime, true);

    const InnerStyle = {
      minHeight: "24px",
      padding: "0 4px",
    };

    return (
      <div className={`msg_top_info ${msg.sendID === selfID ? "msg_top_info_reverse" : ""}`}>
        <Tooltip overlayInnerStyle={InnerStyle} title={switchName()}>
          <div>{switchName()}</div>
        </Tooltip>
        <div className="send_time">{getSendTime}</div>
      </div>
    );
  }, [msg.senderNickname, msg.sessionType]);

  const showFailedTip = () => {
    if (props.msg.errCode === sendMessageErrorType.NotFriend) {
      return (
        <div className="send_failed_tip">
          对方开启了好友验证，你还不是他（她）好友。请先发送好友验证，对方验证通过后，才能聊天。
          <span
            onClick={() => {
              window.userClick(curCve.userID);
            }}
          >
            发送好友验证
          </span>
        </div>
      );
    }
    if (props.msg.errCode === sendMessageErrorType.Blacked) {
      return <div className="send_failed_tip send_failed_tip_blacked">消息已发出，但被对⽅拒收了</div>;
    }
    return null;
  };

  return (
    <div
      ref={msgItemRef}
      id={"chat_" + msg.clientMsgID}
      onClick={mutilCheckItem}
      data-time={isNoti ? parseTime(msg.sendTime, true) : ""}
      className={`chat_bg_msg ${isSelf(msg.sendID) ? "chat_bg_omsg" : isNoti ? "group_noti_msg" : ""}`}
    >
      {mutilSelect && (
        <div style={switchStyle} className="chat_bg_msg_check">
          <Checkbox disabled={!canSelectTypes.includes(msg.contentType)} checked={lastChange} />
        </div>
      )}
      {SenderFace}
      <div style={contentStyle} className="chat_bg_msg_content">
        {MsgNameAndTime}
        <MsgMenu key={msg.clientMsgID} visible={contextMenuVisible} msg={msg} isSelf={isSelf(msg.sendID)} visibleChange={menuVisibleChange}>
          <SwitchMsgType {...props} msgUploadProgress={msg.progress} msgDownloadProgress={msg.downloadProgress} />
        </MsgMenu>
      </div>
      {showFailedTip()}
      <MemoTipSwich
        msg={msg}
        isRobot={isRobot}
        isPrivateChat={msg.attachedInfoElem.isPrivateChat}
        isRead={msg.isRead}
        status={msg.status}
        hasReadCount={msg.attachedInfoElem.groupHasReadInfo.hasReadCount}
        selfID={selfID}
        isMerge={isMerge}
        isSingle={isSingle.current}
      />
    </div>
  );
};

const deepKey = ["status", "progress", "downloadProgress", "isRead", "sessionType", "contentType", "senderNickname", "errCode"];
export default memo(MsgItem, (p, n) => {
  const shallowFlag = p.mutilSelect === n.mutilSelect && p.isRobot === n.isRobot;
  const deepFlag = diffMemo(p.msg, n.msg, deepKey);
  const attachedInfoFlag =
    p.msg.attachedInfoElem?.groupHasReadInfo?.hasReadCount === n.msg.attachedInfoElem.groupHasReadInfo?.hasReadCount &&
    p.msg.attachedInfoElem?.groupHasReadInfo?.groupMemberCount === n.msg.attachedInfoElem.groupHasReadInfo?.groupMemberCount &&
    p.msg.attachedInfoElem?.isPrivateChat === n.msg.attachedInfoElem.isPrivateChat &&
    p.msg.attachedInfoElem?.burnDuration === n.msg.attachedInfoElem.burnDuration;
  return shallowFlag && deepFlag && attachedInfoFlag;
});

type SwitchTipsProps = {
  msg: MessageItem;
  selfID: string;
  status: number;
  isRead: boolean;
  hasReadCount: number;
  isMerge: boolean;
  isSingle: boolean;
  isPrivateChat: boolean;
  isRobot: boolean;
};

const SwitchTips: FC<SwitchTipsProps> = ({ msg, status, isRead, hasReadCount, selfID, isMerge, isRobot, isPrivateChat, isSingle }) => {
  const [popMenuVisible, setPopMenuVisible] = useState(false);
  const groupInfo = useSelector((state: RootState) => state.contacts.groupInfo, shallowEqual);
  const { time, setTimer, clearTimer } = useTimer();
  const [greadInfo, setGreadInfo] = useState({
    readMemberList: [] as GroupMemberItem[],
    unReadMemberList: [] as GroupMemberItem[],
  });
  const latestGreadInfo = useLatest(greadInfo);
  const unReadState = useRef({
    loading: false,
    hasMore: true,
  });
  const { t } = useTranslation();

  useMount(() => {
    if (isPrivateChat && isRead) {
      setTimer(msg.attachedInfoElem.burnDuration || 30);
    }
  });

  useEffect(() => {
    if (time === 0) {
      clearPrv();
    }
  }, [time]);

  useUnmount(() => {
    if (time !== 0) {
      clearPrv();
    }
    clearTimer();
  });

  useUpdateEffect(() => {
    if (isPrivateChat && isRead) {
      setTimer(msg.attachedInfoElem.burnDuration || 30);
    }
  }, [isRead, msg.attachedInfoElem.burnDuration]);

  // useEffect(() => {
  //   const tmpReadMemberList = [] as GroupMemberItem[];
  //   const tmpUnReadMemberList = [] as GroupMemberItem[];
  //   groupMemberList?.forEach((item) => {
  //     if (msg.attachedInfoElem.groupHasReadInfo.hasReadUserIDList?.includes(item.userID)) {
  //       tmpReadMemberList.push(item);
  //     } else if (item.userID !== selfID) {
  //       tmpUnReadMemberList.push(item);
  //     }
  //   });
  //   setGreadInfo({
  //     readMemberList: tmpReadMemberList,
  //     unReadMemberList: tmpUnReadMemberList,
  //   });
  // }, [groupMemberList, hasReadCount]);

  const isSelf = (sendID: string): boolean => {
    return selfID === sendID;
  };

  const clearPrv = () => {
    if (isPrivateChat) {
      im.deleteMessageFromLocalAndSvr(JSON.stringify(msg)).catch((err) => im.deleteMessageFromLocalStorage(JSON.stringify(msg)));
      events.emit(DELETE_MESSAGE, msg.clientMsgID, false, false);
    }
  };

  const switchIsRead = (unReadCount: number) => {
    if (isMerge || status !== MessageStatus.Succeed || isRobot) return;
    if (isSingle) {
      return <div>{isRead ? t("Readed") : t("UnRead")}</div>;
    } else {
      if (!msg.attachedInfoElem.groupHasReadInfo.groupMemberCount) return null;

      return unReadCount !== 0 ? unReadCount + t("PeopleUnRead") : t("AllReaded");
    }
  };

  const reSendMessage = () => {
    const options = {
      recvID: msg.groupID ? "" : msg.recvID,
      groupID: msg.groupID ?? "",
      message: JSON.stringify(msg),
    };
    msgUpdate(MessageStatus.Sending);
    if (window.electron) {
      im.sendMessage(options)
        .then((res) => msgUpdate())
        .catch((err) => msgUpdate(MessageStatus.Failed));
    } else {
      im.sendMessageNotOss(options)
        .then((res) => msgUpdate())
        .catch((err) => msgUpdate(MessageStatus.Failed));
    }
  };

  const msgUpdate = (status?: MessageStatus) => {
    events.emit(MSG_UPDATE, msg, status);
  };

  const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

  const switchIcon = () => {
    if (isPrivateChat && isRead) {
      return time + "s";
    }

    switch (status) {
      case 1:
        return isShowProgress(msg.contentType) ? null : <Spin indicator={antIcon} />;
      case 3:
        return <ExclamationCircleFilled style={{ color: "#f34037", fontSize: "20px" }} onClick={reSendMessage} />;
      default:
        return null;
    }
  };

  const groupReadPopUpdate = (visible: boolean) => {
    if (visible) {
      getHasReadMemberList();
      getUnReadMemberList();
    }
    setPopMenuVisible(visible);
  };

  const getHasReadMemberList = () => {
    const userIDList = [...(msg.attachedInfoElem.groupHasReadInfo.hasReadUserIDList ?? [])];
    im.getGroupMembersInfo({ groupID: groupInfo.groupID, userIDList }).then(({ data }) => {
      setGreadInfo({
        ...latestGreadInfo.current,
        readMemberList: JSON.parse(data),
      });
    });
  };

  const getUnReadMemberList = () => {
    unReadState.current.loading = true;
    const options: GetGroupMemberByTimeParams = {
      groupID: groupInfo.groupID,
      filterUserIDList: [...(msg.attachedInfoElem.groupHasReadInfo.hasReadUserIDList ?? []), selfID],
      offset: latestGreadInfo.current.unReadMemberList.length,
      count: 20,
      joinTimeBegin: 0,
      joinTimeEnd: msg.sendTime,
    };
    im.getGroupMemberListByJoinTimeFilter(options).then(({ data }) => {
      const list = JSON.parse(data);
      setGreadInfo({
        ...latestGreadInfo.current,
        unReadMemberList: [...latestGreadInfo.current.unReadMemberList, ...list],
      });
      unReadState.current.loading = false;
      unReadState.current.hasMore = list.length === 20;
    });
  };

  const onScroll = (e: any) => {
    const shouldScroll = !unReadState.current.loading && unReadState.current.hasMore;
    if (shouldScroll && e.target.scrollHeight - 360 < e.target.scrollTop) {
      getUnReadMemberList();
    }
  };

  const throttleScroll = throttle(250, onScroll);

  const unReadCount = useMemo(
    () => (isSingle ? 0 : msg.attachedInfoElem.groupHasReadInfo.groupMemberCount - hasReadCount - 1),
    [hasReadCount, msg.attachedInfoElem.groupHasReadInfo.groupMemberCount]
  );

  const UnReadContent = useMemo(
    () => (
      <div className="unReadContent">
        <div className="title">
          <span>{t("MessageRecipientList")}</span>
          {/* <span onClick={offCard}></span> */}
        </div>
        <div className="content">
          <div className="left">
            <span className="tip">{hasReadCount}</span>
            {t("PeopleReaded")}
            <List
              height={300}
              data={greadInfo.readMemberList}
              itemHeight={43}
              itemKey="userID"
              children={(item, idx) => (
                <div className="list_item">
                  <MyAvatar src={item.faceURL} size={38} />
                  <div className="info">
                    <span>{item.nickname}</span>
                  </div>
                </div>
              )}
            />
          </div>
          <div className="right">
            <span className="tip">{unReadCount}</span>
            {t("PeopleUnRead")}
            <List
              height={300}
              data={greadInfo.unReadMemberList}
              itemHeight={43}
              itemKey="userID"
              onScroll={throttleScroll}
              children={(item, idx) => (
                <div className="list_item">
                  <MyAvatar src={item.faceURL} size={38} />
                  <div className="info">
                    <span>{item.nickname}</span>
                  </div>
                </div>
              )}
            />
          </div>
        </div>
      </div>
    ),
    [greadInfo.readMemberList, greadInfo.unReadMemberList, msg.groupID]
  );

  const marginData = ` ${"20px"} ${isSelf(msg.sendID) ? "8px" : "0"} 0 ${isSelf(msg.sendID) ? "0" : "8px"}`;

  let isInsert = false;
  if (msg.customElem.data) {
    try {
      isInsert = JSON.parse(msg.customElem.data).customType === customType.Call;
    } catch (error) {}
  }

  return (
    <>
      {isSelf(msg.sendID) && !isInsert && (
        <div style={{ color: unReadCount === 0 && isRead ? "#999" : "#006AFF" }} className="chat_bg_flag_read">
          <div className="group_UnRead">
            <Popover
              content={UnReadContent}
              visible={isSingle ? false : popMenuVisible}
              onVisibleChange={groupReadPopUpdate}
              trigger="click"
              overlayClassName="unread_card"
              placement="topRight"
            >
              {switchIsRead(unReadCount)}
            </Popover>
          </div>
        </div>
      )}
      <div style={{ margin: marginData }} className="chat_bg_icon">
        {switchIcon()}
      </div>
    </>
  );
};

const MemoTipSwich = memo(SwitchTips, (p, n) => {
  return (
    p.isRead === n.isRead &&
    p.isRobot === n.isRobot &&
    p.status === n.status &&
    p.hasReadCount === n.hasReadCount &&
    p.isPrivateChat === n.isPrivateChat &&
    p.msg.attachedInfoElem?.groupHasReadInfo?.groupMemberCount === n.msg.attachedInfoElem.groupHasReadInfo?.groupMemberCount &&
    p.msg.attachedInfoElem?.groupHasReadInfo?.hasReadUserIDList === n.msg.attachedInfoElem.groupHasReadInfo?.hasReadUserIDList
  );
});
