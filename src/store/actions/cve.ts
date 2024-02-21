import { Dispatch } from "redux";
import { im } from "../../utils";
import { ConversationItem } from "../../utils/open_im_sdk/types";
import { CveActionTypes, RESET_CVE_STORE, SET_CUR_CVE, SET_CVE_HASMORE, SET_CVE_INIT_LOADING, SET_CVE_LIST } from "../types/cve";

export const setCveList = (value: ConversationItem[]): CveActionTypes => {
  return {
    type: SET_CVE_LIST,
    payload: value,
  };
};

export const setCurCve = (value: ConversationItem): CveActionTypes => {
  return {
    type: SET_CUR_CVE,
    payload: value,
  };
};

export const setCveInitLoading = (value: boolean): CveActionTypes => {
  return {
    type: SET_CVE_INIT_LOADING,
    payload: value,
  };
};

export const resetCveStore = (): CveActionTypes => {
  return { type: RESET_CVE_STORE };
};

export const setCveHasMore = (value: boolean): CveActionTypes => {
  return {
    type: SET_CVE_HASMORE,
    payload: value,
  };
};

export const getCveList = (prevList = [] as ConversationItem[]) => {
  return (dispatch: Dispatch) => {
    dispatch(setCveInitLoading(true));
    // im.getAllConversationList().then((res) => {
    im.getConversationListSplit({
      offset: prevList.length,
      count: 20,
    }).then((res) => {
      const tmpList = JSON.parse(res.data);
      dispatch(setCveList([...prevList, ...tmpList]));
      dispatch(setCveInitLoading(false));
      dispatch(setCveHasMore(tmpList.length === 20));
    });
  };
};
