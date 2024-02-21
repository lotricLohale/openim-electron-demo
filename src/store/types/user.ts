import { FullUserItem } from "../../utils/open_im_sdk/types";

export type UserState = {
  selfInfo: FullSelfInfo;
  adminToken: string;
  fullState: string;
  selfInitLoading: boolean;
  appConfig: AppGlobalState
};

export type FullSelfInfo = BusinessUserInfo & FullUserItem

export type BusinessUserInfo = {
  account: string;
  allowAddFriend: number;
  allowBeep: number;
  allowVibration: number;
  areaCode: string;
  birth: number;
  email:  string;
  englishName: string;
  faceURL: string;
  forbidden: number;
  gender: number;
  hireDate: string;
  level: number;
  nickname: string;
  phoneNumber: string;
  telephone: string;
  userID: string
}


export type AppGlobalState = {
  discoverPageURL: string;
  adminURL: string;
  allowSendMsgNotFriend: number;
  ordinaryUserAddFriend: number;
  needInvitationCodeRegister: number;
  bossUserID: string;
  robots: string[];
}

export const SET_SELF_INFO = "SET_SELF_INFO";
export const SET_ADMIN_TOKEN = "SET_ADMIN_TOKEN";
export const SET_FULL_STATE = "SET_FULL_STATE";
export const SET_SELF_INIT_LOADING = "SET_SELF_INIT_LOADING";
export const SET_APP_CONFIG = "SET_APP_CONFIG";
export const RESET_USER_STORE = "RESET_USER_STORE";

type SetSelfInfo = {
  type: typeof SET_SELF_INFO;
  payload: FullUserItem;
};

type SetSelfToken = {
  type: typeof SET_ADMIN_TOKEN;
  payload: string;
};

type SetFullState = {
  type: typeof SET_FULL_STATE;
  payload: string;
};

type SetSelfInitLoading = {
  type: typeof SET_SELF_INIT_LOADING;
  payload: boolean;
};

type SetAppConfig = {
  type: typeof SET_APP_CONFIG;
  payload: AppGlobalState;
};

type ResetUserStore = {
  type: typeof RESET_USER_STORE
}

export type UserActionTypes = SetSelfInfo | SetSelfToken | SetFullState | SetSelfInitLoading | SetAppConfig | ResetUserStore;
