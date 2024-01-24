import { useParticipants } from "@livekit/components-react";
import { Button } from "antd";
import clsx from "clsx";
import { LocalParticipant, RemoteParticipant } from "livekit-client";
import { memo, useMemo } from "react";

import { message } from "@/AntdGlobalComp";
import meeting_member_icon from "@/assets/images/rtc/meeting_member_icon.png";
import { CustomMessageType } from "@/constants";
import { IMSDK } from "@/layout/MainContentWrap";
import { useUserStore } from "@/store";
import emitter from "@/utils/events";

import { MeetingDetails } from "../data";
import styles from "./meeting-slider.module.scss";
import { SliderMemberItem } from "./SliderMemberItem";

type MeetingSliderProps = {
  roomID: string;
  isHost: boolean;
  meetingDetails: MeetingDetails;
  updateShowSlider: () => void;
};
export const MeetingSlider = memo(
  ({ roomID, isHost, meetingDetails, updateShowSlider }: MeetingSliderProps) => {
    const participants = useParticipants();
    const sortedParticipants = useMemo(() => {
      const tempParticipants = [...participants];
      if (meetingDetails.pinedUserIDList) {
        const pinedParticipants: (RemoteParticipant | LocalParticipant)[] = [];
        const otherParticipants: (RemoteParticipant | LocalParticipant)[] = [];
        for (const participant of tempParticipants) {
          if (meetingDetails.pinedUserIDList.includes(participant.identity)) {
            pinedParticipants.push(participant);
          } else {
            otherParticipants.push(participant);
          }
        }
        tempParticipants.splice(
          0,
          tempParticipants.length,
          ...pinedParticipants,
          ...otherParticipants,
        );
      }
      return tempParticipants;
    }, [meetingDetails.pinedUserIDList?.length, participants.length]);

    const updateMuteAll = (isMuteAllMicrophone: boolean) => {
      IMSDK.signalingUpdateMeetingInfo({
        isMuteAllMicrophone,
        roomID,
      });
    };

    const inviteMember = () => {
      if (!isHost && meetingDetails.onlyHostInviteUser) {
        message.warning("当前仅主持人可邀请成员");
        return;
      }
      const selfInfo = useUserStore.getState().selfInfo;
      const meetingInfo = {
        inviterFaceURL: selfInfo.faceURL,
        id: roomID,
        duration: meetingDetails.endTime - meetingDetails.startTime,
        inviterNickname: selfInfo.nickname,
        inviterUserID: selfInfo.userID,
        subject: meetingDetails.meetingName,
        start: meetingDetails.startTime,
      };
      emitter.emit("OPEN_CHOOSE_MODAL", {
        type: "MEETING_INVITE",
        extraData: {
          data: JSON.stringify({
            customType: CustomMessageType.MeetingInvitation,
            data: meetingInfo,
          }),
          extension: "",
          description: "",
        },
      });
    };

    return (
      <div className={styles["slider-wrap"]}>
        <div className={clsx("ignore-drag", styles["title-row"])}>
          <div className="flex items-center">
            <img className="h-[13.5px] w-[13.5px]" src={meeting_member_icon} alt="" />
            <span>{`管理成员（${participants.length}）`}</span>
          </div>
          <span className="cursor-pointer" onClick={updateShowSlider}>
            收起
          </span>
        </div>
        <div className="flex-1">
          {sortedParticipants.map((participant) => (
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
        <div
          className={clsx(
            "flex items-center justify-between p-3",
            styles["row-shadow"],
          )}
        >
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
  },
);
