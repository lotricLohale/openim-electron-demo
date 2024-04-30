import { v4 } from "uuid";
import store from "../store";
import { BusinessUserInfo } from "../store/types/user";
import { request } from "../utils";
import { AxiosResponse } from "axios";
import { myPost } from "../utils/request";

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

export const verifyCode = (params: { phoneNumber: string; areaCode: string; verificationCode: string; usedFor: number }) => myPost("/account/verify", params);

export const register = (data: DemoRegisterType) => {
  return request.post("/account/password", JSON.stringify(data));
};

export const reset = (phoneNumber: string, areaCode: string, verificationCode: string, password: string) =>
  request.post("/account/reset_password", JSON.stringify({ phoneNumber, areaCode: getAreaCode(areaCode), verificationCode, password, platform, operationID: Date.now() + "" }));

export const modify = (userID: string, currentPassword: string, newPassword: string) =>
  request.post("/account/change_password", JSON.stringify({ userID, currentPassword, newPassword, operationID: Date.now() + "" }));

export const login = (params: any) => {
  return request.post("/account/login", JSON.stringify(params));
};

export const updateSelfInfo = (params: Partial<BusinessUserInfo>) => {
  return request.post("/user/update_user_info", JSON.stringify({ ...params, operationID: Date.now() + "" }), {
    headers: {
      token: localStorage.getItem(`accountProfile-${store.getState().user.selfInfo.userID}`) ?? "",
    },
  });
};

export const getUserInfoByBusiness = (userID: string | Array<string>, token?: string) => {
  return request.post("/user/get_users_full_info", JSON.stringify({ userIDList: typeof userID === "string" ? [userID] : userID, operationID: Date.now() + "", platform }), {
    headers: {
      token: token ?? localStorage.getItem(`accountProfile-${store.getState().user.selfInfo.userID ?? userID}`) ?? "",
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

//检测是否注册
export const phoneLoginCheck = async (params: PhoneLoginInfo) => {
  const data = await request.post("/account/phone_login", { operationID: v4(), ...params });
  return data as any;
};

//检测是否注册
export const getSmsCode = async (params: SendSmsParams) => {
  let data;
  try {
    data = await request.post(
      "/account/code",
      {
        ...params,
      },
      {
        headers: {
          operationID: v4(),
        },
      }
    );
  } catch (error) {
    data = error;
  }
  return data as any;
};

// 发送邮箱验证码
export const sendEmailCode = async (params: sendEmailCodeParams) => {
  const data = await request.post(
    "/user/send_change_email_code",
    {
      OperationID: v4(),
      ...params,
    },
    {
      headers: {
        operationID: v4(),
      },
    }
  );
  return data;
};

// 校验邮箱验证码
export const verifyEmailCode = async (params: VerifyEmailCodeParams) => {
  const data = await request.post(
    "/account/verify_email_code",
    {
      operationID: v4(),
      ...params,
    },
    {
      headers: {
        operationID: v4(),
      },
    }
  );
  return data;
};

type VerifyEmailCodeParams = {
  operationID?: string;
  Code: string;
  Type: "ChangeEmail" | "EditPassword";
  Email?: string;
  Account?: string;
};

export type PhoneLoginInfo = {
  operationID?: string;
  phoneNumber: string;
};

type sendEmailCodeParams = {
  NewEmail: string;
  OperationID?: string;
};

export type SendSmsParams = {
  phoneNumber: string;
  areaCode: string;
  usedFor: UsedFor;
  platform: number;
  captchaType?: string;
  token?: string;
  pointJson?: string;
  operationID: string;
};
