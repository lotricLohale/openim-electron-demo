import { Button, Input, message, Modal, Popover, Spin, Switch } from "antd";
import { FC, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import meeting_toggle_mic from "@/assets/images/meeting_toggle_mic.png";
import meeting_toggle_mic_off from "@/assets/images/meeting_toggle_mic_off.png";
import meeting_toggle_camera from "@/assets/images/meeting_toggle_camera.png";
import meeting_toggle_camera_off from "@/assets/images/meeting_toggle_camera_off.png";
import meeting_member from "@/assets/images/meeting_member.png";
import meeting_setting from "@/assets/images/meeting_setting.png";
import meeting_toggle_screen from "@/assets/images/meeting_toggle_screen.png";
import meeting_member_mute from "@/assets/images/meeting_member_mute.png";
import meeting_member_muted from "@/assets/images/meeting_member_muted.png";
import meeting_member_host from "@/assets/images/meeting_member_host.png";
import meeting_slider_camera from "@/assets/images/meeting_slider_camera.png";
import meeting_slider_camera_off from "@/assets/images/meeting_slider_camera_off.png";
import meeting_slider_mic from "@/assets/images/meeting_slider_mic.png";
import meeting_slider_mic_off from "@/assets/images/meeting_slider_mic_off.png";
import meeting_slider_more from "@/assets/images/meeting_slider_more.png";
import meeting_close from "@/assets/images/meeting_close.png";
import meeting_hidden from "@/assets/images/meeting_hidden.png";
import meeting_max from "@/assets/images/meeting_max.png";
import meeting_max_cancel from "@/assets/images/meeting_max_cancel.png";
import meeting_member_icon from "@/assets/images/meeting_member_icon.png";
import meeting_details from "@/assets/images/meeting_details.png";
import meeting_main_member_muted from "@/assets/images/meeting_main_member_muted.png";
import meeting_main_member_mute from "@/assets/images/meeting_main_member_mute.png";
import MyAvatar from "../../../../components/MyAvatar";
import { ArrowsAltOutlined, CloseOutlined, ExpandOutlined, LeftOutlined, RightOutlined, SearchOutlined } from "@ant-design/icons";
import { useLatest, useSize } from "ahooks";
import moment from "moment";
import { AudioRenderer, VideoRenderer } from "livekit-react";
import { LocalParticipant, Participant, RoomEvent, Track } from "livekit-client";
import { RootState } from "../../../../store";
import { useSelector } from "react-redux";
import { events, genAvatar, im } from "../../../../utils";
import { useMeetingParticipant } from "./useMeetingParticipant";
import { CbEvents } from "../../../../utils/lib/constant";
import { useMeetingRoom } from "./useMeetingRoom";
import { MeetingConfig, MeetingDetails, secondsToTime, UpdateMeetingParams } from "./data";
import { FORWARD_AND_MER_MSG } from "../../../../constants/events";

type MeetingModalProps = {
  config: MeetingConfig;
  closeModal: () => void;
};
const MeetingModal: FC<MeetingModalProps> = memo(({ config, closeModal }) => {
  const draRef = useRef<HTMLDivElement>(null);
  const selfID = useSelector((state: RootState) => state.user.selfInfo.userID);
  const [bounds, setBounds] = useState({
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
  });
  const [showSlider, setShowSlider] = useState(false);
  const [showMini, setShowMini] = useState(false);
  const [showMax, setShowMax] = useState(false);
  const [positionOffset, setPositionOffset] = useState({ x: 0, y: 0 });
  const [meetingDetails, setMeetingDetails] = useState<MeetingDetails>({} as MeetingDetails);
  const latestMeetingDetails = useLatest(meetingDetails);
  const disconnectFlag = useRef(false);

  const { connect, room, participants, participantsChangedFlag, isConnecting, error } = useMeetingRoom({ pinedUserIDList: meetingDetails.pinedUserIDList ?? [] });

  useEffect(() => {
    meetingConnect();
  }, []);

  const onStart = (event: DraggableEvent, uiData: DraggableData) => {
    const { clientWidth, clientHeight } = window?.document?.documentElement;
    const targetRect = draRef!.current!.getBoundingClientRect();
    setBounds({
      left: -targetRect?.left + uiData?.x,
      right: clientWidth - (targetRect?.right - uiData?.x),
      top: -targetRect?.top + uiData?.y,
      bottom: clientHeight - (targetRect?.bottom - uiData?.y),
    });
  };

  const updateShowSlider = useCallback(() => {
    setShowSlider((show) => !show);
  }, []);

  const updateShowMax = useCallback(() => {
    setShowMax((show) => !show);
  }, []);

  const updateShowMini = useCallback(() => {
    setShowMini((show) => {
      if (show) {
        forceCenter();
      }
      return !show;
    });
  }, []);

  const disconnect = useCallback(
    (closeRoom?: boolean) => {
      disconnectFlag.current = true;
      room?.disconnect();
      if (closeRoom) {
        im.signalingCloseRoom(config.roomID);
      }
      closeModal();
    },
    [room?.metadata, config.roomID]
  );

  const forceCenter = () => {
    const styleStr = draRef.current?.style.transform ?? "";
    const idx = styleStr.lastIndexOf("(");
    const str = styleStr.slice(idx + 1, styleStr.length - 1);
    const arr = str.replace(new RegExp("px", "g"), "").split(", ");
    setPositionOffset({
      x: 0 - Number(arr[0]),
      y: 0 - Number(arr[1]),
    });
  };

  const meetingConnect = async () => {
    const result = await connect(config.liveURL, config.token, {
      video: false,
      audio: false,
    });
    if (result) {
      const onRoomMetaDataChange = (meta: string) => {
        setMeetingDetails(JSON.parse(meta));
      };
      result.once(RoomEvent.Disconnected, () => {
        if (!disconnectFlag.current) {
          message.warning("会议已结束！");
          disconnect();
        }
        result.off(RoomEvent.RoomMetadataChanged, onRoomMetaDataChange);
      });
      result.on(RoomEvent.RoomMetadataChanged, onRoomMetaDataChange);
      setMeetingDetails(JSON.parse(result.metadata ?? "{}"));
    }
  };

  const ignoreClasses = `.main_content,.action_row,.member_list,.anticon,.window_action_bar,.meeting_info_row,.meeting_details_pop,.expand_col`;
  const isHost = selfID === meetingDetails.hostUserID;

  return (
    <Modal
      className={"meeting_modal"}
      closable={false}
      footer={null}
      mask={false}
      width={"auto"}
      wrapClassName="meeting_wrap"
      centered
      title={null}
      visible
      modalRender={(modal) => (
        <Draggable
          positionOffset={positionOffset}
          allowAnyClick={true}
          disabled={false}
          bounds={bounds}
          onStart={(event, uiData) => onStart(event, uiData)}
          cancel={ignoreClasses}
          enableUserSelectHack={false}
        >
          <div ref={draRef}>{modal}</div>
        </Draggable>
      )}
    >
      <div className="modal_container">
        {!showMini ? (
          <>
            <div className="window_action_bar">
              <div className="wrap" onClick={updateShowMini}>
                <img src={meeting_hidden} alt="" />
              </div>
              <img src={showMax ? meeting_max_cancel : meeting_max} alt="" onClick={updateShowMax} />
              <Popover
                overlayClassName="meeting_close_pop"
                visible={isHost ? undefined : false}
                content={<CloseMeetingContent disconnect={disconnect} />}
                trigger="click"
                placement="bottomRight"
              >
                <img
                  src={meeting_close}
                  alt=""
                  onClick={() => {
                    if (!isHost) {
                      disconnect();
                    }
                  }}
                />
              </Popover>
            </div>
            <div className="loading_wrap">
              {isConnecting ? <Spin tip={"连接中..."} size="default" /> : null}
              <MeetingMain
                roomID={config.roomID}
                showSlider={showSlider}
                showMax={showMax}
                meetingDetails={meetingDetails}
                participants={participants}
                participantsChangedFlag={participantsChangedFlag}
                localParticipant={room?.localParticipant}
                updateShowSlider={updateShowSlider}
                disconnect={disconnect}
              />
            </div>

            {showSlider ? (
              <MeetingSlider isHost={isHost} roomID={config.roomID} participants={participants} meetingDetails={meetingDetails} updateShowSlider={updateShowSlider} />
            ) : null}
          </>
        ) : (
          <div className="mini_wrap">
            <VideoMemberItem hostUserID={meetingDetails.hostUserID} participant={participants[0]} />
            <ArrowsAltOutlined onClick={updateShowMini} />
          </div>
        )}
      </div>
    </Modal>
  );
});

export default MeetingModal;

type CloseMeetingContentProps = {
  disconnect: (closeRoom?: boolean) => void;
};
const CloseMeetingContent: FC<CloseMeetingContentProps> = ({ disconnect }) => {
  return (
    <div className="close_btns">
      <Button danger type="primary" onClick={() => disconnect(true)}>
        结束会议
      </Button>
      <Button danger onClick={() => disconnect()}>
        离开会议
      </Button>
    </div>
  );
};

type MeetingActionRowProps = {
  roomID: string;
  localParticipant: LocalParticipant;
  meetingDetails: MeetingDetails;
  updateShowSlider: () => void;
  disconnect: (closeRoom?: boolean) => void;
};
const MeetingActionRow: FC<MeetingActionRowProps> = ({ roomID, meetingDetails, localParticipant, updateShowSlider, disconnect }) => {
  const [showSetting, setShowSetting] = useState(false);
  let lockFlag = false;

  const { isAudioMuted, isVideoMuted } = useMeetingParticipant(localParticipant);

  useEffect(() => {
    im.on(CbEvents.ONSTREAMCHANGE, streamChangeHandler);
    return () => {
      im.off(CbEvents.ONSTREAMCHANGE, streamChangeHandler);
    };
  }, [meetingDetails.meetingName]);

  // useEffect(() => {
  //   console.log("meetingDetails.isMuteAllMicrophone");
  //   console.log(meetingDetails.isMuteAllMicrophone);

  //   if (lockFlag && meetingDetails.isMuteAllMicrophone) {
  //     console.log(lockFlag && meetingDetails.isMuteAllMicrophone);

  //     operateMicrophone(true);
  //   }
  //   if (meetingDetails.isMuteAllMicrophone !== undefined) {
  //     lockFlag = true;
  //   }
  // }, [meetingDetails.isMuteAllMicrophone, lockFlag]);

  const streamChangeHandler = ({ data }: any) => {
    const changeData = JSON.parse(data);
    if (changeData.meetingID === meetingDetails.meetingID) {
      if (changeData.streamType === "video") {
        operateCamera(changeData.mute);
      } else {
        operateMicrophone(changeData.mute);
      }
    }
  };

  const isHost = useMemo(() => meetingDetails.hostUserID === localParticipant.identity, [meetingDetails.hostUserID]);

  const actionArr = useMemo(
    () => [
      {
        title: `${!isAudioMuted ? "关闭" : "开启"}麦克风`,
        icon: !isAudioMuted ? meeting_toggle_mic : meeting_toggle_mic_off,
      },
      {
        title: `${!isVideoMuted ? "关闭" : "开启"}摄像头`,
        icon: !isVideoMuted ? meeting_toggle_camera : meeting_toggle_camera_off,
      },
      {
        title: localParticipant?.isScreenShareEnabled ? "结束共享" : "共享屏幕",
        icon: meeting_toggle_screen,
      },
      {
        title: "成员",
        icon: meeting_member,
      },
      {
        title: "设置",
        icon: meeting_setting,
        hidden: !isHost,
      },
    ],
    [isAudioMuted, isVideoMuted, localParticipant?.isScreenShareEnabled, isHost]
  );

  const updateShowSetting = useCallback(() => {
    setShowSetting((show) => !show);
  }, []);

  const actionClick = async (idx: number) => {
    switch (idx) {
      case 0:
        if (!isHost && !meetingDetails.participantCanUnmuteSelf && isAudioMuted) {
          message.warning("主持人已禁止成员开启麦克风");
          return;
        }
        await operateMicrophone();
        break;
      case 1:
        if (!isHost && !meetingDetails.participantCanEnableVideo && !localParticipant?.isCameraEnabled) {
          message.warning("主持人已禁止成员开启摄像头");
          return;
        }
        await operateCamera();
        break;
      case 2:
        if (!isHost && meetingDetails.onlyHostShareScreen) {
          message.warning("当前仅主持人可共享屏幕");
          return;
        }
        await operateScreenShare();
        break;
      case 3:
        updateShowSlider();
        break;
      case 4:
        updateShowSetting();
        break;

      default:
        break;
    }
  };

  const operateCamera = async (flag?: boolean) => {
    if (localParticipant) {
      let enable = flag ?? localParticipant.isCameraEnabled ?? false;
      await (localParticipant as LocalParticipant).setCameraEnabled(!enable);
    }
  };

  const operateMicrophone = async (flag?: boolean) => {
    if (localParticipant) {
      let enable = flag ?? localParticipant.isMicrophoneEnabled ?? false;
      await (localParticipant as LocalParticipant).setMicrophoneEnabled(!enable);
    }
  };

  const operateScreenShare = async () => {
    if (localParticipant) {
      let enable = localParticipant.isScreenShareEnabled ?? false;
      if (!window.electron) {
        await (localParticipant as LocalParticipant).setScreenShareEnabled(!enable);
        return;
      }

      // for electron
      if (enable) {
        const track = localParticipant.getTrack(Track.Source.ScreenShare)?.track;
        if (track) {
          await localParticipant.unpublishTrack(track);
        }
        return;
      }
      try {
        const screenSource = await window.electron.getScreenSource();
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            // @ts-ignore
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: screenSource[0].id,
              minWidth: 1280,
              maxWidth: 1280,
              minHeight: 720,
              maxHeight: 720,
            },
          },
        });
        localParticipant.publishTrack(stream.getVideoTracks()[0], {
          simulcast: true,
          source: Track.Source.ScreenShare,
        });
      } catch (error) {
        message.error("获取屏幕源失败，请检查是否开启屏幕共享权限！");
        console.error(error);
      }
    }
  };

  return (
    <div className="action_row">
      <div className="action_list">
        {actionArr.map((action, idx) =>
          action.hidden ? null : (
            <Popover
              key={action.title}
              visible={idx === 4 && showSetting}
              overlayClassName="meeting_setting_pop"
              content={<SettingContent roomID={roomID} meetingDetails={meetingDetails} updateShowSetting={updateShowSetting} />}
              // trigger=""
              placement="top"
            >
              <div className="action_item" onClick={() => actionClick(idx)}>
                <img src={action.icon} alt="" />
                <div>{action.title}</div>
              </div>
            </Popover>
          )
        )}
      </div>
      <Popover
        overlayClassName="meeting_close_pop_btm"
        visible={isHost ? undefined : false}
        content={<CloseMeetingContent disconnect={disconnect} />}
        trigger="click"
        placement="topRight"
      >
        <Button
          className="end_btn"
          type="primary"
          onClick={() => {
            if (!isHost) {
              disconnect();
            }
          }}
        >
          结束会议
        </Button>
      </Popover>
    </div>
  );
};

