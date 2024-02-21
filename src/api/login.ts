import store from "../store";
import { BusinessUserInfo } from "../store/types/user";
import { request } from "../utils";

export enum UsedFor {
  Register = 1,
  Modify = 2,
  Login = 3,
}

export type DemoRegisterType = {
  phoneNumber: string;
  areaCode: string;
  verificationCode: string;
  password: string;
  faceURL: string;
  nickname: string;
  platform?: number;
  invitationCode?: string;
  operationID?: string;
  birth?: number;
  gender?: number;
  email?: string;
  deviceID?: string;
};

let platform = window.electron ? window.electron.platform : 5;

const getAreaCode = (code: string) => (code.includes("+") ? code : `+${code}`);

export const sendSms = (phoneNumber: string, areaCode: string, usedFor: UsedFor, invitationCode?: string): Promise<unknown> =>
  request.post("/account/code", JSON.stringify({ phoneNumber, areaCode: getAreaCode(areaCode), usedFor, invitationCode, operationID: Date.now() + "" }));

export const verifyCode = (phoneNumber: string, areaCode: string, verificationCode: string, usedFor: UsedFor = 1) =>
  request.post("/account/verify", JSON.stringify({ phoneNumber, areaCode: getAreaCode(areaCode), verificationCode, usedFor, operationID: Date.now() + "" }));

export const register = (data: DemoRegisterType) => {
  data.operationID = Date.now() + "";
  data.platform = platform;
  data.areaCode = getAreaCode(data.areaCode);
  return request.post("/account/password", JSON.stringify(data));
};

export const reset = (phoneNumber: string, areaCode: string, verificationCode: string, password: string) =>
  request.post("/account/reset_password", JSON.stringify({ phoneNumber, areaCode: getAreaCode(areaCode), verificationCode, password, platform, operationID: Date.now() + "" }));

export const modify = (userID: string, currentPassword: string, newPassword: string) =>
  request.post("/account/change_password", JSON.stringify({ userID, currentPassword, newPassword, operationID: Date.now() + "" }));

export const login = (phoneNumber: string, areaCode: string, password?: string, verificationCode?: string) => {
  return request.post("/account/login", JSON.stringify({ phoneNumber, areaCode: getAreaCode(areaCode), password, verificationCode, platform, operationID: Date.now() + "" }));
};

export const updateSelfInfo = (params: Partial<BusinessUserInfo>) => {
  return request.post("/user/update_user_info", JSON.stringify({ ...params, operationID: Date.now() + "" }), {
    headers: {
      token: localStorage.getItem(`accountProfile-${store.getState().user.selfInfo.userID}`) ?? "",
    },
  });
};

export const getUserInfoByBusiness = (userID: string) => {
  return request.post("/user/get_users_full_info", JSON.stringify({ userIDList: [userID], operationID: Date.now() + "" }), {
    headers: {
      token: localStorage.getItem(`accountProfile-${store.getState().user.selfInfo.userID ?? userID}`) ?? "",
    },
  });
};

export const searchUserInfoByBusiness = (content: string) => {
  console.log(store.getState().user.selfInfo);
  
  return request.post("/user/search_users_full_info", JSON.stringify({ content, pageNumber: 0, showNumber: 20, operationID: Date.now() + "" }), {
    headers: {
      token: localStorage.getItem(`accountProfile-${store.getState().user.selfInfo.userID}`) ?? "",
    },
  });
};
