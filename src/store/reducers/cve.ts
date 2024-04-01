import { ConversationItem } from "../../utils/open_im_sdk/types";
import {
  CveState,
  CveActionTypes,
  SET_CVE_LIST,
  SET_CUR_CVE,
  SET_CVE_INIT_LOADING,
  RESET_CVE_STORE,
  SET_CVE_HASMORE,
} from "../types/cve";

const initialState: CveState = {
  cves: [],
  curCve: {} as ConversationItem,
  cveInitLoading: true,
  cveHasMore: true,
};

let initialedState = {...initialState}

const lastUid = localStorage.getItem('IMuserID') || ''
const lastCveStore = localStorage.getItem(`${lastUid}cveStore`)
if(lastCveStore){
  const tmp = JSON.parse(lastCveStore!)
  tmp.curCve = {} as ConversationItem
  initialedState = tmp
}

export const cveReducer = (
  state = initialedState,
  action: CveActionTypes
): CveState => {
  switch (action.type) {
    case SET_CVE_LIST:
      return { ...state, cves: action.payload };
    case SET_CUR_CVE:
      return { ...state, curCve: action.payload };
    case SET_CVE_INIT_LOADING:
      return { ...state, cveInitLoading: action.payload };
    case SET_CVE_HASMORE:
      return { ...state, cveHasMore: action.payload };
    case RESET_CVE_STORE:
      return {...initialState}
    default:
      return state;
  }
};
