import { TrackContext, TrackLoop, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect, useRef, useState } from "react";

import OIMAvatar from "@/components/OIMAvatar";
import { IMSDK } from "@/layout/MainContentWrap";
import { GroupMemberItem } from "@/utils/open-im-sdk-wasm/types/entity";

import styles from "./group-calling-layout.module.scss";
import { GroupTrackItem } from "./GroupTrackItem";

export const GroupCallingLayout = ({
  isVideoCall,
  inviteeUserIDList,
  groupID,
  isRecv,
  timeout,
}: {
  isVideoCall: boolean;
  inviteeUserIDList: string[];
  groupID: string;
  isRecv: boolean;
  timeout: number;
}) => {
  const tracks = useTracks([Track.Source.Camera]);
  const audioTracks = useTracks([Track.Source.Microphone]);

  const [invitedList, setInvitedList] = useState<GroupMemberItem[]>([]);
  const connectedMemberIDs = (isVideoCall ? tracks : audioTracks).map(
    (track) => track.participant.identity,
  );

  const timer = useRef<NodeJS.Timer | number>();

  useEffect(() => {
    if (isRecv) return;
    IMSDK.getSpecifiedGroupMembersInfo<GroupMemberItem[]>({
      groupID,
      userIDList: inviteeUserIDList,
    })
      .then(({ data }) => {
        startTimer();
        setInvitedList(data);
      })
      .catch(() => setInvitedList([]));
    return () => {
      if (timer.current) {
        clearTimeout(timer.current as number);
      }
    };
  }, [isRecv]);

  const startTimer = () => {
    timer.current = setTimeout(() => {
      clearTimeout(timer.current as number);
      setInvitedList([]);
    }, timeout * 1000);
  };

  return (
    <div className="w-full flex-1 overflow-y-auto px-3 py-3">
      <div className="no-scrollbar grid h-full grid-cols-5 gap-2 overflow-y-auto rounded-md">
        <TrackLoop tracks={isVideoCall ? tracks : audioTracks}>
          <TrackContext.Consumer>
            {(track) => track && <GroupTrackItem track={track} />}
          </TrackContext.Consumer>
        </TrackLoop>
        {invitedList.map((member) =>
          connectedMemberIDs.includes(member.userID) ? null : (
            <div className="relative h-[92px] w-full" key={member.userID}>
              <OIMAvatar
                className="h-full w-full"
                src={member.faceURL}
                text={member.nickname}
              />
              <div className={styles["loading-dots"]}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
};
