import { message, Modal } from "antd";
import { LocalParticipant, MediaDeviceFailure, Participant, RemoteParticipant, RoomEvent, Track, VideoPresets } from "livekit-client";
import { useRoom, VideoRenderer } from "livekit-react";
import { useState, useRef, FC, useEffect, memo } from "react";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import { shallowEqual, useSelector } from "react-redux";
import MyAvatar from "../../../components/MyAvatar";
import { RootState } from "../../../store";
import rtc_cancel from "@/assets/images/rtc_cancel.png";
import rtc_access from "@/assets/images/rtc_access.png";
import rtc_voice_ban from "@/assets/images/rtc_voice_ban.png";
import rtc_voice_baned from "@/assets/images/rtc_voice_baned.png";
import rtc_video_ban from "@/assets/images/rtc_video_ban.png";
import rtc_video_baned from "@/assets/images/rtc_video_baned.png";
import { EllipsisOutlined } from "@ant-design/icons";
import { t } from "i18next";
import { events, im, isSingleCve, sec2Format } from "../../../utils";
import { CbEvents } from "../../../utils/open_im_sdk";
import { FullUserItem, GroupItem, GroupMemberItem, PublicUserItem, RtcInvite, SessionType } from "../../../utils/open_im_sdk/types";
import { customType } from "../../../constants/messageContentType";
import { useLatest, useUnmount } from "ahooks";
import GroupPartRender from "./GroupPartRender";
import SinglePartRender from "./SinglePartRender";
import { Loading } from "../../../components/Loading";
import { INSERT_TO_CURCVE } from "../../../constants/events";

enum RtcActionTypes {
  Cancel,
  Refuse,
  Access,
  HangUp,
  MicOn,
  MicOff,
  CameraOn,
  CameraOff,
}

const callMaps = [
  {
    title: t("Cancel"),
    icon: rtc_cancel,
    icon_select: null,
    action: RtcActionTypes.Cancel,
    action_select: null,
    media_control: null,
    idx: 0,
  },
];

const calledMaps = [
  {
    title: t("Refuse"),
    icon: rtc_cancel,
    icon_select: null,
    action: RtcActionTypes.Refuse,
    action_select: null,
    media_control: null,
    idx: 0,
  },
  {
    title: t("Answer"),
    icon: rtc_access,
    icon_select: null,
    action: RtcActionTypes.Access,
    action_select: null,
    media_control: null,
    idx: 1,
  },
];

const callingMaps = [
  {
    title: t("Microphone"),
    icon: rtc_voice_baned,
    icon_select: rtc_voice_ban,
    action: RtcActionTypes.MicOff,
    action_select: RtcActionTypes.MicOn,
    media_control: true,
    idx: 0,
  },
  {
    title: t("HangUp"),
    icon: rtc_cancel,
    icon_select: null,
    action: RtcActionTypes.HangUp,
    action_select: null,
    media_control: null,
    idx: 1,
  },
  {
    title: t("Camera"),
    icon: rtc_video_baned,
    icon_select: rtc_video_ban,
    action: RtcActionTypes.CameraOff,
    action_select: RtcActionTypes.CameraOn,
    media_control: true,
    idx: 2,
  },
];

const CallWidth = 400;
const CallHeight = 300;
const CallingWidth = 858;
const CallingHeight = 564;

export type RtcModalProps = {
  visible: boolean;
  isVideo: boolean;
  isSingle: boolean;
  isCalled: boolean;
  invitation: RtcInvite;
  myClose: () => void;
};

type RemoteInfo = {
  groupInfo: GroupItem;
  membersInfo: GroupMemberItem[];
};

