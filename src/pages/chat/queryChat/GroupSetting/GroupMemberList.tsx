import { ArrowLeftOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import { Empty, Modal, Spin, Tooltip } from "antd";
import clsx from "clsx";
import { t } from "i18next";
import {
  FC,
  forwardRef,
  ForwardRefRenderFunction,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Virtuoso } from "react-virtuoso";

import { modal } from "@/AntdGlobalComp";
import member_admin from "@/assets/images/chatSetting/member_admin.png";
import member_admin_active from "@/assets/images/chatSetting/member_admin_active.png";
import member_delete from "@/assets/images/chatSetting/member_delete.png";
import member_mute from "@/assets/images/chatSetting/member_mute.png";
import member_mute_active from "@/assets/images/chatSetting/member_mute_active.png";
import OIMAvatar from "@/components/OIMAvatar";
import { useCurrentMemberRole } from "@/hooks/useCurrentMemberRole";
import useGroupMembers, { REACH_SEARCH_FLAG } from "@/hooks/useGroupMembers";
import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";
import { IMSDK } from "@/layout/MainContentWrap";
import { useUserStore } from "@/store";
import { feedbackToast } from "@/utils/common";
import { GroupMemberItem } from "@/utils/open-im-sdk-wasm/types/entity";
import { GroupMemberRole } from "@/utils/open-im-sdk-wasm/types/enum";

import styles from "./group-setting.module.scss";

export interface GroupMemberListHandle {
  searchMember: (keyword: string) => void;
}

interface IGroupMemberListProps {
  isSearching: boolean;
}

const GroupMemberList: ForwardRefRenderFunction<
  GroupMemberListHandle,
  IGroupMemberListProps
> = ({ isSearching }, ref) => {
  const selfUserID = useUserStore((state) => state.selfInfo.userID);
  const { isAdmin, isOwner, currentMemberInGroup } = useCurrentMemberRole();
  const { fetchState, getMemberData, searchMember, resetState } = useGroupMembers();

  const muteModalRef = useRef<OverlayVisibleHandle>(null);
  const choosedMember = useRef<GroupMemberItem | null>(null);

  useEffect(() => {
    if (currentMemberInGroup?.groupID) {
      getMemberData(true);
    }
    return () => {
      resetState();
    };
  }, [currentMemberInGroup?.groupID]);

  useImperativeHandle(ref, () => ({
    searchMember,
  }));

  const endReached = () => {
    if (!isSearching) {
      getMemberData();
    } else {
      searchMember(REACH_SEARCH_FLAG);
    }
  };

  const tryUpdateMute = useCallback((member: GroupMemberItem) => {
    choosedMember.current = member;
    muteModalRef.current?.openOverlay();
  }, []);

  const updateMuteState = useCallback(async (mutedSeconds: number) => {
    try {
      await IMSDK.changeGroupMemberMute({
        groupID: choosedMember.current!.groupID,
        userID: choosedMember.current!.userID,
        mutedSeconds,
      });
    } catch (error) {
      feedbackToast({ error });
    }
  }, []);

  const dataSource = isSearching
    ? fetchState.searchMemberList
    : fetchState.groupMemberList;

  return (
    <div className="h-full px-2 py-2.5">
      {isSearching && dataSource.length === 0 ? (
        <Empty
          className="flex h-full flex-col items-center justify-center"
          description={t("empty.noSearchResults")}
        />
      ) : (
        <Virtuoso
          className="h-full overflow-x-hidden"
          data={dataSource}
          endReached={endReached}
          components={{
            Header: () => (fetchState.loading ? <div>loading...</div> : null),
          }}
          itemContent={(_, member) => (
            <MemberItem
              member={member}
              selfUserID={selfUserID}
              currentIsAdmin={isAdmin}
              currentIsOwner={isOwner}
              tryUpdateMute={tryUpdateMute}
            />
          )}
        />
      )}
      <ForwardMuteModal ref={muteModalRef} updateMuteState={updateMuteState} />
    </div>
  );
};

export default forwardRef(GroupMemberList);

interface IMemberItemProps {
  member: GroupMemberItem;
  selfUserID: string;
  currentIsOwner: boolean;
  currentIsAdmin: boolean;
  tryUpdateMute: (member: GroupMemberItem) => void;
}

const MemberItem = memo(
  ({
    member,
    selfUserID,
    currentIsOwner,
    currentIsAdmin,
    tryUpdateMute,
  }: IMemberItemProps) => {
    const isOwner = member.roleLevel === GroupMemberRole.Owner;
    const isAdmin = member.roleLevel === GroupMemberRole.Admin;
    const isMuted = member.muteEndTime > Date.now() / 1000;

    const { runAsync, loading } = useRequest(IMSDK.setGroupMemberRoleLevel, {
      manual: true,
    });

    const getShowTools = () => {
      if (currentIsOwner) {
        return selfUserID !== member.userID;
      }
      if (currentIsAdmin) {
        return !isOwner && !isAdmin;
      }
      return false;
    };

    const tryKick = () => {
      modal.confirm({
        title: "踢出成员",
        content: `确认将${member.nickname}踢出群聊吗？`,
        onOk: async () => {
          try {
            await IMSDK.kickGroupMember({
              groupID: member.groupID,
              userIDList: [member.userID],
              reason: "",
            });
          } catch (error) {
            feedbackToast({ error });
          }
        },
      });
    };

    const adminChange = async () => {
      try {
        await runAsync({
          groupID: member.groupID,
          userID: member.userID,
          roleLevel: isAdmin ? GroupMemberRole.Nomal : GroupMemberRole.Admin,
        });
      } catch (error) {
        feedbackToast({ error });
      }
    };

    return (
      <Spin spinning={loading}>
        <div className={styles["list-member-item"]}>
          <div
            className="flex items-center overflow-hidden"
            onClick={() => window.userClick(member.userID, member.groupID)}
          >
            {}
            <OIMAvatar src={member.faceURL} text={member.nickname} />
            <div className="ml-3 flex items-center">
              <div className="max-w-[120px] truncate">{member.nickname}</div>
              {isOwner && (
                <span className="ml-2 rounded border border-[#FF9831] px-1 text-xs text-[#FF9831]">
                  群主
                </span>
              )}
              {isAdmin && (
                <span className="ml-2 rounded border border-[#0289FA] px-1 text-xs text-[#0289FA]">
                  管理员
                </span>
              )}
            </div>
          </div>
          {getShowTools() && (
            <div className={styles["tools-row"]}>
              <Tooltip title="禁言">
                <div
                  className="w-[60px] cursor-pointer"
                  onClick={() => tryUpdateMute(member)}
                >
                  <img
                    width={60}
                    src={isMuted ? member_mute_active : member_mute}
                    alt=""
                  />
                </div>
              </Tooltip>
              {currentIsOwner && (
                <Tooltip title="设为管理员">
                  <div className="w-[60px] cursor-pointer" onClick={adminChange}>
                    <img
                      width={60}
                      src={isAdmin ? member_admin_active : member_admin}
                      alt=""
                    />
                  </div>
                </Tooltip>
              )}
              <Tooltip title="踢出">
                <div className="w-[60px] cursor-pointer" onClick={tryKick}>
                  <img width={60} src={member_delete} alt="" />
                </div>
              </Tooltip>
            </div>
          )}
        </div>
      </Spin>
    );
  },
);

const MuteOptions = [
  {
    title: "10分钟",
    value: 10 * 60,
  },
  {
    title: "1小时",
    value: 60 * 60,
  },
  {
    title: "12小时",
    value: 12 * 60 * 60,
  },
  {
    title: "1天",
    value: 24 * 60 * 60,
  },
  {
    title: "取消禁言",
    value: 0,
  },
];

const MuteModal: ForwardRefRenderFunction<
  OverlayVisibleHandle,
  {
    updateMuteState: (muteTime: number) => Promise<void>;
  }
> = ({ updateMuteState }, ref) => {
  const [selectedOption, setSelectedOption] = useState<number>();
  const { closeOverlay, isOverlayOpen } = useOverlayVisible(ref);

  const { loading, runAsync } = useRequest(updateMuteState, { manual: true });

  const saveMute = async () => {
    if (selectedOption === undefined) {
      return;
    }
    await runAsync(selectedOption);
    closeOverlay();
  };

  return (
    <Modal
      title={null}
      footer={null}
      closable={false}
      open={isOverlayOpen}
      destroyOnClose
      centered
      onCancel={closeOverlay}
      width={320}
      className="no-padding-modal"
    >
      <Spin spinning={loading}>
        <div className="py-6">
          <div className="flex items-center justify-between px-5">
            <ArrowLeftOutlined
              className="cursor-pointer !text-[#8e9aaf]"
              onClick={closeOverlay}
            />
            <div>设置禁言</div>
            <span className="cursor-pointer text-[var(--primary)]" onClick={saveMute}>
              保存
            </span>
          </div>
          <div className="mt-5">
            {MuteOptions.map((option) => (
              <div
                key={option.value}
                className={clsx(
                  "flex cursor-pointer items-center justify-between px-6 py-4 hover:bg-[var(--primary-active)]",
                  { "bg-[var(--primary-active)]": selectedOption === option.value },
                )}
                onClick={() => setSelectedOption(option.value)}
              >
                <span>{option.title}</span>
                {selectedOption === option.value && (
                  <CheckOutlined className="!text-[var(--primary)]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </Spin>
    </Modal>
  );
};

const ForwardMuteModal = forwardRef(MuteModal);
