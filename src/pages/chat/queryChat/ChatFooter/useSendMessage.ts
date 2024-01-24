import { useCallback } from "react";

import { IMSDK } from "@/layout/MainContentWrap";
import { ExMessageItem, useConversationStore, useMessageStore } from "@/store";
import emitter from "@/utils/events";
import { MessageStatus } from "@/utils/open-im-sdk-wasm/types/enum";
import { SendMsgParams } from "@/utils/open-im-sdk-wasm/types/params";

export type SendMessageParams = Partial<Omit<SendMsgParams, "message">> & {
  message: ExMessageItem;
  needPush?: boolean;
  isResend?: boolean;
};

export function useSendMessage() {
  const pushNewMessage = useMessageStore((state) => state.pushNewMessage);
  const updateOneMessage = useMessageStore((state) => state.updateOneMessage);
  const deleteAndPushOneMessage = useMessageStore(
    (state) => state.deleteAndPushOneMessage,
  );

  const sendMessage = useCallback(
    async ({ recvID, groupID, message, needPush, isResend }: SendMessageParams) => {
      const currentConversation = useConversationStore.getState().currentConversation;
      const sourceID = recvID || groupID;
      const inCurrentConversation =
        currentConversation?.userID === sourceID ||
        currentConversation?.groupID === sourceID ||
        !sourceID;
      needPush = needPush ?? inCurrentConversation;

      if (needPush) {
        pushNewMessage(message);
        emitter.emit("CHAT_LIST_SCROLL_TO_BOTTOM", false);
      }

      const options = {
        recvID: recvID ?? currentConversation?.userID ?? "",
        groupID: groupID ?? currentConversation?.groupID ?? "",
        message,
      };

      try {
        const { data: successMessage } = await IMSDK.sendMessage(options);
        if (isResend) {
          deleteAndPushOneMessage(successMessage as ExMessageItem);
          return;
        }
        updateOneMessage(successMessage as ExMessageItem, true);
      } catch (error) {
        updateOneMessage({
          ...message,
          status: MessageStatus.Failed,
        });
      }
    },
    [],
  );

  return {
    sendMessage,
    updateOneMessage,
  };
}
