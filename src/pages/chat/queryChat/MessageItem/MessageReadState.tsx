import clsx from "clsx";
import { FC } from "react";

import { SessionType } from "@/utils/open-im-sdk-wasm/types/enum";

import { IMessageItemProps } from ".";

const MessageReadState: FC<IMessageItemProps> = ({ message }) => {
  const isSingle = message.sessionType === SessionType.Single;

  const getReadStateStr = () => {
    if (isSingle) {
      return message.isRead ? "已读" : "未读";
    }

    return "";
  };

  return (
    <div
      className={clsx("mt-1 text-xs text-[#0289FA]", {
        "!text-[var(--sub-text)]": message.isRead,
        "!cursor-pointer": !isSingle,
      })}
    >
      {getReadStateStr()}
    </div>
  );
};

export default MessageReadState;
