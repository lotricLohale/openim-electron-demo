import { useUpdate } from "ahooks";
import { ConnectionQuality, LocalParticipant, Participant, ParticipantEvent, Track, TrackPublication } from "livekit-client";
import { useEffect, useState } from "react";

export interface ParticipantState {
  isSpeaking: boolean;
  connectionQuality: ConnectionQuality;
  isLocal: boolean;
  metadata?: any;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  cameraPublication?: TrackPublication;
  microphonePublication?: TrackPublication;
  screenSharePublication?: TrackPublication;
}

export function useMeetingParticipant(participant: Participant): ParticipantState {
  const [isAudioMuted, setAudioMuted] = useState(false);
  const [isVideoMuted, setVideoMuted] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(participant.connectionQuality);
  const [isSpeaking, setSpeaking] = useState(false);
  const [metadata, setMetadata] = useState<any>();

  useEffect(() => {
    const onMuted = (pub: TrackPublication) => {
      if (pub.kind === Track.Kind.Audio) {
        setAudioMuted(true);
      } else if (pub.kind === Track.Kind.Video) {
        setVideoMuted(true);
      }
    };
    const onUnmuted = (pub: TrackPublication) => {
      if (pub.kind === Track.Kind.Audio) {
        setAudioMuted(false);
      } else if (pub.kind === Track.Kind.Video) {
        setVideoMuted(false);
      }
    };
    const onMetadataChanged = () => {
      if (participant.metadata) {
        setMetadata(JSON.parse(participant.metadata));
      }
    };
    const onIsSpeakingChanged = () => {
      setSpeaking(participant.isSpeaking);
    };
    const onConnectionQualityUpdate = () => {
      setConnectionQuality(participant.connectionQuality);
    };
    const onTrackSubscribeChanged = (_: unknown, pub: TrackPublication) => {
      console.log("onTrackSubscribeChanged:::");
      console.log(pub.source);
    };

    // register listeners
    participant
      .on(ParticipantEvent.TrackMuted, onMuted)
      .on(ParticipantEvent.TrackUnmuted, onUnmuted)
      .on(ParticipantEvent.ParticipantMetadataChanged, onMetadataChanged)
      .on(ParticipantEvent.IsSpeakingChanged, onIsSpeakingChanged)
      .on(ParticipantEvent.ConnectionQualityChanged, onConnectionQualityUpdate)
      .on(ParticipantEvent.TrackSubscribed, onTrackSubscribeChanged)
      .on(ParticipantEvent.TrackUnsubscribed, onTrackSubscribeChanged);

    // set initial state
    onMetadataChanged();
    onIsSpeakingChanged();

    return () => {
      // cleanup
      participant
        .off(ParticipantEvent.TrackMuted, onMuted)
        .off(ParticipantEvent.TrackUnmuted, onUnmuted)
        .off(ParticipantEvent.ParticipantMetadataChanged, onMetadataChanged)
        .off(ParticipantEvent.IsSpeakingChanged, onIsSpeakingChanged)
        .off(ParticipantEvent.ConnectionQualityChanged, onConnectionQualityUpdate)
        .off(ParticipantEvent.TrackSubscribed, onTrackSubscribeChanged)
        .off(ParticipantEvent.TrackUnsubscribed, onTrackSubscribeChanged);
    };
  }, [participant]);

  let muted: boolean | undefined;
  participant.audioTracks.forEach((pub) => {
    muted = pub.isMuted;
  });
  if (muted === undefined) {
    muted = true;
  }
  if (isAudioMuted !== muted) {
    setAudioMuted(muted);
  }

  return {
    isLocal: participant instanceof LocalParticipant,
    isSpeaking,
    connectionQuality,
    metadata,
    isAudioMuted,
    isVideoMuted: isVideoMuted ? isVideoMuted : !participant.isCameraEnabled,
    cameraPublication: participant.getTrack(Track.Source.Camera),
    microphonePublication: participant.getTrack(Track.Source.Microphone),
    screenSharePublication: participant.getTrack(Track.Source.ScreenShare),
  };
}
