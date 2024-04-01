import { AudioTrack, connect, ConnectOptions, LocalParticipant, Participant, RemoteTrack, Room, RoomEvent, setLogLevel, Track } from "livekit-client";
import { LogLevel } from "livekit-client/dist/logger";
import { useCallback, useEffect, useState } from "react";

export interface RoomState {
  connect: (url: string, token: string, options?: ConnectOptions) => Promise<Room | undefined>;
  isConnecting: boolean;
  room?: Room;
  /* all participants in the room, including the local participant. */
  participants: Participant[];
  error?: Error;
  participantsChangedFlag: number;
}

export interface RoomOptions {
  pinedUserIDList?: string[];
}

export function useMeetingRoom(roomOptions?: RoomOptions): RoomState {
  const [room, setRoom] = useState<Room>();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error>();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsChangedFlag, setParticipantsChangedFlag] = useState(0);

  useEffect(() => {
    if (room) {
      const remotes = Array.from(room.participants.values());
      const participants: Participant[] = [room.localParticipant];
      participants.push(...remotes);
      sortParticipants(participants, room.localParticipant, roomOptions?.pinedUserIDList);
      setParticipants(participants);
    }
  }, [room?.metadata, roomOptions?.pinedUserIDList?.length]);

  const connectFn = useCallback(async (url: string, token: string, options?: ConnectOptions) => {
    setIsConnecting(true);
    try {
      const newRoom = await connect(url, token, options);
      setLogLevel(LogLevel.debug);
      setRoom(newRoom);
      const onParticipantsChanged = () => {
        const remotes = Array.from(newRoom.participants.values());
        const participants: Participant[] = [newRoom.localParticipant];
        participants.push(...remotes);
        sortParticipants(participants, newRoom.localParticipant, roomOptions?.pinedUserIDList);
        setParticipants(participants);
        setParticipantsChangedFlag(Date.now());
      };
      const onSubscribedTrackChanged = (track?: RemoteTrack) => {
        // ordering may have changed, re-sort
        onParticipantsChanged();
      };

      newRoom.once(RoomEvent.Disconnected, () => {
        setTimeout(() => setRoom(undefined));

        newRoom
          .off(RoomEvent.ParticipantConnected, onParticipantsChanged)
          .off(RoomEvent.ParticipantDisconnected, onParticipantsChanged)
          .off(RoomEvent.ActiveSpeakersChanged, onParticipantsChanged)
          .off(RoomEvent.TrackSubscribed, onSubscribedTrackChanged)
          .off(RoomEvent.TrackUnsubscribed, onSubscribedTrackChanged)
          .off(RoomEvent.LocalTrackPublished, onParticipantsChanged)
          .off(RoomEvent.LocalTrackUnpublished, onParticipantsChanged)
          .off(RoomEvent.AudioPlaybackStatusChanged, onParticipantsChanged);
      });
      newRoom
        .on(RoomEvent.ParticipantConnected, onParticipantsChanged)
        .on(RoomEvent.ParticipantDisconnected, onParticipantsChanged)
        .on(RoomEvent.ActiveSpeakersChanged, onParticipantsChanged)
        .on(RoomEvent.TrackSubscribed, onSubscribedTrackChanged)
        .on(RoomEvent.TrackUnsubscribed, onSubscribedTrackChanged)
        .on(RoomEvent.LocalTrackPublished, onParticipantsChanged)
        .on(RoomEvent.LocalTrackUnpublished, onParticipantsChanged)
        // trigger a state change by re-sorting participants
        .on(RoomEvent.AudioPlaybackStatusChanged, onParticipantsChanged);

      setIsConnecting(false);
      onSubscribedTrackChanged();

      return newRoom;
    } catch (error) {
      setIsConnecting(false);
      if (error instanceof Error) {
        setError(error);
      } else {
        setError(new Error("an error has occured"));
      }

      return undefined;
    }
  }, []);

  return {
    connect: connectFn,
    isConnecting,
    room,
    error,
    participants,
    participantsChangedFlag,
  };
}

/**
 * Default sort for participants, it'll order participants by:
 * 1. dominant speaker (speaker with the loudest audio level)
 * 2. local participant
 * 3. other speakers that are recently active
 * 4. participants with video on
 * 5. by joinedAt
 */
export function sortParticipants(participants: Participant[], localParticipant?: LocalParticipant, pinedUserIDList?: string[]) {
  participants.sort((a, b) => {
    // loudest speaker first
    if (a.isSpeaking && b.isSpeaking) {
      return b.audioLevel - a.audioLevel;
    }

    // speaker goes first
    if (a.isSpeaking !== b.isSpeaking) {
      if (a.isSpeaking) {
        return -1;
      } else {
        return 1;
      }
    }

    // last active speaker first
    if (a.lastSpokeAt !== b.lastSpokeAt) {
      const aLast = a.lastSpokeAt?.getTime() ?? 0;
      const bLast = b.lastSpokeAt?.getTime() ?? 0;
      return bLast - aLast;
    }

    // video on
    const aVideo = a.videoTracks.size > 0;
    const bVideo = b.videoTracks.size > 0;
    if (aVideo !== bVideo) {
      if (aVideo) {
        return -1;
      } else {
        return 1;
      }
    }

    // joinedAt
    return (a.joinedAt?.getTime() ?? 0) - (b.joinedAt?.getTime() ?? 0);
  });

  if (localParticipant) {
    const localIdx = participants.indexOf(localParticipant);
    if (localIdx >= 0) {
      participants.splice(localIdx, 1);
      if (participants.length > 0) {
        participants.splice(1, 0, localParticipant);
      } else {
        participants.push(localParticipant);
      }
    }
  }

  if (pinedUserIDList) {
    const pinedParticipants: Participant[] = [];
    const otherParticipants: Participant[] = [];
    for (const participant of participants) {
      if (pinedUserIDList.includes(participant.identity)) {
        pinedParticipants.push(participant);
      } else {
        otherParticipants.push(participant);
      }
    }
    participants.splice(0, participants.length, ...pinedParticipants, ...otherParticipants);
  }
}
