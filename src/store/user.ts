import { t } from "i18next";
import { create } from "zustand";

import { BusinessUserInfo, getAppConfig, getBusinessUserInfo } from "@/api/login";
import { getMomentsUnreadCount } from "@/api/moments";
import { getOrgnizationInfo, OrganizationInfo } from "@/api/organization";
import { IMSDK } from "@/layout/MainContentWrap";
import router from "@/routes";
import { feedbackToast } from "@/utils/common";
import { clearIMProfile, getLocale, setLocale } from "@/utils/storage";

import { useContactStore } from "./contact";
import { useConversationStore } from "./conversation";
import { AppConfig, AppSettings, UserStore } from "./type";

export const useUserStore = create<UserStore>()((set, get) => ({
  selfInfo: {} as BusinessUserInfo,
  organizationInfo: {} as OrganizationInfo,
  appConfig: {} as AppConfig,
  appSettings: {
    locale: getLocale(),
    closeAction: "miniSize",
  },
  workMomentsUnreadCount: 0,
  getSelfInfoByReq: () => {
    IMSDK.getSelfUserInfo<BusinessUserInfo>()
      .then(async ({ data }) => {
        let organizationData = {} as OrganizationInfo;
        try {
          const {
            data: { users },
          } = await getBusinessUserInfo([data.userID]);
          data = { ...data, ...users[0] };
          const res = await getOrgnizationInfo();
          organizationData = res.data;
        } catch (error) {
          console.log("getBusinessUserInfo failed");
          console.log(error);
        }
        set(() => ({ selfInfo: data, organizationInfo: organizationData }));
      })
      .catch((error) => {
        feedbackToast({ error, msg: t("toast.getSelfInfoFailed") });
        get().userLogout();
      });
  },
  updateSelfInfo: (info: Partial<BusinessUserInfo>) => {
    set((state) => ({ selfInfo: { ...state.selfInfo, ...info } }));
  },
  getAppConfigByReq: async () => {
    let config = {} as AppConfig;
    try {
      const { data } = await getAppConfig();
      config = data.config ?? {};
    } catch (error) {
      console.error("get app config err");
    }
    set((state) => ({ appConfig: { ...state.appConfig, ...config } }));
  },
  updateAppSettings: (settings: Partial<AppSettings>) => {
    if (settings.locale) {
      setLocale(settings.locale);
    }
    set((state) => ({ appSettings: { ...state.appSettings, ...settings } }));
  },
  userLogout: async (force?: boolean) => {
    if (!force) await IMSDK.logout();
    clearIMProfile();
    set({ selfInfo: {} as BusinessUserInfo });
    useContactStore.getState().clearContactStore();
    useConversationStore.getState().clearConversationStore();
    router.navigate("/login");
  },
  getWorkMomentsUnreadCount: async () => {
    try {
      const { data } = await getMomentsUnreadCount();
      set({ workMomentsUnreadCount: data.total });
    } catch (error) {
      console.error("get work moments unread count err");
    }
  },
  updateWorkMomentsUnreadCount: (count = 0) => {
    set({ workMomentsUnreadCount: count });
  },
}));
