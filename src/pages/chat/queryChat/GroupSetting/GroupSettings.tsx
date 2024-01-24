import { RightOutlined } from "@ant-design/icons";
import { Button, Divider, Popover, Upload } from "antd";
import clsx from "clsx";
import { memo, useCallback } from "react";
import { useCopyToClipboard } from "react-use";
import { v4 as uuidV4 } from "uuid";

import copy from "@/assets/images/chatSetting/copy.png";
import edit_avatar from "@/assets/images/chatSetting/edit_avatar.png";
import EditableContent from "@/components/EditableContent";
import OIMAvatar from "@/components/OIMAvatar";
import SettingRow from "@/components/SettingRow";
import { useConversationSettings } from "@/hooks/useConversationSettings";
import { useCurrentMemberRole } from "@/hooks/useCurrentMemberRole";
import { IMSDK } from "@/layout/MainContentWrap";
import { useConversationStore } from "@/store";
import { feedbackToast } from "@/utils/common";
import emitter from "@/utils/events";
import {
  GroupStatus,
  MessageReceiveOptType,
} from "@/utils/open-im-sdk-wasm/types/enum";

import MsgDestructSetting from "../MsgDestructSetting";
import GroupMemberRow from "./GroupMemberRow";
import MemberPermissionSelectContent from "./MemberPermissionSelectContent";
import { useGroupSettings } from "./useGroupSettings";
import VerificationSelectContent, {
  verificationMenuList,
} from "./VerificationSelectContent";

