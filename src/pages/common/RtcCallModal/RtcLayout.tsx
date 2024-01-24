import {
  AudioTrack,
  TrackContext,
  TrackLoop,
  useConnectionState,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { Spin } from "antd";
import clsx from "clsx";
import {
  ConnectionState,
  LocalParticipant,
  Participant,
  ParticipantEvent,
  Track,
} from "livekit-client";
import { useEffect, useState } from "react";

import OIMAvatar from "@/components/OIMAvatar";
import { GroupMemberItem, PublicUserItem } from "@/utils/open-im-sdk-wasm/types/entity";

import { AuthData, InviteData } from "./data";
import { GroupCallingLayout } from "./GroupCallingLayout";
import { GroupProfile } from "./GroupProfile";
import { RtcControl } from "./RtcControl";

const localVideoClasses =
  "absolute right-3 top-3 !w-[100px] !h-[150px] rounded-md z-10";
const remoteVideoClasses = "absolute top-0 z-0";

interface IRtcLayoutProps {
  connect: boolean;
  isConnected: boolean;
  isRecv: boolean;
  isGroup: boolean;
  inviteData?: InviteData;
  closeOverlay: () => void;
  connectRtc: (data?: AuthData) => void;
}
export const RtcLayout = ({
  connect,
  isConnected,
  isRecv,
  isGroup,
  inviteData,
  connectRtc,
  closeOverlay,
}: IRtcLayoutProps) => {
  const isVideoCall = inviteData?.invitation?.mediaType === "video";
  const tracks = useTracks([Track.Source.Camera]);
  const audioTracks = useTracks([Track.Source.Microphone]);
  const remoteParticipant = tracks.find((track) => !isLocal(track.participant));
  const isWaiting = !connect && !isConnected;
  const [isRemoteVideoMuted, setIsRemoteVideoMuted] = useState(false);

  const connectState = useConnectionState();

  useEffect(() => {
    if (!remoteParticipant?.participant.identity) return;
    const trackMuteUpdate = () => {
      setIsRemoteVideoMuted(!remoteParticipant?.participant.isCameraEnabled);
    };
    remoteParticipant?.participant.on(ParticipantEvent.TrackMuted, trackMuteUpdate);
    remoteParticipant?.participant.on(ParticipantEvent.TrackUnmuted, trackMuteUpdate);
    trackMuteUpdate();
  }, [remoteParticipant?.participant.identity]);

  const renderContent = () => {
    if (!isGroup) {
      if (!isWaiting && isVideoCall && !isRemoteVideoMuted) return null;
      return (
        <SingleProfile
          isWaiting={isWaiting}
          userInfo={inviteData?.participant?.userInfo}
        />
      );
    }
    if (isWaiting && isRecv) {
      return (
        <GroupProfile
          groupID={inviteData?.invitation?.groupID ?? ""}
          memberInfo={
            inviteData?.participant?.groupMemberInfo ?? ({} as GroupMemberItem)
          }
          inviteeUserIDList={inviteData?.invitation?.inviteeUserIDList ?? []}
        />
      );
    }
    return (
      <GroupCallingLayout
        isRecv={isRecv}
        timeout={inviteData?.invitation?.timeout ?? 60}
        groupID={inviteData?.invitation?.groupID ?? ""}
        inviteeUserIDList={inviteData?.invitation?.inviteeUserIDList ?? []}
        isVideoCall={isVideoCall}
      />
    );
  };

  return (
    <Spin spinning={connectState === ConnectionState.Connecting}>
      <div className="relative h-full">
        <div
          className={clsx(
            "flex h-full flex-col items-center justify-between bg-[#262729]",
            { "!bg-[#F2F8FF]": isWaiting },
          )}
        >
          {renderContent()}
          <RtcControl
            isWaiting={isWaiting}
            isRecv={isRecv}
            isConnected={isConnected}
            // @ts-ignore
            invitation={inviteData?.invitation}
            closeOverlay={closeOverlay}
            connectRtc={connectRtc}
          />
        </div>
        {!isGroup && isConnected && (
          <TrackLoop tracks={tracks}>
            <TrackContext.Consumer>
              {(track) =>
                track && (
                  <VideoTrack
                    {...track}
                    className={
                      isLocal(track.participant)
                        ? localVideoClasses
                        : `${remoteVideoClasses} ${isRemoteVideoMuted ? "hidden" : ""}`
                    }
                  />
                )
              }
            </TrackContext.Consumer>
          </TrackLoop>
        )}
        <TrackLoop tracks={audioTracks}>
          <TrackContext.Consumer>
            {(track) => track && <AudioTrack {...track} />}
          </TrackContext.Consumer>
        </TrackLoop>
      </div>
    </Spin>
  );
};

interface ISingleProfileProps {
  isWaiting: boolean;
  userInfo?: PublicUserItem;
}
const SingleProfile = ({ isWaiting, userInfo }: ISingleProfileProps) => {
  return (
    <div className="absolute top-[10%] flex flex-col items-center">
      <OIMAvatar size={48} src={userInfo?.faceURL} text={userInfo?.nickname} />
      <div
        className={clsx("mt-3 max-w-[120px] truncate text-white", {
          "!text-[var(--base-black)]": isWaiting,
        })}
      >
        {userInfo?.nickname}
      </div>
    </div>
  );
};

const isLocal = (p: Participant) => {
  return p instanceof LocalParticipant;
};
