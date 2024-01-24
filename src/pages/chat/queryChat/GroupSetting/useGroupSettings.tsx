import { t } from "i18next";
import { useCallback } from "react";

import { modal } from "@/AntdGlobalComp";
import { IMSDK } from "@/layout/MainContentWrap";
import { useConversationStore, useUserStore } from "@/store";
import { feedbackToast } from "@/utils/common";
import {
  AllowType,
  GroupStatus,
  GroupVerificationType,
} from "@/utils/open-im-sdk-wasm/types/enum";
import { GroupBaseInfo } from "@/utils/open-im-sdk-wasm/types/params";

export type PermissionMethods = "setGroupLookMemberInfo" | "setGroupApplyMemberFriend";

export function useGroupSettings({ closeOverlay }: { closeOverlay: () => void }) {
  const currentGroupInfo = useConversationStore((state) => state.currentGroupInfo);
  const selfUserID = useUserStore((state) => state.selfInfo.userID);

  const updateGroupInfo = useCallback(
    async (value: Omit<GroupBaseInfo, "groupID">) => {
      if (!currentGroupInfo) return;
      try {
        await IMSDK.setGroupInfo({
          ...value,
          groupID: currentGroupInfo.groupID,
        });
      } catch (error) {
        feedbackToast({ error, msg: t("toast.updateGroupInfoFailed") });
      }
    },
    [currentGroupInfo?.groupID],
  );

  const updateNickNameInGroup = useCallback(
    async (value: string) => {
      if (!currentGroupInfo) return;
      try {
        await IMSDK.setGroupMemberNickname({
          groupID: currentGroupInfo.groupID,
          userID: selfUserID,
          groupMemberNickname: value,
        });
      } catch (error) {
        feedbackToast({ error });
      }
    },
    [selfUserID, currentGroupInfo?.groupID],
  );

  const updateGroupVerification = useCallback(
    async (verification: GroupVerificationType) => {
      if (!currentGroupInfo) return;

      try {
        await IMSDK.setGroupVerification({
          groupID: currentGroupInfo?.groupID,
          verification,
        });
      } catch (error) {
        feedbackToast({ error, msg: t("toast.updateGroupVerificationFailed") });
      }
    },
    [currentGroupInfo?.groupID],
  );

  const updateGroupMuteAll = useCallback(async () => {
    if (!currentGroupInfo) return;
    const currentIsMute = currentGroupInfo.status === GroupStatus.Muted;
    const execFunc = async () => {
      try {
        await IMSDK.changeGroupMute({
          groupID: currentGroupInfo.groupID,
          isMute: !currentIsMute,
        });
      } catch (error) {
        feedbackToast({ error });
      }
    };
    if (!currentIsMute) {
      modal.confirm({
        title: "全体禁言",
        content: (
          <div className="flex items-baseline">
            <div>确认开启全体禁言吗？</div>
            <span className="text-xs text-[var(--sub-text)]">
              开启后仅群主和管理员可发言。
            </span>
          </div>
        ),
        onOk: execFunc,
      });
    } else {
      await execFunc();
    }
  }, [currentGroupInfo?.status, currentGroupInfo?.groupID]);

  const updateGroupMemberPermission = useCallback(
    async (rule: AllowType, method: PermissionMethods) => {
      if (!currentGroupInfo) return;

      try {
        await IMSDK[method]({
          groupID: currentGroupInfo.groupID,
          rule,
        });
      } catch (error) {
        feedbackToast({ error });
      }
    },
    [],
  );

  const tryDismissGroup = () => {
    if (!currentGroupInfo) return;

    modal.confirm({
      title: "解散群组",
      content: (
        <div className="flex items-baseline">
          <div>确认解散该群组吗？</div>
          <span className="text-xs text-[var(--sub-text)]">
            解除后将移除所有群成员。
          </span>
        </div>
      ),
      onOk: async () => {
        try {
          await IMSDK.dismissGroup(currentGroupInfo.groupID);
          closeOverlay();
        } catch (error) {
          feedbackToast({ error });
        }
      },
    });
  };

  const tryQuitGroup = () => {
    if (!currentGroupInfo) return;

    modal.confirm({
      title: "退出群组",
      content: (
        <div className="flex items-baseline">
          <div>确认退出该群组吗？</div>
          <span className="text-xs text-[var(--sub-text)]">
            退出后你将不再接收该群组消息。
          </span>
        </div>
      ),
      onOk: async () => {
        try {
          await IMSDK.quitGroup(currentGroupInfo.groupID);
          closeOverlay();
        } catch (error) {
          feedbackToast({ error });
        }
      },
    });
  };

  return {
    currentGroupInfo,
    updateGroupInfo,
    updateGroupMuteAll,
    updateNickNameInGroup,
    updateGroupVerification,
    updateGroupMemberPermission,
    tryQuitGroup,
    tryDismissGroup,
  };
}
