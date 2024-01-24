import { FC, memo } from "react";

import { ExMessageItem, useConversationStore } from "@/store";
import { systemNotificationFormat } from "@/utils/imCommon";

const SystemNotification: FC<{ message: ExMessageItem }> = ({ message }) => {
  const revokeMap = useConversationStore((state) => state.revokeMap);
  const showEdit = Boolean(revokeMap[message.clientMsgID]);

  const perfix = showEdit
    ? `<span class='link-el ml-0.5' onclick='editRevoke("${message.clientMsgID}")'>重新编辑</span>`
    : "";

  return (
    <div
      className="relative mx-6 py-3 text-center text-xs text-[var(--sub-text)]"
      dangerouslySetInnerHTML={{
        __html: `${systemNotificationFormat(message)}${perfix}`,
      }}
    ></div>
  );
};

export default memo(SystemNotification);
