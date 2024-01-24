import {
  GroupItem,
  GroupMemberItem,
  PublicUserItem,
  RtcInvite,
} from "@/utils/open-im-sdk-wasm/types/entity";

export interface InviteData {
  invitation?: RtcInvite;
  participant?: ParticipantInfo;
}

export interface ParticipantInfo {
  userInfo: PublicUserItem;
  groupMemberInfo?: GroupMemberItem;
  groupInfo?: GroupItem;
}

export interface RtcInviteResults {
  liveURL: string;
  roomID: string;
  token: string;
  busyLineUserIDList?: string[];
}

export interface AuthData {
  liveURL: string;
  token: string;
}
