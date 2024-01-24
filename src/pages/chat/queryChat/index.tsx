import { InfoCircleOutlined } from "@ant-design/icons";
import { useRequest, useUnmount } from "ahooks";
import { Layout } from "antd";
import { useEffect } from "react";
import { useParams } from "react-router-dom";

import { useConversationStore, useMessageStore } from "@/store";

import ChatContent from "./ChatContent";
import ChatFooter from "./ChatFooter";
import MultipleActionBar from "./ChatFooter/MultipleActionBar";
import ChatHeader from "./ChatHeader";
import useConversationState from "./useConversationState";
import { useMessageReceipt } from "./useMessageReceipt";

export const QueryChat = () => {
  const { conversationID } = useParams();

  const isCheckMode = useMessageStore((state) => state.isCheckMode);
  const updateCurrentConversation = useConversationStore(
    (state) => state.updateCurrentConversation,
  );
  const getHistoryMessageList = useMessageStore(
    (state) => state.getHistoryMessageListByReq,
  );

  const { loading, run, cancel } = useRequest(getHistoryMessageList, {
    manual: true,
  });

  const { getIsCanSendMessage, isMutedGroup, currentIsMuted } = useConversationState();
  useMessageReceipt();

  useEffect(() => {
    run();
    return () => {
      cancel();
    };
  }, [conversationID]);

  useUnmount(() => {
    updateCurrentConversation();
  });

  const switchFooter = () => {
    if (isCheckMode) {
      return <MultipleActionBar />;
    }
    if (!getIsCanSendMessage()) {
      let tip = "无法在已退出的群聊中发送消息";
      if (isMutedGroup) tip = "管理员或群主已开启全体禁言";
      if (currentIsMuted) tip = "您已被管理员或群主禁言";

      return (
        <div className="flex justify-center py-4.5 text-xs text-[var(--sub-text)]">
          <InfoCircleOutlined rev={undefined} />
          <span className="ml-1">{tip}</span>
        </div>
      );
    }
    return <ChatFooter />;
  };

  return (
    <Layout id="chat-container">
      <ChatHeader />
      {loading ? <div className="h-full">loading..</div> : <ChatContent />}
      {switchFooter()}
    </Layout>
  );
};
