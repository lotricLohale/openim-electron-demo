import clsx from "clsx";
import { memo, useEffect } from "react";

import invite from "@/assets/images/chatSetting/invite.png";
import kick from "@/assets/images/chatSetting/kick.png";
import OIMAvatar from "@/components/OIMAvatar";
import useGroupMembers from "@/hooks/useGroupMembers";
import emitter from "@/utils/events";
import { GroupItem } from "@/utils/open-im-sdk-wasm/types/entity";

import styles from "./group-setting.module.scss";

const GroupMemberRow = ({
  currentGroupInfo,
  isNomal,
  updateTravel,
}: {
  currentGroupInfo: GroupItem;
  isNomal: boolean;
  updateTravel: () => void;
}) => {
  const { fetchState, getMemberData, resetState } = useGroupMembers();

  useEffect(() => {
    if (currentGroupInfo?.groupID) {
      getMemberData(true);
    }
    return () => {
      resetState();
    };
  }, [currentGroupInfo?.groupID]);

  const sliceCount = isNomal ? 17 : 16;

  const inviteMember = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
    emitter.emit("OPEN_CHOOSE_MODAL", {
      type: "INVITE_TO_GROUP",
      extraData: currentGroupInfo.groupID,
    });
  };

  const kickMember = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
    emitter.emit("OPEN_CHOOSE_MODAL", {
      type: "KICK_FORM_GROUP",
      extraData: currentGroupInfo.groupID,
    });
  };

  return (
    <div className="p-4">
      <div className="mb-3 font-medium">
        <span>{`群成员`}</span>
        <span className="ml-2">{`${currentGroupInfo?.memberCount}人`}</span>
      </div>
      <div className="flex flex-wrap items-center">
        {fetchState.groupMemberList.slice(0, sliceCount).map((member) => (
          <div
            key={member.userID}
            className={styles["member-item"]}
            onClick={() => window.userClick(member.userID, member.groupID)}
          >
            <OIMAvatar src={member.faceURL} text={member.nickname} size={36} />
            <div className="mt-2 max-w-full truncate text-xs">{member.nickname}</div>
          </div>
        ))}
        <div
          className={clsx(styles["member-item"], "cursor-pointer")}
          onClick={inviteMember}
        >
          <img width={36} src={invite} alt="invite" />
          <div className="mt-2 max-w-full truncate text-xs text-[var(--sub-text)]">
            添加
          </div>
        </div>
        {!isNomal && (
          <div
            className={clsx(styles["member-item"], "cursor-pointer")}
            onClick={kickMember}
          >
            <img width={36} src={kick} alt="kick" />
            <div className="mt-2 max-w-full truncate text-xs text-[var(--sub-text)]">
              移除
            </div>
          </div>
        )}
      </div>
      <div
        className="flex cursor-pointer items-center justify-center pt-2 text-xs text-[var(--primary)]"
        onClick={updateTravel}
      >
        查看更多
      </div>
    </div>
  );
};

export default memo(GroupMemberRow);
