export type MeetingDetails = {
  roomID: string;
  meetingName: string;
  ex: string;
  hostUserID: string;
  inviteeUserIDList: string[];
  createTime: number;
  startTime: number;
  endTime: number;
  participantCanUnmuteSelf: boolean;
  participantCanEnableVideo: boolean;
  onlyHostInviteUser: boolean;
  onlyHostShareScreen: boolean;
  joinDisableMicrophone: boolean;
  joinDisableVideo: boolean;
  isMuteAllVideo: boolean;
  isMuteAllMicrophone: boolean;
  canScreenUserIDList?: string[];
  disableMicrophoneUserIDList?: string[];
  disableVideoUserIDList?: string[];
  pinedUserIDList?: string[];
  beWatchedUserIDList?: string[];
};

export type UpdateMeetingParams = {
  roomID: string;
  meetingName: string;
  startTime: number;
  endTime: number;
  participantCanUnmuteSelf: boolean;
  participantCanEnableVideo: boolean;
  onlyHostInviteUser: boolean;
  onlyHostShareScreen: boolean;
  joinDisableMicrophone: boolean;
  joinDisableVideo: boolean;
  isMuteAllVideo: boolean;
  isMuteAllMicrophone: boolean;
  addCanScreenUserIDList: string[];
  reduceCanScreenUserIDList: string[];
  addDisableMicrophoneUserIDList: string[];
  reduceDisableMicrophoneUserIDList: string[];
  addDisableVideoUserIDList: string[];
  reduceDisableVideoUserIDList: string[];
  addPinedUserIDList: string[];
  reducePinedUserIDList: string[];
  addBeWatchedUserIDList: string[];
  reduceBeWatchedUserIDList: string[];
};

export type MeetingConfig = {
  token: string;
  roomID: string;
  liveURL: string;
};

export type MeetingInvitation = {
  inviterFaceURL: string;
  id: string;
  duration: number;
  inviterNickname: string;
  inviterUserID: string;
  subject: string;
  start: number;
};

export const secondsToTime = {
  1800: "30分钟",
  3600: "1小时",
  5400: "1.5小时",
  7200: "2小时",
};
