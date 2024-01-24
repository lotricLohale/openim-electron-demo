import { CheckOutlined } from "@ant-design/icons";
import { Spin } from "antd";
import { memo, useState } from "react";

import { AllowType } from "@/utils/open-im-sdk-wasm/types/enum";

import { PermissionMethods } from "./useGroupSettings";

const memberPermissionList = [
  {
    title: "不允许查看其他群成员资料",
    method: "setGroupLookMemberInfo",
  },
  {
    title: "不允许添加群成员为好友",
    method: "setGroupApplyMemberFriend",
  },
];

const MemberPermissionSelectContent = memo(
  ({
    applyMemberFriend,
    lookMemberInfo,
    tryChange,
  }: {
    applyMemberFriend?: AllowType;
    lookMemberInfo?: AllowType;
    tryChange: (rule: AllowType, method: PermissionMethods) => Promise<void>;
  }) => {
    const [loading, setLoading] = useState(false);

    return (
      <Spin spinning={loading}>
        <div className="p-1">
          {memberPermissionList.map((item) => {
            const rule =
              item.method === "setGroupApplyMemberFriend"
                ? applyMemberFriend
                : lookMemberInfo;
            return (
              <div
                className="flex cursor-pointer items-center rounded p-3 pr-1 text-xs hover:bg-[var(--primary-active)]"
                key={item.method}
                onClick={async () => {
                  setLoading(true);
                  await tryChange(Number(!rule), item.method as PermissionMethods);
                  setLoading(false);
                }}
              >
                <div className="w-44">{item.title}</div>
                <div className="w-4">
                  {rule === AllowType.NotAllowed && (
                    <CheckOutlined className="text-[var(--primary)]" rev={undefined} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Spin>
    );
  },
);

export default MemberPermissionSelectContent;
