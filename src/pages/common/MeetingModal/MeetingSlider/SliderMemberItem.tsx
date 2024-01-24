import { useIsMuted } from "@livekit/components-react";
import { Popover } from "antd";
import clsx from "clsx";
import { Participant, Track } from "livekit-client";
import { memo, useMemo } from "react";

import meeting_slider_camera from "@/assets/images/rtc/meeting_slider_camera.png";
import meeting_slider_camera_off from "@/assets/images/rtc/meeting_slider_camera_off.png";
import meeting_slider_mic from "@/assets/images/rtc/meeting_slider_mic.png";
import meeting_slider_mic_off from "@/assets/images/rtc/meeting_slider_mic_off.png";
import meeting_slider_more from "@/assets/images/rtc/meeting_slider_more.png";
import OIMAvatar from "@/components/OIMAvatar";
import { IMSDK } from "@/layout/MainContentWrap";
import { useUserStore } from "@/store";
import { PublicUserItem } from "@/utils/open-im-sdk-wasm/types/entity";

import { UpdateMeetingParams } from "../data";
import styles from "./meeting-slider.module.scss";

type SliderMemberItemProps = {
  roomID: string;
  participant: Participant;
  hostUserID: string;
  beWatchedUserIDList?: string[];
  pinedUserIDList?: string[];
};
export const SliderMemberItem = memo(
  ({
    roomID,
    participant,
    hostUserID,
    beWatchedUserIDList,
    pinedUserIDList,
  }: SliderMemberItemProps) => {
    const selfID = useUserStore((state) => state.selfInfo.userID);

    const isVideoMuted = useIsMuted(Track.Source.Camera, {
      participant,
    });
    const isAudioMuted = useIsMuted(Track.Source.Microphone, {
      participant,
    });

    const isHost = participant.identity === hostUserID;
    const isSelf = participant.identity === selfID;
    const selfIsHost = hostUserID === selfID;

    const updateMemberCamera = () => {
      if (!selfIsHost) return;
      console.log({
        streamType: "video",
        roomID,
        userID: participant.identity,
        mute: !isVideoMuted,
        muteAll: false,
      });

      IMSDK.signalingOperateStream({
        streamType: "video",
        roomID,
        userID: participant.identity,
        mute: !isVideoMuted,
        muteAll: false,
      });
    };

    const updateMemberMic = () => {
      if (!selfIsHost) return;

      IMSDK.signalingOperateStream({
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
      IMSDK.signalingUpdateMeetingInfo({
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
      IMSDK.signalingUpdateMeetingInfo({
        ...options,
        roomID,
      });
    };

    const moreContent = useMemo(
      () => (
        <div>
          <div
            className={clsx(
              styles["more-action-btn"],
              "border-b border-b-[rgba(81,94,112,0.1)]",
            )}
            onClick={updatePinUser}
          >
            {pinedUserIDList?.includes(participant.identity)
              ? "取消置顶"
              : "置顶该成员"}
          </div>
          <div className={styles["more-action-btn"]} onClick={updateBeWatchedUser}>
            {beWatchedUserIDList?.includes(participant.identity)
              ? "取消全部看他"
              : "全部看他"}
          </div>
        </div>
      ),
      [beWatchedUserIDList?.length, pinedUserIDList?.length, participant.identity],
    );

    const userInfo: PublicUserItem | undefined = JSON.parse(
      participant.metadata ?? "{}",
    ).userInfo;

    return (
      <div
        className={clsx(
          styles["member-item"],
          pinedUserIDList?.includes(participant.identity) &&
            styles["member-item_pined"],
        )}
      >
        <div className="flex flex-1 items-center overflow-hidden">
          <OIMAvatar
            size={38}
            shape="circle"
            src={userInfo?.faceURL}
            text={userInfo?.nickname}
          />
          <div className="ml-3 flex flex-col text-xs">
            <div className="truncate">{userInfo?.nickname}</div>
            {isHost || isSelf ? (
              <div className="truncate text-[var(--sub-text)]">{`
            (${isHost ? "主持人" : ""}${isHost && isSelf ? "、" : ""}${
                isSelf ? "你" : ""
              })
            `}</div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center">
          <img
            className="ml-4 h-4 w-4 cursor-pointer"
            style={{ cursor: !selfIsHost ? "auto" : "pointer" }}
            src={isVideoMuted ? meeting_slider_camera_off : meeting_slider_camera}
            alt=""
            onClick={updateMemberCamera}
          />
          <img
            className="ml-4 h-4 w-4 cursor-pointer"
            style={{ cursor: !selfIsHost ? "auto" : "pointer" }}
            src={isAudioMuted ? meeting_slider_mic_off : meeting_slider_mic}
            alt=""
            onClick={updateMemberMic}
          />
          {selfIsHost && (
            <Popover content={moreContent} trigger="click" placement="bottom">
              <img
                className="ml-4 h-4 w-4 cursor-pointer"
                src={meeting_slider_more}
                alt=""
              />
            </Popover>
          )}
        </div>
      </div>
    );
  },
);