type SettingContentProps = {
  roomID: string;
  meetingDetails: MeetingDetails;
  updateShowSetting: () => void;
};
const SettingContent: FC<SettingContentProps> = memo(({ roomID, meetingDetails, updateShowSetting }) => {
  const settingList = useMemo(
    () => [
      {
        title: "允许成员自我解除静音",
        value: meetingDetails.participantCanUnmuteSelf,
      },
      {
        title: "允许成员开启视频",
        value: meetingDetails.participantCanEnableVideo,
      },
      {
        title: "仅主持人可以共享屏幕",
        value: meetingDetails.onlyHostShareScreen,
      },
      {
        title: "仅主持人可邀请会议人员",
        value: meetingDetails.onlyHostInviteUser,
      },
      {
        title: "成员入会静音",
        value: meetingDetails.joinDisableMicrophone,
      },
    ],
    [
      meetingDetails.participantCanUnmuteSelf,
      meetingDetails.participantCanEnableVideo,
      meetingDetails.onlyHostShareScreen,
      meetingDetails.onlyHostInviteUser,
      meetingDetails.joinDisableMicrophone,
    ]
  );

  const roomSettingUpdate = (flag: boolean, idx: number) => {
    const options = {} as UpdateMeetingParams;
    switch (idx) {
      case 0:
        options.participantCanUnmuteSelf = flag;
        break;
      case 1:
        options.participantCanEnableVideo = flag;
        break;
      case 2:
        options.onlyHostShareScreen = flag;
        break;
      case 3:
        options.onlyHostInviteUser = flag;
        break;
      case 4:
        options.joinDisableMicrophone = flag;
        break;
      default:
        break;
    }
    im.signalingUpdateMeetingInfo({
      ...options,
      roomID,
    });
  };

  return (
    <div className="setting_container">
      <div className="title">
        <div>会议设置</div>
        <CloseOutlined onClick={updateShowSetting} />
      </div>
      {settingList.map((setting, idx) => (
        <div key={setting.title} className="setting_item">
          <div>{setting.title}</div>
          <Switch checked={setting.value} size="small" onClick={(v) => roomSettingUpdate(v, idx)} />
        </div>
      ))}
    </div>
  );
});

