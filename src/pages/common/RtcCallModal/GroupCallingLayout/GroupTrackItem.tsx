import type {
  TrackReference,
  TrackReferencePlaceholder,
} from "@livekit/components-core";
import { TrackMutedIndicator, useIsMuted, VideoTrack } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useMemo } from "react";

import OIMAvatar from "@/components/OIMAvatar";
import { GroupMemberItem } from "@/utils/open-im-sdk-wasm/types/entity";

export const GroupTrackItem = ({
  track,
}: {
  track: TrackReference | TrackReferencePlaceholder;
}) => {
  const isVideoMuted = useIsMuted(Track.Source.Camera, {
    participant: track.participant,
  });

  const memberInfo: GroupMemberItem = useMemo(() => {
    const metadata = track.participant.metadata;
    if (!metadata) {
      return {} as GroupMemberItem;
    }
    const parsedData = JSON.parse(metadata);
    return parsedData.groupMemberInfo as GroupMemberItem;
  }, [track.participant.metadata]);

  return (
    <div className="relative h-[92px] w-full">
      {!isVideoMuted ? (
        <VideoTrack {...track} />
      ) : (
        <OIMAvatar
          className="h-full w-full"
          src={memberInfo.faceURL}
          text={memberInfo.nickname}
        />
      )}
      <div className="absolute bottom-2 right-2 flex items-center">
        <TrackMutedIndicator className="text-white" source={Track.Source.Microphone} />
        <div className="max-w-[42px] truncate rounded bg-[rgba(12,28,51,0.2)] px-1 py-1 text-xs text-white">
          {memberInfo.nickname}
        </div>
      </div>
    </div>
  );
};
