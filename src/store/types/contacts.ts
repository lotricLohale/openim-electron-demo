import { GroupMemberState, MemberMapType, OrzInfoType } from "../../@types/open_im";
import { BlackItem, DepartmentItem, DepartmentMemberItem, FriendApplicationItem, FriendItem, GroupApplicationItem, GroupItem, GroupMemberItem, PublicUserItem } from "../../utils/open_im_sdk/types";

export type OriginListType = {
  id: string[];
  info:PublicUserItem[];
  current:number;
  loading: boolean;
}

export type ContactState = {
  friendList: FriendItem[];
  originList: OriginListType;
  groupList: GroupItem[];
  blackList: BlackItem[];
  recvFriendApplicationList: FriendApplicationItem[];
  sentFriendApplicationList: FriendApplicationItem[];
  recvGroupApplicationList: GroupApplicationItem[];
  sentGroupApplicationList: GroupApplicationItem[];
  groupMemberList: GroupMemberItem[];
  groupInfo: GroupItem;
  currentMember: GroupMemberItem;
  groupMemberLoading: GroupMemberState;
  member2status: MemberMapType;
  unReadCount: number;
  organizationInfo: OrzInfoType;
};

export const SET_FRIEND_LIST = "SET_FRIEND_LIST";
export const SET_ORIGIN_LIST = "SET_ORIGIN_LIST";
export const SET_GROUP_LIST = "SET_GROUP_LIST";
export const SET_BLACK_LIST = "SET_BLACK_LIST";
export const SET_RECV_FRIEND_APPLICATION_LIST = "SET_RECV_FRIEND_APPLICATION_LIST";
export const SET_SENT_FRIEND_APPLICATION_LIST = "SET_SENT_FRIEND_APPLICATION_LIST";
export const SET_RECV_GROUP_APPLICATION_LIST = "SET_RECV_GROUP_APPLICATION_LIST";
export const SET_SENT_GROUP_APPLICATION_LIST = "SET_SENT_GROUP_APPLICATION_LIST";
export const SET_GROUP_MEMBER_LIST = "SET_GROUP_MEMBER_LIST";
export const SET_GROUP_INFO = "SET_GROUP_INFO";
export const SET_CURRENT_MEMBER = "SET_CURRENT_MEMBER";
export const SET_GROUP_MEMBER_LOADING = "SET_GROUP_MEMBER_LOADING";
export const SET_MEMBER2STATUS = "SET_MEMBER2STATUS";
export const SET_UNREAD_COUNT = "SET_UNREAD_COUNT";
export const SET_ORGANIZATION_INFO = "SET_ORGANIZATION_INFO";
export const RESET_CONTACT_STORE = "RESET_CONTACT_STORE";

type SetFriendList = {
  type: typeof SET_FRIEND_LIST;
  payload: FriendItem[];
};

type SetOriginList = {
  type: typeof SET_ORIGIN_LIST;
  payload: Partial<OriginListType>;
};

type SetRecvFriendApplicationList = {
  type: typeof SET_RECV_FRIEND_APPLICATION_LIST;
  payload: FriendApplicationItem[];
};

type SetSentFriendApplicationList = {
  type: typeof SET_SENT_FRIEND_APPLICATION_LIST;
  payload: FriendApplicationItem[];
};

type SetGroupList = {
  type: typeof SET_GROUP_LIST;
  payload: GroupItem[];
};

type SetbBlackList = {
  type: typeof SET_BLACK_LIST;
  payload: BlackItem[];
};

type SetRecvGroupApplicationList = {
  type: typeof SET_RECV_GROUP_APPLICATION_LIST;
  payload: GroupApplicationItem[];
};

type SetSentGroupApplicationList = {
  type: typeof SET_SENT_GROUP_APPLICATION_LIST;
  payload: GroupApplicationItem[];
};

type SetGroupMemberList = {
  type: typeof SET_GROUP_MEMBER_LIST;
  payload: GroupMemberItem[];
};

type SetGroupInfo = {
  type: typeof SET_GROUP_INFO;
  payload: GroupItem;
};

type SetCurrentMember = {
  type: typeof SET_CURRENT_MEMBER;
  payload: GroupMemberItem;
};

type SetGroupMemberLoading = {
  type: typeof SET_GROUP_MEMBER_LOADING;
  payload: GroupMemberState;
};


type SetMember2Status = {
  type: typeof SET_MEMBER2STATUS;
  payload: MemberMapType;
};

type SetUnReadCount = {
  type: typeof SET_UNREAD_COUNT;
  payload: number;
};

type SetOrganizationInfo = {
  type: typeof SET_ORGANIZATION_INFO;
  payload: OrzInfoType;
};

type RestContactStore = {
  type: typeof RESET_CONTACT_STORE;
}

export type ContactActionTypes =
  | SetFriendList
  | SetOriginList
  | SetRecvFriendApplicationList
  | SetSentFriendApplicationList
  | SetGroupList
  | SetRecvGroupApplicationList
  | SetSentGroupApplicationList
  | SetUnReadCount
  | SetbBlackList
  | SetMember2Status
  | SetGroupMemberList
  | SetGroupInfo
  | SetCurrentMember
  | SetGroupMemberLoading
  | SetOrganizationInfo
  | RestContactStore;