const Counter = memo(() => {
  const [time, setTime] = useState(moment().format("YYYY-MM-DD HH:mm:ss"));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(moment().format("YYYY-MM-DD HH:mm:ss"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <div>{time}</div>;
});

type VoiceMemberItemProps = {
  hostUserID: string;
  participant: Participant;
};
const VoiceMemberItem: FC<VoiceMemberItemProps> = ({ hostUserID, participant }) => {
  const { metadata, microphonePublication, isLocal, isAudioMuted } = useMeetingParticipant(participant);

  return (
    <div className="member_voice_item">
      <MyAvatar size={72} shape="circle" src={metadata?.userInfo.faceURL || genAvatar(metadata?.userInfo.nickname, 72)} />
      <div className="member_name">
        <div>{metadata?.userInfo.nickname}</div>
        <img className="mute_icon" src={!isAudioMuted ? meeting_member_mute : meeting_member_muted} alt="" />
      </div>
      {hostUserID === participant.identity && <img className="host_icon" src={meeting_member_host} alt="" />}
      {microphonePublication?.track ? <AudioRenderer track={microphonePublication.track} isLocal={isLocal} /> : null}
    </div>
  );
};

type VideoMemberItemProps = {
  hostUserID: string;
  participant: Participant;
  wrapHeight?: number;
  totalLength?: number;
  toggleAllInOne?: (identity: string) => void;
};
const VideoMemberItem: FC<VideoMemberItemProps> = ({ hostUserID, participant, totalLength, toggleAllInOne, wrapHeight = 522 }) => {
  const { metadata, isAudioMuted, isLocal, isVideoMuted, cameraPublication, microphonePublication, screenSharePublication } = useMeetingParticipant(participant);

  const isHost = metadata?.userInfo.userID === hostUserID;
  const videoWidth = totalLength ? `calc(${totalLength > 4 ? 33.3 : 50}% - 10px)` : "100%";
  const videoHeight = totalLength ? `${wrapHeight / (totalLength > 4 ? 3 : 2) - 15}px` : "100%";
  const hasScreenTrack = screenSharePublication?.track && participant.isScreenShareEnabled;
  const hasVideoTrack = !isVideoMuted && cameraPublication?.track;
  return (
    <div className="member_video_item" style={{ width: videoWidth, height: videoHeight }} onDoubleClick={() => toggleAllInOne?.(participant.identity)}>
      {!hasVideoTrack && !hasScreenTrack ? (
        <div className="avatar_wrap">
          <MyAvatar size={72} shape="circle" src={metadata?.userInfo.faceURL} />
        </div>
      ) : (
        <>
          <VideoRenderer objectFit="contain" width="100%" height="100%" isLocal={false} track={hasScreenTrack ? screenSharePublication?.track! : cameraPublication?.track!} />
          {/* <ExpandOutlined /> */}
        </>
      )}
      {microphonePublication?.track ? <AudioRenderer track={microphonePublication.track} isLocal={isLocal} /> : null}

      <div className="member_name">
        {isHost ? <img width={13} className="state_icon" src={meeting_member_host} alt="" /> : null}
        <img className="state_icon" src={isAudioMuted ? meeting_main_member_muted : meeting_main_member_mute} alt="" />
        <div>{metadata?.userInfo.nickname}</div>
      </div>
    </div>
  );
};

type NomalVideoGridProps = {
  participants: Participant[];
  hostUserID: string;
  wrapHeight?: number;
  isOnlyAudio: boolean;
  toggleAllInOne: (identity: string) => void;
};
const NomalVideoGrid: FC<NomalVideoGridProps> = memo(({ participants, wrapHeight, hostUserID, isOnlyAudio, toggleAllInOne }) => {
  return (
    <div className={`main_content ${isOnlyAudio ? "voice_only" : ""}`}>
      {participants.map((participant) =>
        isOnlyAudio ? (
          <VoiceMemberItem key={participant.identity} hostUserID={hostUserID} participant={participant} />
        ) : (
          <VideoMemberItem
            key={participant.identity}
            hostUserID={hostUserID}
            participant={participant}
            wrapHeight={wrapHeight}
            totalLength={participants.length}
            toggleAllInOne={toggleAllInOne}
          />
        )
      )}
    </div>
  );
});

type AllInOneVideoGridProps = {
  participants: Participant[];
  allInOneUserID: string;
  hostUserID: string;
  toggleAllInOne: (identity: string) => void;
};
const AllInOneVideoGrid: FC<AllInOneVideoGridProps> = memo(({ participants, hostUserID, allInOneUserID, toggleAllInOne }) => {
  const [showOther, setShowOther] = useState(true);

  const allInOneParticipant = useMemo(() => participants.find((participant) => participant.identity === allInOneUserID), [participants, allInOneUserID]);
  return (
    <>
      <div className="all_in_one">{allInOneParticipant ? <VideoMemberItem hostUserID={hostUserID} participant={allInOneParticipant} /> : null}</div>
      <div className={`all_in_other ${showOther ? "sidebar-visible" : "sidebar-hidden"}`}>
        {participants.map((participant) => (
          <VideoMemberItem key={participant.identity} hostUserID={hostUserID} participant={participant} toggleAllInOne={toggleAllInOne} />
        ))}
      </div>
      <div className="expand_col" style={{ right: showOther ? "210px" : "0" }} onClick={() => setShowOther((v) => !v)}>
        {showOther ? <RightOutlined /> : <LeftOutlined />}
      </div>
    </>
  );
});

type MeetingMainProps = {
  roomID: string;
  showMax: boolean;
  showSlider: boolean;
  participants: Participant[];
  localParticipant?: LocalParticipant;
  participantsChangedFlag: number;
  meetingDetails: MeetingDetails;
  updateShowSlider: () => void;
  disconnect: (closeRoom?: boolean) => void;
};

const MeetingMain: FC<MeetingMainProps> = memo(
  ({ roomID, showSlider, showMax, participants, participantsChangedFlag, localParticipant, meetingDetails, updateShowSlider, disconnect }) => {
    const [focusUserID, setFocusUserID] = useState<string>();
    const ref = useRef(null);
    const size = useSize(ref);

    useEffect(() => {
      setFocusUserID(meetingDetails.beWatchedUserIDList?.[0]);
    }, [meetingDetails.beWatchedUserIDList?.length]);

    // const localParticipant = useMemo(() => participants.find((participant) => participant instanceof LocalParticipant) as LocalParticipant, [participants]);

    const detailsContent = useMemo(
      () => (
        <div className="details_container">
          <div className="title">{meetingDetails.meetingName}</div>
          <div className="detail">{`会议号：${meetingDetails.meetingID}`}</div>
          <div className="detail">{`开始时间： ${moment(meetingDetails.startTime * 1000).format("YYYY-MM-DD HH:mm")}`}</div>
          {/* @ts-ignore */}
          <div className="detail">{`会议时长： ${secondsToTime[meetingDetails.endTime - meetingDetails.startTime] ?? ""}`}</div>
        </div>
      ),
      [meetingDetails.meetingID]
    );

    const toggleAllInOne = useCallback((identity: string) => {
      setFocusUserID(identity);
    }, []);

    const mainWidth = showMax ? `calc(100vw - ${showSlider ? 327 : 0}px - 40px)` : "960px";
    const mainHeight = showMax ? "calc(100vh - 40px)" : "650px";
    // const allInOneUserID = meetingDetails.beWatchedUserIDList?.[0];
    const isOnlyAudio = useMemo(() => participants.find((participant) => participant.isCameraEnabled || participant.isScreenShareEnabled) === undefined, [participantsChangedFlag]);

    return (
      <div className="main_wrap" style={{ width: mainWidth, height: mainHeight }}>
        <div className="modal_title">
          <span>视频会议</span>
        </div>
        <div className="meeting_info_row">
          <div>{meetingDetails.meetingName}</div>
          <Counter />
          <div>
            <span>{`${participants.length}人正在开会`}</span>
            <Popover overlayClassName="meeting_details_pop" content={detailsContent} trigger="click" placement="bottomLeft">
              <img width={14} src={meeting_details} alt="" />
            </Popover>
          </div>
        </div>
        <div className="main_content_wrap" style={{ backgroundColor: !isOnlyAudio || focusUserID ? "#343030" : "#fff" }} ref={ref}>
          {focusUserID ? (
            <AllInOneVideoGrid participants={participants} hostUserID={meetingDetails.hostUserID} allInOneUserID={focusUserID} toggleAllInOne={toggleAllInOne} />
          ) : (
            <NomalVideoGrid
              participants={participants}
              hostUserID={meetingDetails.hostUserID}
              isOnlyAudio={isOnlyAudio}
              wrapHeight={size?.height}
              toggleAllInOne={toggleAllInOne}
            />
          )}
        </div>
        {localParticipant ? (
          <MeetingActionRow roomID={roomID} meetingDetails={meetingDetails} localParticipant={localParticipant} updateShowSlider={updateShowSlider} disconnect={disconnect} />
        ) : null}
      </div>
    );
  }
);

type MeetingSliderProps = {
  roomID: string;
  isHost: boolean;
  meetingDetails: MeetingDetails;
  participants: Participant[];
  updateShowSlider: () => void;
};
const MeetingSlider: FC<MeetingSliderProps> = memo(({ roomID, isHost, meetingDetails, participants, updateShowSlider }) => {
  const selfInfo = useSelector((state: RootState) => state.user.selfInfo);
  const updateMuteAll = (isMuteAllMicrophone: boolean) => {
    im.signalingUpdateMeetingInfo({
      isMuteAllMicrophone,
      roomID,
    });
  };

  const inviteMember = () => {
    if (!isHost && meetingDetails.onlyHostInviteUser) {
      message.warning("当前仅主持人可邀请成员");
      return;
    }
    const meetingInfo = {
      inviterFaceURL: selfInfo.faceURL,
      id: roomID,
      duration: meetingDetails.endTime - meetingDetails.startTime,
      inviterNickname: selfInfo.nickname,
      inviterUserID: selfInfo.userID,
      subject: meetingDetails.meetingName,
      start: meetingDetails.startTime,
    };
    events.emit(FORWARD_AND_MER_MSG, "meeting_invite", JSON.stringify(meetingInfo));
  };

  return (
    <div className="slider_wrap">
      <div className="title_row">
        <div>
          <img width={13.5} src={meeting_member_icon} alt="" />
          <span>{`管理成员（${participants.length}）`}</span>
        </div>
        <span onClick={updateShowSlider}>收起</span>
      </div>
      {/* <div className="search_wrap">
        <Input placeholder="搜索" prefix={<SearchOutlined />} />
      </div> */}
      <div className="member_list">
        {participants.map((participant) => (
          <SliderMemberItem
            key={participant.identity}
            roomID={roomID}
            hostUserID={meetingDetails.hostUserID}
            participant={participant}
            beWatchedUserIDList={meetingDetails.beWatchedUserIDList}
            pinedUserIDList={meetingDetails.pinedUserIDList}
          />
        ))}
      </div>
      <div className="action_row">
        <Button onClick={inviteMember}>邀请</Button>
        {isHost ? (
          <>
            <Button onClick={() => updateMuteAll(true)}>全体静音</Button>
            <Button onClick={() => updateMuteAll(false)}>解除全体静音</Button>
          </>
        ) : null}
      </div>
    </div>
  );
});

type SliderMemberItemProps = {
  roomID: string;
  participant: Participant;
  hostUserID: string;
  beWatchedUserIDList?: string[];
  pinedUserIDList?: string[];
};
const SliderMemberItem: FC<SliderMemberItemProps> = ({ roomID, participant, hostUserID, beWatchedUserIDList, pinedUserIDList }) => {
  const selfID = useSelector((state: RootState) => state.user.selfInfo.userID);

  const { metadata, isAudioMuted, isVideoMuted } = useMeetingParticipant(participant);

  const isHost = hostUserID === metadata?.userInfo.userID;
  const isSelf = participant.identity === selfID;
  const selfIsHost = hostUserID === selfID;

  const updateMemberCamera = () => {
    if (!selfIsHost) return;

    im.signalingOperateStream({
      streamType: "video",
      roomID,
      userID: participant.identity,
      mute: !isVideoMuted,
      muteAll: false,
    });
  };

  const updateMemberMic = () => {
    if (!selfIsHost) return;

    im.signalingOperateStream({
      streamType: "audio",
      roomID,
      userID: participant.identity,
      mute: !isAudioMuted,
      muteAll: false,
    });
  };

  const updatePinUser = () => {
    const options = {} as UpdateMeetingParams;
    if (pinedUserIDList?.includes(participant.identity)) {
      options.reducePinedUserIDList = [participant.identity];
    } else {
      options.addPinedUserIDList = [participant.identity];
    }
    im.signalingUpdateMeetingInfo({
      ...options,
      roomID,
    });
  };

  const updateBeWatchedUser = () => {
    const options = {} as UpdateMeetingParams;
    if (beWatchedUserIDList?.includes(participant.identity)) {
      options.reduceBeWatchedUserIDList = [participant.identity];
    } else {
      options.reduceBeWatchedUserIDList = [...(beWatchedUserIDList ?? [])];
      options.addBeWatchedUserIDList = [participant.identity];
    }
    im.signalingUpdateMeetingInfo({
      ...options,
      roomID,
    });
  };

  const moreContent = useMemo(
    () => (
      <div className="memebr_more_menu">
        <div onClick={updatePinUser}>{pinedUserIDList?.includes(participant.identity) ? "取消置顶" : "置顶该成员"}</div>
        <div onClick={updateBeWatchedUser}>{beWatchedUserIDList?.includes(participant.identity) ? "取消全部看他" : "全部看他"}</div>
      </div>
    ),
    [beWatchedUserIDList, pinedUserIDList, participant.identity]
  );

  return (
    <div className={`member_item ${pinedUserIDList?.includes(participant.identity) ? "member_item_pined" : ""}`}>
      <div className="member_left">
        <MyAvatar size={38} shape="circle" />
        <div className="base_info">
          <div className="member_name">{metadata?.userInfo.nickname}</div>
          {isHost || isSelf ? (
            <div className="member_desc">{`
          (${isHost ? "主持人" : ""}${isHost && isSelf ? "、" : ""}${isSelf ? "你" : ""})
          `}</div>
          ) : null}
        </div>
      </div>
      {!isSelf ? (
        <div className="member_action">
          <img style={{ cursor: !selfIsHost ? "auto" : "pointer" }} src={isVideoMuted ? meeting_slider_camera_off : meeting_slider_camera} alt="" onClick={updateMemberCamera} />
          <img style={{ cursor: !selfIsHost ? "auto" : "pointer" }} src={isAudioMuted ? meeting_slider_mic_off : meeting_slider_mic} alt="" onClick={updateMemberMic} />
          {selfIsHost && (
            <Popover overlayClassName="meeting_more_pop" content={moreContent} trigger="click" placement="bottomLeft">
              <img src={meeting_slider_more} alt="" />
            </Popover>
          )}
        </div>
      ) : null}
    </div>
  );
};
