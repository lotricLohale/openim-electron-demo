import { CloseOutlined } from "@ant-design/icons";
import { useLocalParticipant } from "@livekit/components-react";
import { Button, Popover, Switch } from "antd";
import clsx from "clsx";
import { Track } from "livekit-client";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

import { message } from "@/AntdGlobalComp";
import meeting_member from "@/assets/images/rtc/meeting_member.png";
import meeting_setting from "@/assets/images/rtc/meeting_setting.png";
import meeting_toggle_camera from "@/assets/images/rtc/meeting_toggle_camera.png";
import meeting_toggle_camera_off from "@/assets/images/rtc/meeting_toggle_camera_off.png";
import meeting_toggle_mic from "@/assets/images/rtc/meeting_toggle_mic.png";
import meeting_toggle_mic_off from "@/assets/images/rtc/meeting_toggle_mic_off.png";
import meeting_toggle_screen from "@/assets/images/rtc/meeting_toggle_screen.png";
import { IMSDK } from "@/layout/MainContentWrap";
import { useUserStore } from "@/store";
import { CbEvents } from "@/utils/open-im-sdk-wasm/constant";
import { WSEvent } from "@/utils/open-im-sdk-wasm/types/entity";

import { CloseMeetingContent } from "..";
import { MeetingDetails, UpdateMeetingParams } from "../data";
import styles from "./meeting-main.module.scss";

type MeetingActionRowProps = {
  roomID: string;
  meetingDetails: MeetingDetails;
  updateShowSlider: () => void;
  disconnect: (closeRoom?: boolean) => void;
};
export const MeetingActionRow = memo(
  ({ roomID, meetingDetails, updateShowSlider, disconnect }: MeetingActionRowProps) => {
    const [showSetting, setShowSetting] = useState(false);

    const localParticipantState = useLocalParticipant();
    const localParticipant = localParticipantState.localParticipant;

    useEffect(() => {
      const streamChangeHandler = ({
        data,
      }: WSEvent<{ roomID: string; streamType: string; mute: boolean }>) => {
        if (data.roomID === meetingDetails.roomID) {
          if (data.streamType === "video") {
            operateCamera(data.mute);
          } else {
            operateMicrophone(data.mute);
          }
        }
      };
      IMSDK.on(CbEvents.OnStreamChange, streamChangeHandler);
      return () => {
        IMSDK.off(CbEvents.OnStreamChange, streamChangeHandler);
      };
    }, [meetingDetails.roomID]);

    const isHost = useMemo(
      () => meetingDetails.hostUserID === useUserStore.getState().selfInfo.userID,
      [meetingDetails.hostUserID],
    );

    const actionArr = useMemo(
      () => [
        {
          title: `${localParticipantState.isMicrophoneEnabled ? "关闭" : "开启"}麦克风`,
          icon: localParticipantState.isMicrophoneEnabled
            ? meeting_toggle_mic
            : meeting_toggle_mic_off,
        },
        {
          title: `${localParticipantState.isCameraEnabled ? "关闭" : "开启"}摄像头`,
          icon: localParticipantState.isCameraEnabled
            ? meeting_toggle_camera
            : meeting_toggle_camera_off,
        },
        {
          title: localParticipantState.isScreenShareEnabled ? "结束共享" : "共享屏幕",
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
      [
        localParticipantState.isCameraEnabled,
        localParticipantState.isMicrophoneEnabled,
        localParticipantState.isScreenShareEnabled,
        isHost,
      ],
    );

    const updateShowSetting = useCallback(() => {
      setShowSetting((show) => !show);
    }, []);

    const actionClick = async (idx: number) => {
      switch (idx) {
        case 0:
          if (
            !isHost &&
            !meetingDetails.participantCanUnmuteSelf &&
            !localParticipantState.isMicrophoneEnabled
          ) {
            message.warning("主持人已禁止成员开启麦克风");
            return;
          }
          await operateMicrophone();
          break;
        case 1:
          if (
            !isHost &&
            !meetingDetails.participantCanEnableVideo &&
            !localParticipantState.isCameraEnabled
          ) {
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
        default:
          break;
      }
    };

    const operateCamera = async (flag?: boolean) => {
      if (localParticipant) {
        const enable = flag ?? localParticipantState.isCameraEnabled ?? false;
        await localParticipant.setCameraEnabled(!enable);
      }
    };

    const operateMicrophone = async (flag?: boolean) => {
      if (localParticipant) {
        const enable = flag ?? localParticipantState.isMicrophoneEnabled ?? false;
        await localParticipant.setMicrophoneEnabled(!enable);
      }
    };

    const operateScreenShare = async () => {
      if (localParticipant) {
        const enable = localParticipantState.isScreenShareEnabled ?? false;
        if (!window.electronAPI) {
          await localParticipant.setScreenShareEnabled(!enable);
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
          const screenSourceID = await window.electronAPI.ipcInvoke("getScreenSource");
          console.log(screenSourceID);

          if (!screenSourceID) {
            throw new Error("获取屏幕源失败");
          }
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              // @ts-ignore
              mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: screenSourceID,
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
      <div className={clsx("flex items-center justify-between", styles["row-shadow"])}>
        <div className="flex">
          {actionArr.map((action, idx) => {
            if (action.hidden) return null;
            const Wrapper = (actionEl: JSX.Element) =>
              idx === 4 ? (
                <Popover
                  key={action.title}
                  open={showSetting}
                  onOpenChange={(vis) => setShowSetting(vis)}
                  content={
                    <SettingContent
                      roomID={roomID}
                      meetingDetails={meetingDetails}
                      updateShowSetting={updateShowSetting}
                    />
                  }
                  placement="top"
                  trigger="click"
                >
                  {actionEl}
                </Popover>
              ) : (
                actionEl
              );
            return Wrapper(
              <div
                key={action.title}
                className="mx-3 my-2 flex min-w-[72px] cursor-pointer flex-col items-center text-xs"
                onClick={() => actionClick(idx)}
              >
                <img width={32} src={action.icon} alt="" />
                <div>{action.title}</div>
              </div>,
            );
          })}
        </div>
        <Popover
          open={isHost ? undefined : false}
          content={<CloseMeetingContent disconnect={disconnect} />}
          trigger="click"
          placement="topRight"
        >
          <Button
            className="mr-3 rounded"
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
  },
);

type SettingContentProps = {
  roomID: string;
  meetingDetails: MeetingDetails;
  updateShowSetting: () => void;
};
const SettingContent = memo(
  ({ roomID, meetingDetails, updateShowSetting }: SettingContentProps) => {
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
      ],
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
      IMSDK.signalingUpdateMeetingInfo({
        ...options,
        roomID,
      });
    };

    return (
      <div className="w-[480px]">
        <div className="flex items-center justify-between bg-[#f1f2f3] px-6 py-4">
          <div>会议设置</div>
          <CloseOutlined
            className="cursor-pointer text-[#a5abb8]"
            onClick={updateShowSetting}
          />
        </div>
        {settingList.map((setting, idx) => (
          <div
            key={setting.title}
            className="flex items-center justify-between px-6 py-4"
          >
            <div>{setting.title}</div>
            <Switch
              checked={setting.value}
              size="small"
              onClick={(v) => roomSettingUpdate(v, idx)}
            />
          </div>
        ))}
      </div>
    );
  },
);