const RtcModal: FC<RtcModalProps> = ({ visible, isVideo, isSingle, isCalled, invitation, myClose }) => {
  const [isCalling, setIsCalling] = useState(false);
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant>();
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [remoteUserInfo, setRemoteUserInfo] = useState<PublicUserItem | FullUserItem>();
  const [remoteMembersInfo, setRemoteMembersInfo] = useState<RemoteInfo>();
  const connConfig = useRef({
    url: "",
    token: "",
  });
  const selfInfo = useSelector((state: RootState) => state.user.selfInfo, shallowEqual);
  const groupList = useSelector((state: RootState) => state.contacts.groupList, shallowEqual);
  const curCve = useSelector((state: RootState) => state.cve.curCve, shallowEqual);
  const [bounds, setBounds] = useState({
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
  });
  const [renderActions, setRenderActions] = useState<typeof callingMaps>(isCalled ? calledMaps : callMaps);
  const [time, setTime] = useState(0);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const latestTime = useLatest(time);
  const draggableRef = useRef<HTMLDivElement>(null);
  const [mediaDevicesError, setMediaDevicesError] = useState<MediaDeviceFailure>();

  const { connect, room, participants, isConnecting, error } = useRoom();

  const latestParticipants = useLatest(participants)

  useEffect(() => {
    rtcInvite();
    getParticipantsInfo();
    setRenderActions(isCalled ? calledMaps : callMaps);
  }, []);

  useEffect(() => {
    updateParts();
  }, [participants]);

  useEffect(() => {
    im.on(CbEvents.ONINVITEEACCEPTED, acceptHandler);
    im.on(CbEvents.ONINVITEEREJECTED, rejectHandler);
    im.on(CbEvents.ONINVITATIONCANCELLED, cancelHandler);
    im.on(CbEvents.ONINVITATIONTIMEOUT, timeoutHandler);
    return () => {
      im.off(CbEvents.ONINVITEEACCEPTED, acceptHandler);
      im.off(CbEvents.ONINVITEEREJECTED, rejectHandler);
      im.off(CbEvents.ONINVITATIONCANCELLED, cancelHandler);
      im.off(CbEvents.ONINVITATIONTIMEOUT, timeoutHandler);
    };
  }, []);

  useUnmount(() => {
    room?.removeAllListeners();
    room?.disconnect();
  });

  useEffect(() => {
    room?.on(RoomEvent.ParticipantDisconnected, disconnectHandler);
    room?.on(RoomEvent.MediaDevicesError, mediaDevicesErrorHandler);
    return () => {
      room?.off(RoomEvent.ParticipantDisconnected, disconnectHandler);
      room?.off(RoomEvent.MediaDevicesError, mediaDevicesErrorHandler);
    };
  }, [room]);

  const acceptHandler = async () => isSingle && (await connectRtc(connConfig.current.url, connConfig.current.token));
  const rejectHandler = () => {
    if (isSingle) {
      insertMessage("refused");
      myClose();
    }
  };
  const cancelHandler = () => {
    insertMessage("canceled");
    isSingle && myClose();
  };
  const timeoutHandler = () => isSingle && invitation.groupID === "" && cancelRtc(true);
  const disconnectHandler = (removePart: Participant) => {
    if (isSingle) {
      hangupRtc();
    } else {
      const remainder = latestParticipants.current.filter(p=>p.sid !== removePart.sid)
      if (remainder.length < 2) {
        Modal.confirm({
          content: "是否结束当前通话？",
          onOk() {
            hangupRtc();
          },
          onCancel() {
            console.log("Cancel");
          },
        });
      }
    }
  };
  const mediaDevicesErrorHandler = (err: any) => {
    const errKind = MediaDeviceFailure.getFailure(err);
    setMediaDevicesError(err);
    message.error(errKind);
  };

  const getParticipantsInfo = () => {
    if (isSingle) {
      im.getUsersInfo([isCalled ? invitation.inviterUserID : invitation.inviteeUserIDList[0]]).then(({ data }) => {
        const info: PublicUserItem = JSON.parse(data)[0].publicInfo;
        setRemoteUserInfo(info);
      });
    } else {
      im.getGroupMembersInfo({ groupID: invitation.groupID, userIDList: [...invitation.inviteeUserIDList, invitation.inviterUserID] }).then(({ data }) => {
        const membersInfo: GroupMemberItem[] = JSON.parse(data);
        const groupInfo = groupList.find((g) => g.groupID === invitation.groupID);
        setRemoteMembersInfo({ groupInfo: groupInfo!, membersInfo });
      });
    }
  };

  const updateParts = () => {
    if (participants.length > 0) {
      const tmpArr: RemoteParticipant[] = [];
      let tmpLocalPart: LocalParticipant | undefined = undefined;
      participants.forEach((participant) => {
        // if (getVideoTrack(participant) || getAudioTrack(participant)) {
        participant instanceof LocalParticipant ? (tmpLocalPart = participant) : tmpArr.push(participant as RemoteParticipant);
        // }
      });
      if (!isSingle && tmpLocalPart) {
        tmpArr.push(tmpLocalPart as unknown as RemoteParticipant);
      }
      setLocalParticipant(tmpLocalPart);
      setRemoteParticipants(tmpArr);
    }
  };

  const rtcInvite = () => {
    if (!isCalled) {
      sendInvite(invitation)
        .then(({ data }) => {
          data = JSON.parse(data);
          if (isSingle) {
            connConfig.current = {
              url: data.liveURL,
              token: data.token,
            };
          } else {
            connectRtc(data.liveURL, data.token);
          }
        })
        .catch((err) => {
          message.error(err.errMsg ?? "发起失败！");
          myClose();
        });
    }
  };

  const sendInvite = (config: RtcInvite) => {
    if (config.sessionType === SessionType.Single) {
      return im.signalingInvite(config);
    } else {
      return im.signalingInviteInGroup(config);
    }
  };

  const handleError = (err?: any) => {
    message.error(err?.errMsg ?? "连接失败！请稍后重试！");
    myClose();
  };

  const connectRtc = async (url: string, token: string) => {
    const result = await connect(url, token, {
      video: isVideo,
      audio: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
    });
    if (result) {
      setIsCalling(true);
      setRenderActions(isVideo ? callingMaps : callingMaps.slice(0, 2));
      setTimer();
    } else {
      handleError();
    }
  };

  const cancelRtc = (istimeoout = false) => {
    im.signalingCancel({ opUserID: selfInfo.userID, invitation })
      .then(() => {
        insertMessage(istimeoout ? "timeout" : "cancel");
        myClose();
      })
      .catch((err) => handleError(err));
  };

  const acceptRtc = () => {
    im.signalingAccept({ opUserID: selfInfo.userID, invitation })
      .then(({ data }) => {
        connectRtc(JSON.parse(data).liveURL, JSON.parse(data).token);
      })
      .catch((err) => handleError(err));
  };

  const refusertc = () => {
    im.signalingReject({ opUserID: selfInfo.userID, invitation })
      .then(() => {
        insertMessage("refuse");
        myClose();
      })
      .catch((err) => handleError(err));
  };

  const hangupRtc = async () => {
    const timeStr = sec2Format(latestTime.current);
    insertMessage("success", timeStr);
    clearTimer();
    setIsCalling(false);
    console.log(room);
    room?.removeAllListeners();
    room?.disconnect();
    myClose();
  };

  const insertMessage = async (status: string, timeStr?: string) => {
    const data = {
      customType: customType.Call,
      data: {
        duration: timeStr ?? "",
        type: isVideo ? customType.VideoCall : customType.VoiceCall,
        status,
      },
    };
    const config = {
      data: JSON.stringify(data),
      extension: "",
      description: "RTC",
    };
    const { data: message } = await im.createCustomMessage(config);
    let newMessageStr;
    if (isSingle) {
      newMessageStr = (
        await im.insertSingleMessageToLocalStorage({
          message,
          recvID: invitation.inviteeUserIDList[0],
          sendID: invitation.inviterUserID,
        })
      ).data;
    } else {
      newMessageStr = (
        await im.insertGroupMessageToLocalStorage({
          message,
          groupID: invitation.groupID,
          sendID: invitation.inviterUserID,
        })
      ).data;
    }
    const inCurSingle = curCve && isSingleCve(curCve) && (curCve.userID === invitation.inviterUserID || curCve.userID === invitation.inviteeUserIDList[0]);
    const inCurGroup = curCve && curCve.groupID === invitation.groupID;
    if (inCurSingle || inCurGroup) {
      events.emit(INSERT_TO_CURCVE, JSON.parse(newMessageStr));
    }
  };

  const getVideoTrack = (pr: Participant) => pr.getTrack(Track.Source.Camera)?.track;
  const getAudioTrack = (pr: Participant) => pr.getTrack(Track.Source.Microphone)?.track;

  const onStart = (event: DraggableEvent, uiData: DraggableData) => {
    const { clientWidth, clientHeight } = window?.document?.documentElement;
    const targetRect = draggableRef!.current!.getBoundingClientRect();
    setBounds({
      left: -targetRect?.left + uiData?.x,
      right: clientWidth - (targetRect?.right - uiData?.x),
      top: -targetRect?.top + uiData?.y,
      bottom: clientHeight - (targetRect?.bottom - uiData?.y),
    });
  };

  const setTimer = () => {
    if (timer.current) clearTimer();
    timer.current = setInterval(() => {
      setTime((t) => t + 1);
    }, 1000);
  };

  const clearTimer = () => {
    timer.current && clearInterval(timer.current);
    setTime(0);
  };

  const clickAction = (action: typeof callingMaps[0]) => {
    if (action.media_control && mediaDevicesError) {
      return;
    }
    switchAction(action.action);

    if (action.icon_select) {
      const actions = [...renderActions];
      const tmp = actions[action.idx].icon;
      const tmpAction = actions[action.idx].action;
      actions[action.idx].icon = actions[action.idx].icon_select!;
      actions[action.idx].action = actions[action.idx].action_select!;
      actions[action.idx].icon_select = tmp;
      actions[action.idx].action_select = tmpAction;
      setRenderActions(actions);
    }
  };

  const switchAction = async (type: RtcActionTypes) => {
    switch (type) {
      case RtcActionTypes.Access:
        acceptRtc();
        break;
      case RtcActionTypes.Cancel:
        cancelRtc();
        break;
      case RtcActionTypes.Refuse:
        refusertc();
        break;
      case RtcActionTypes.HangUp:
        hangupRtc();
        break;
      case RtcActionTypes.MicOff:
        await localParticipant?.setMicrophoneEnabled(false);
        break;
      case RtcActionTypes.MicOn:
        await localParticipant?.setMicrophoneEnabled(true);
        break;
      case RtcActionTypes.CameraOff:
        await localParticipant?.setCameraEnabled(false);
        break;
      case RtcActionTypes.CameraOn:
        await localParticipant?.setCameraEnabled(true);
        break;
      default:
    }
  };

  const SingleCallTitle = () => {
    const switchTitle = !isVideo ? (isCalling ? sec2Format(time) : t(isCalled ? "CalledVoice" : "CallVoice")) : t(isCalled ? "CalledVideo" : "CallVideo");
    return !isVideo || !isCalling ? (
      <div className="body_actions_tops">
        <MyAvatar size={42} src={remoteUserInfo?.faceURL} />
        <div className="nickname">{remoteUserInfo?.nickname}</div>
        <div>{switchTitle}</div>
      </div>
    ) : null;
  };

  const GroupCallTitle = () => {
    const num = remoteMembersInfo?.membersInfo.length ?? 0;
    const switchTitle = !isVideo ? (isCalled ? t("GroupCallingVoice", { num }) : t("CallVoice")) : isCalled ? t("GroupCallingVideo", { num }) : t("CallVideo");

    return (
      <div className="body_actions_topg">
        <div className="call_info">
          <MyAvatar size={42} src={remoteMembersInfo?.groupInfo?.faceURL} />
          <div className="group_info">
            <div className="nickname">{remoteMembersInfo?.groupInfo?.groupName}</div>
            <div>{switchTitle}</div>
          </div>
        </div>
        <div className="call_members">
          {remoteMembersInfo &&
            (num > 7 ? remoteMembersInfo.membersInfo.slice(0, 8) : remoteMembersInfo.membersInfo).map((member) => <MyAvatar key={member.userID} size={36} src={member.faceURL} />)}
          {num > 7 ? <EllipsisOutlined /> : null}
        </div>
      </div>
    );
  };

  const CallBottomBar = () => (
    <div className="body_actions_bottom">
      {isCalling && !(isSingle && !isVideo) ? <div>{sec2Format(time)}</div> : null}
      <div className="actions">
        {renderActions.map((action) => (
          <div key={action.idx} className={`bottom_actions_item ${mediaDevicesError && action.media_control ? "bottom_actions_item_err" : ""}`}>
            <div className="rtc_action_icon">
              <img onClick={() => clickAction(action)} src={action.icon} />
            </div>
            <div>{action.title}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const switchRemoteCmp = () => {
    if (!isCalling) return null;
    return isSingle ? (
      remoteParticipants.length > 0 && <SinglePartRender isVideo={isVideo} part={remoteParticipants[0]} />
    ) : (
      <GroupPartRender isVideo={isVideo} parts={remoteParticipants} />
    );
  };

  const ignoreClasses = `.body_actions_top, .bottom_actions_item, .group_voice_renderers, .group_video_renderers`;

  const isExpand = (isCalling && isVideo) || (isCalling && !isSingle);
  const isGroupCalling = !isSingle && isCalling;
  const isFlexEnd = isGroupCalling || (isSingle && isVideo && isCalling);
  const showLocalTr = isSingle && isCalling && isVideo && localParticipant && getVideoTrack(localParticipant);

  return (
    <Modal
      key="RTCModal"
      className="rtc_modal"
      closable={false}
      footer={null}
      mask={false}
      width={isExpand ? CallingWidth : CallWidth}
      destroyOnClose
      centered
      onCancel={myClose}
      title={null}
      visible={visible}
      maskClosable={false}
      keyboard={false}
      modalRender={(modal) => (
        <Draggable allowAnyClick={true} disabled={false} bounds={bounds} onStart={(event, uiData) => onStart(event, uiData)} cancel={ignoreClasses} enableUserSelectHack={false}>
          <div ref={draggableRef}>{modal}</div>
        </Draggable>
      )}
    >
      <div style={{ width: isExpand ? CallingWidth : CallWidth, height: isExpand ? CallingHeight : CallHeight }} className="rtc_body">
        {isConnecting ? (
          <Loading tip="Connecting..." />
        ) : (
          <>
            <div style={{ justifyContent: isFlexEnd ? "flex-end" : "space-between" }} className="body_actions">
              {isSingle ? <SingleCallTitle /> : !isCalling ? <GroupCallTitle /> : null}
              <CallBottomBar />
              {showLocalTr && (
                <div className="body_actions_tr">
                  <VideoRenderer objectFit="contain" width="100%" height="100%" isLocal={false} track={getVideoTrack(localParticipant)!} />
                </div>
              )}
            </div>
            {switchRemoteCmp()}
          </>
        )}
      </div>
    </Modal>
  );
};

export default RtcModal;
