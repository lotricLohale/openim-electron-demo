import clsx from "clsx";
import { useEffect, useState } from "react";

import member_etc from "@/assets/images/common/member_etc.png";
import OIMAvatar from "@/components/OIMAvatar";
import { IMSDK } from "@/layout/MainContentWrap";
import { GroupMemberItem } from "@/utils/open-im-sdk-wasm/types/entity";

interface IGroupProfileProps {
  memberInfo: GroupMemberItem;
  inviteeUserIDList: string[];
  groupID: string;
}
export const GroupProfile = ({
  groupID,
  memberInfo,
  inviteeUserIDList,
}: IGroupProfileProps) => {
  const [invitedList, setInvitedList] = useState<GroupMemberItem[]>([]);

  useEffect(() => {
    IMSDK.getSpecifiedGroupMembersInfo<GroupMemberItem[]>({
      groupID,
      userIDList: inviteeUserIDList,
    })
      .then(({ data }) => setInvitedList(data))
      .catch(() => setInvitedList([]));
  }, []);

  return (
    <div className="absolute top-[6%] w-full px-6">
      <div className="flex items-center">
        <OIMAvatar src={memberInfo.faceURL} text={memberInfo.nickname} />
        <div className="ml-3">
          <div>{`${memberInfo.nickname}邀请你加入通话`}</div>
          <div>{`${inviteeUserIDList.length}人正在通话`}</div>
        </div>
      </div>
      <div className="mt-5 flex">
        {invitedList.slice(0, 8).map((item, idx) => (
          <div
            key={item.userID}
            className={clsx("mb-3 mr-3 flex w-9 flex-col items-center", {
              "mr-0": idx === 8,
            })}
          >
            <OIMAvatar src={item.faceURL} text={item.nickname} />
          </div>
        ))}
        {inviteeUserIDList.length > 8 && <OIMAvatar src={member_etc} />}
      </div>
    </div>
  );
};
