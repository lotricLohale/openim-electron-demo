import { ExclamationCircleFilled, LoadingOutlined } from "@ant-design/icons";
import { useLatest } from "ahooks";
import { Spin } from "antd";
import { FC, useEffect, useState } from "react";

import { IMSDK } from "@/layout/MainContentWrap";
import { useMessageStore } from "@/store";
import { MessageStatus } from "@/utils/open-im-sdk-wasm/types/enum";

import { useSendMessage } from "../ChatFooter/useSendMessage";
import { IMessageItemProps } from ".";
import styles from "./message-item.module.scss";

const MessageSuffix: FC<IMessageItemProps> = ({ message, conversationID }) => {
  const [count, setCount] = useState(0);
  const latestCount = useLatest(count);
  const [showSending, setShowSending] = useState(false);
  const deleteOneMessage = useMessageStore((state) => state.deleteOneMessage);

  const { sendMessage, updateOneMessage } = useSendMessage();

  const isShowLimitTimer = message.isRead && message.attachedInfoElem?.isPrivateChat;

  useEffect(() => {
    if (message.status !== MessageStatus.Sending) return;
    const timer = setTimeout(() => {
      if (message.status === MessageStatus.Sending) {
        setShowSending(true);
      }
    }, 1000);
    return () => {
      clearTimeout(timer);
    };
  }, [message.status]);

  useEffect(() => {
    if (!isShowLimitTimer) return;
    setCount(message.attachedInfoElem.burnDuration || 30);
    const timer = setInterval(() => {
      setCount((prev) => {
        if (prev === 0) {
          clearInterval(timer);
          removeMessage();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [isShowLimitTimer]);

  useEffect(() => {
    const currentConversationID = conversationID;
    return () => {
      if (message.attachedInfoElem?.isPrivateChat && latestCount.current !== 0) {
        removeMessage(currentConversationID);
      }
    };
  }, [message.attachedInfoElem?.isPrivateChat]);

  const removeMessage = async (currentConversationID?: string) => {
    await IMSDK.deleteMessage({
      clientMsgID: message.clientMsgID,
      conversationID: currentConversationID ?? conversationID!,
    });
    deleteOneMessage(message.clientMsgID);
  };

  const reSend = () => {
    updateOneMessage({ ...message, status: MessageStatus.Sending });
    sendMessage({ message, needPush: false, isResend: true });
  };

  return (
    <div className={styles.suffix}>
      {showSending && message.status === MessageStatus.Sending && (
        <Spin
          className="flex"
          indicator={<LoadingOutlined style={{ fontSize: 16 }} spin rev={undefined} />}
        />
      )}
      {message.status === MessageStatus.Failed && (
        <ExclamationCircleFilled
          className="text-base text-[var(--warn-text)]"
          rev={undefined}
          onClick={reSend}
        />
      )}
      {isShowLimitTimer && (
        <div className="text-xs text-[var(--sub-text)]">{`${count}s`}</div>
      )}
    </div>
  );
};

export default MessageSuffix;