const GroupSettings = ({
  updateTravel,
  closeOverlay,
}: {
  updateTravel: () => void;
  closeOverlay: () => void;
}) => {
  const currentMemberNickInGroup = useConversationStore(
    (state) => state.currentMemberInGroup?.nickname,
  );

  const { isNomal, isOwner, isAdmin, isJoinGroup } = useCurrentMemberRole();

  const {
    currentConversation,
    updateConversationPin,
    updateConversationMessageRemind,
    clearConversationMessages,
    updateDestructDuration,
    updateConversationMsgDestructState,
  } = useConversationSettings();

  const {
    currentGroupInfo,
    updateGroupInfo,
    updateGroupMuteAll,
    updateNickNameInGroup,
    updateGroupVerification,
    updateGroupMemberPermission,
    tryQuitGroup,
    tryDismissGroup,
  } = useGroupSettings({ closeOverlay });

  const [_, copyToClipboard] = useCopyToClipboard();

  const customUpload = async ({ file }: { file: File }) => {
    try {
      const {
        data: { url },
      } = await IMSDK.uploadFile({
        name: file.name,
        contentType: file.type,
        uuid: uuidV4(),
        file,
      });
      await updateGroupInfo({ faceURL: url });
    } catch (error) {
      feedbackToast({ error: "修改群头像失败！" });
    }
  };

  const updateGroupName = useCallback(
    async (groupName: string) => {
      await updateGroupInfo({ groupName });
    },
    [updateGroupInfo],
  );

  const transferGroup = () => {
    emitter.emit("OPEN_CHOOSE_MODAL", {
      type: "TRANSFER_IN_GROUP",
      extraData: currentGroupInfo?.groupID,
    });
  };

  const hasPermissions = isAdmin || isOwner;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center p-4">
        <div className="flex items-center">
          <Upload
            accept="image/*"
            className={clsx({ "disabled-upload": isNomal })}
            openFileDialogOnClick={hasPermissions}
            showUploadList={false}
            customRequest={customUpload as any}
          >
            <div className="relative">
              <OIMAvatar
                isgroup
                src={currentGroupInfo?.faceURL}
                text={currentGroupInfo?.groupName}
              />
              {hasPermissions && (
                <img
                  className="absolute -bottom-1 -right-1"
                  width={15}
                  src={edit_avatar}
                  alt="edit avatar"
                />
              )}
            </div>
          </Upload>

          <EditableContent
            textClassName="font-medium"
            value={currentGroupInfo?.groupName}
            editable={hasPermissions}
            onChange={updateGroupName}
          />
        </div>
      </div>

      <Divider className="m-0 border-4 border-[#F4F5F7]" />
      {currentGroupInfo && isJoinGroup && (
        <GroupMemberRow
          currentGroupInfo={currentGroupInfo}
          isNomal={isNomal}
          updateTravel={updateTravel}
        />
      )}
      <Divider className="m-0 border-4 border-[#F4F5F7]" />

      <Divider className="m-0 border-4 border-[#F4F5F7]" />
      <SettingRow className="pb-2" title={"群聊ID"}>
        <div className="flex items-center">
          <span className="mr-1 text-xs text-[var(--sub-text)]">
            {currentGroupInfo?.groupID}
          </span>
          <img
            className="cursor-pointer"
            width={14}
            src={copy}
            alt=""
            onClick={() => {
              copyToClipboard(currentGroupInfo?.groupID ?? "");
              feedbackToast({ msg: "复制成功！" });
            }}
          />
        </div>
      </SettingRow>
      <SettingRow title={"群类型"}>
        <span className="text-xs text-[var(--sub-text)]">{"工作群"}</span>
      </SettingRow>
      <Divider className="m-0 border-4 border-[#F4F5F7]" />

      <SettingRow hidden={!isJoinGroup} className="pb-2" title={"我的群聊昵称"}>
        <EditableContent
          textClassName="text-xs text-[var(--sub-text)]"
          value={currentMemberNickInGroup}
          editable
          onChange={updateNickNameInGroup}
        />
      </SettingRow>
      <SettingRow
        hidden={!isJoinGroup}
        className="pb-2"
        title={"置顶会话"}
        value={currentConversation?.isPinned}
        tryChange={updateConversationPin}
      />
      <SettingRow
        hidden={!isJoinGroup}
        className="pb-2"
        title={"消息免打扰"}
        value={currentConversation?.recvMsgOpt === MessageReceiveOptType.NotNotify}
        tryChange={(checked) =>
          updateConversationMessageRemind(checked, MessageReceiveOptType.NotNotify)
        }
      />
      {hasPermissions && (
        <SettingRow
          className="pb-2"
          title={"全体禁言"}
          value={currentGroupInfo?.status === GroupStatus.Muted}
          tryChange={updateGroupMuteAll}
        />
      )}
      <SettingRow
        className="cursor-pointer"
        title={"清空聊天记录"}
        rowClick={clearConversationMessages}
      >
        <RightOutlined rev={undefined} />
      </SettingRow>

      <Divider className="m-0 border-4 border-[#F4F5F7]" />
      <MsgDestructSetting
        currentConversation={currentConversation}
        updateDestructDuration={updateDestructDuration}
        updateConversationMsgDestructState={updateConversationMsgDestructState}
      />

      {!hasPermissions ? (
        <Divider className="m-0 border-4 border-[#F4F5F7]" />
      ) : (
        <>
          <Divider className="m-0 border-4 border-[#F4F5F7]" />
          <SettingRow className="cursor-pointer pb-2" title={"群聊验证"}>
            <Popover
              content={
                <VerificationSelectContent
                  activeType={currentGroupInfo?.needVerification}
                  tryChange={updateGroupVerification}
                />
              }
              trigger="click"
              placement="topLeft"
              title={null}
              arrow={false}
            >
              <div className="flex items-center">
                <span className="mr-1 text-xs text-[var(--sub-text)]">
                  {
                    verificationMenuList[Number(currentGroupInfo?.needVerification)]
                      ?.title
                  }
                </span>
                <RightOutlined rev={undefined} />
              </div>
            </Popover>
          </SettingRow>
          <Popover
            content={
              <MemberPermissionSelectContent
                applyMemberFriend={currentGroupInfo?.applyMemberFriend}
                lookMemberInfo={currentGroupInfo?.lookMemberInfo}
                tryChange={updateGroupMemberPermission}
              />
            }
            trigger="click"
            placement="topRight"
            title={null}
            arrow={false}
          >
            <div>
              <SettingRow className="cursor-pointer" title={"群成员权限"}>
                <RightOutlined rev={undefined} />
              </SettingRow>
            </div>
          </Popover>
          <Divider className="m-0 border-4 border-[#F4F5F7]" />
        </>
      )}

      {isOwner && (
        <>
          <Divider className="m-0 border-4 border-[#F4F5F7]" />
          <SettingRow
            className="cursor-pointer"
            title={"转让群组"}
            rowClick={transferGroup}
          >
            <RightOutlined rev={undefined} />
          </SettingRow>
        </>
      )}

      <div className="flex-1" />
      {isJoinGroup && (
        <div className="flex w-full justify-center pb-3 pt-24">
          {!isOwner ? (
            <Button type="primary" danger ghost onClick={tryQuitGroup}>
              退出群组
            </Button>
          ) : (
            <Button type="primary" danger onClick={tryDismissGroup}>
              解散群组
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(GroupSettings);
