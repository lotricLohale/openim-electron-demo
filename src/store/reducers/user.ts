import { AppGlobalState, FullSelfInfo, RESET_USER_STORE, SET_APP_CONFIG } from "./../types/user";
import { SET_SELF_INFO, SET_SELF_INIT_LOADING, SET_ADMIN_TOKEN, UserActionTypes, UserState, SET_FULL_STATE } from "../types/user";

const initialState: UserState = {
  selfInfo: {} as FullSelfInfo,
  adminToken: "",
  fullState: "",
  selfInitLoading: true,
  appConfig: {
    robots: []
  } as unknown as AppGlobalState
};

let initialedState = { ...initialState };

const lastUid = localStorage.getItem("IMuserID") || "";
const lastUserStore = localStorage.getItem(`${lastUid}userStore`);
if (lastUserStore) {
  initialedState = JSON.parse(lastUserStore!);
}

export const userReducer = (state = initialedState, action: UserActionTypes): UserState => {
  switch (action.type) {
    case SET_SELF_INFO:
      return { ...state, selfInfo: { ...state.selfInfo, ...action.payload } };
    case SET_ADMIN_TOKEN:
      return { ...state, adminToken: action.payload };
    case SET_FULL_STATE:
      return { ...state, fullState: action.payload };
    case SET_SELF_INIT_LOADING:
      return { ...state, selfInitLoading: action.payload };
    case SET_APP_CONFIG:
      return { ...state, appConfig: action.payload };
    case RESET_USER_STORE:
      return { ...initialState,appConfig: state.appConfig };
    default:
      return state;
  }
};
