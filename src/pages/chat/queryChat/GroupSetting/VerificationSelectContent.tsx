import { CheckOutlined } from "@ant-design/icons";
import { Spin } from "antd";
import { memo, useState } from "react";

import { GroupVerificationType } from "@/utils/open-im-sdk-wasm/types/enum";

export const verificationMenuList = [
  {
    title: "群成员邀请无需验证",
    type: GroupVerificationType.ApplyNeedInviteNot,
  },
  {
    title: "需要发送验证消息",
    type: GroupVerificationType.AllNeed,
  },
  {
    title: "允许所有人加群",
    type: GroupVerificationType.AllNot,
  },
];

const VerificationSelectContent = memo(
  ({
    activeType,
    tryChange,
  }: {
    activeType?: GroupVerificationType;
    tryChange: (type: GroupVerificationType) => Promise<void>;
  }) => {
    const [loading, setLoading] = useState(false);

    return (
      <Spin spinning={loading}>
        <div className="p-1">
          {verificationMenuList.map((item) => (
            <div
              className="flex cursor-pointer items-center rounded p-3 pr-2 text-xs hover:bg-[var(--primary-active)]"
              key={item.type}
              onClick={async () => {
                if (item.type !== activeType) {
                  setLoading(true);
                  await tryChange(item.type);
                  setLoading(false);
                }
              }}
            >
              <div className="w-40">{item.title}</div>
              {activeType === item.type && (
                <CheckOutlined className="text-[var(--primary)]" rev={undefined} />
              )}
            </div>
          ))}
        </div>
      </Spin>
    );
  },
);

export default VerificationSelectContent;
