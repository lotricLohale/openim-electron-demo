import { CloseOutlined, RightOutlined } from "@ant-design/icons";
import { Checkbox } from "antd";
import clsx from "clsx";
import { FC, memo } from "react";

import { BusinessUserInfoWithDepartment, Department } from "@/api/organization";
import OIMAvatar from "@/components/OIMAvatar";
import {
  ConversationItem,
  FriendUserItem,
  GroupItem,
} from "@/utils/open-im-sdk-wasm/types/entity";
import { SessionType } from "@/utils/open-im-sdk-wasm/types/enum";

interface ICheckItemProps {
  data: CheckListItem;
  isChecked?: boolean;
  showCheck?: boolean;
  disabled?: boolean;
  itemClick?: (data: CheckListItem) => void;
  cancelClick?: (data: CheckListItem) => void;
}

export type CheckListItem = Partial<
  FriendUserItem &
    ConversationItem &
    GroupItem & { disabled?: boolean } & Department &
    BusinessUserInfoWithDepartment
>;

const CheckItem: FC<ICheckItemProps> = (props) => {
  const { data, isChecked, showCheck, disabled, itemClick, cancelClick } = props;
  const showName =
    data.nickname ||
    data.groupName ||
    data.showName ||
    data.name ||
    data.user?.nickname;
  const isDisabled = disabled ?? data.disabled;
  const isDep = Boolean(data.departmentID);

  return (
    <div
      className={clsx(
        "mx-2 flex items-center justify-between rounded-md px-3.5 py-2.5 hover:bg-[var(--primary-active)]",
        { "cursor-pointer": showCheck },
      )}
      onClick={() => !isDisabled && itemClick?.(data)}
    >
      <div className="flex items-center">
        {showCheck && !isDep && (
          <Checkbox className="mr-3" checked={isChecked} disabled={isDisabled} />
        )}
        <OIMAvatar
          src={data.faceURL || data.user?.faceURL}
          text={showName}
          isgroup={
            Boolean(data.groupName) ||
            data.conversationType === SessionType.WorkingGroup
          }
          isdepartment={isDep}
        />
        <div className="ml-3 max-w-[120px] truncate">{showName}</div>
      </div>
      {showCheck ? (
        <RightOutlined className="cursor-pointer text-[#8e9ab0]" rev={undefined} />
      ) : (
        <CloseOutlined
          className="cursor-pointer text-[#8e9ab0]"
          rev={undefined}
          onClick={(e) => {
            e.stopPropagation();
            cancelClick?.(data);
          }}
        />
      )}
    </div>
  );
};

export default memo(CheckItem);
