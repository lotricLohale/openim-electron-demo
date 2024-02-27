export type Itype = "checkLogin" | "login" | "loginWithCode" | "register" | "vericode" | "setPwd" | "setInfo" | "success" | "modifycode" | "modify" | "modifySend";

export type WrapFriendApplicationItem = FriendApplicationItem & { flag?: number };
export type WrapGroupApplicationItem = GroupApplicationItem & { flag?: number };

// api
export type StringMapType = {
  [name: string]: string;
};

export type String2IMGType = {
  [name: string]: File;
};

export type MemberMapType = {
  [userID: string]: ResItemType;
};

export type OnLineResType = {
  errCode: number;
  errMsg: string;
  data: ResItemType[];
};

export type RegistersType = {
  errCode: number;
  errMsg: string;
  data: string[];
};

export type CheckUpdateType = {
  errCode: number;
  errMsg: string;
  data: {
    fileURL: string;
    forceUpdate: boolean;
    hasNewVersion: boolean;
    yamlURL: string;
    version: string;
    update_log: string;
  };
};

export type ResItemType = {
  status: string;
  userID: string;
  detailPlatformStatus?: DetailType[];
};

export type DetailType = {
  platform: string;
  status: string;
};

export type LanguageType = "zh-cn" | "en";

export type MediaType = "video" | "audio";

export type ModalType = "create" | "invite" | "remove" | "forward" | "merge" | "rtc_invite" | "card_share" | "create_work" | "meeting_invite";

export type FaceType = "emoji" | "customEmoji";

export type CustomEmojiType = {
  url: string;
  width: string;
  height: string;
};

export type CommonContacts = {
  sourceID: string;
  userID: string;
  faceURL: string;
  nickname: string;
  owenerID: string;
  timestamp?: number;
};

export type OrzInfoType = {
  deps: DepartmentItem[];
  member: DepartmentMemberItem[];
};

export type GroupMemberState = {
  loading: boolean;
  hasMore: boolean;
};
