import { ConversationItem } from "../../utils/open_im_sdk/types";

export type CveState = {
  cves: ConversationItem[];
  curCve: ConversationItem;
  cveInitLoading: boolean;
  cveHasMore: boolean;
};

export const SET_CVE_LIST = "SET_CVE_LIST";
export const SET_CUR_CVE = "SET_CUR_CVE";
export const SET_CVE_INIT_LOADING = "SET_CVE_INIT_LOADING";
export const RESET_CVE_STORE = "RESET_CVE_STORE";
export const SET_CVE_HASMORE = "SET_CVE_HASMORE";

type SetCveList = {
  type: typeof SET_CVE_LIST;
  payload: ConversationItem[];
};

type SetCurCve = {
  type: typeof SET_CUR_CVE;
  payload: ConversationItem;
};

type SetCveInitLoading = {
  type: typeof SET_CVE_INIT_LOADING;
  payload: boolean;
};

type ResetCveStore = {
  type: typeof RESET_CVE_STORE
}

type SetCveHasMore = {
  type: typeof SET_CVE_HASMORE;
  payload: boolean;
}

export type CveActionTypes = SetCveList | SetCurCve | SetCveInitLoading | ResetCveStore | SetCveHasMore;
