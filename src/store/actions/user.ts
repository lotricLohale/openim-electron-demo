import { Dispatch } from "redux";
import { getAppConfig, getAuthToken } from "../../api/admin";
import { getUserInfoByBusiness } from "../../api/login";
import { filterEmptyValue, im, watermark } from "../../utils";
import { FullUserItem, PartialUserItem } from "../../utils/open_im_sdk/types";
import { SET_SELF_INFO, SET_SELF_INIT_LOADING, SET_FULL_STATE, SET_ADMIN_TOKEN, UserActionTypes, RESET_USER_STORE, SET_APP_CONFIG, AppGlobalState } from "../types/user";
import { getOriginIDList } from "./contacts";

export const setSelfInfo = (value: PartialUserItem): UserActionTypes => {
  return {
    type: SET_SELF_INFO,
    payload: value as FullUserItem,
  };
};

export const setAdminToken = (value: string): UserActionTypes => {
  return {
    type: SET_ADMIN_TOKEN,
    payload: value,
  };
};

export const setFullState = (value: string): UserActionTypes => {
  return {
    type: SET_FULL_STATE,
    payload: value,
  };
};

export const setSelfInitLoading = (value: boolean): UserActionTypes => {
  return {
    type: SET_SELF_INIT_LOADING,
    payload: value,
  };
};

export const setAppGlobalConfig = (value: AppGlobalState): UserActionTypes => {
  return {
    type: SET_APP_CONFIG,
    payload: value,
  };
};

export const resetUserStore = (): UserActionTypes => {
  return { type: RESET_USER_STORE };
};

export const getSelfInfo = () => {
  return (dispatch: Dispatch) => {
    dispatch(setSelfInitLoading(true));
    im.getSelfUserInfo().then(async (res) => {
      const selfInfo: PartialUserItem = JSON.parse(res.data);
      let businessData = {};
      try {
        const { data } = await im.getUsersInfo([selfInfo.userID]);
        try {
          businessData = JSON.parse(data)[0].friendInfo;
        } catch (error) {}
      } catch (error) {}
      filterEmptyValue(businessData);
      const fullInfo = { ...selfInfo, ...businessData };
      // watermark({content:`${fullInfo.nickname} ${fullInfo.phoneNumber?.slice(-4)}`})

      dispatch(setSelfInfo(fullInfo));
      dispatch(setSelfInitLoading(false));
    });
  };
};

export const getAdminToken = (uid?: string, secret?: string) => {
  return (dispatch: Dispatch) => {
    const localToken = localStorage.getItem("IMAdminToken");
    if (localToken) {
      dispatch(setAdminToken(localToken));
      dispatch(getOriginIDList() as any);
    } else {
      getAuthToken(uid, secret).then((res) => {
        localStorage.setItem("IMAdminToken", res.data.token);
        dispatch(setAdminToken(res.data.token));
        dispatch(getOriginIDList() as any);
      });
    }
  };
};

export const getAppGlobalConfig = () => {
  return (dispatch: Dispatch) => {
    getAppConfig().then(({ data }) => {
      if (!data.robots) {
        data.robots = [];
      }
      dispatch(setAppGlobalConfig(data));
    });
  };
};
