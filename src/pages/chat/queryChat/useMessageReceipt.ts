import { useEffect } from "react";

import { IMSDK } from "@/layout/MainContentWrap";
import { ExMessageItem, useConversationStore, useMessageStore } from "@/store";
import { CbEvents } from "@/utils/open-im-sdk-wasm/constant";
import { ReceiptInfo, WSEvent } from "@/utils/open-im-sdk-wasm/types/entity";
import { SessionType } from "@/utils/open-im-sdk-wasm/types/enum";

export function useMessageReceipt() {
  const currentConversation = useConversationStore(
    (state) => state.currentConversation,
  );
  const updateOneMessage = useMessageStore((state) => state.updateOneMessage);

  useEffect(() => {
    setIMListener();
    return () => {
      disposeIMListener();
    };
  }, [currentConversation?.groupID, currentConversation?.conversationType]);

  const setIMListener = () => {
    IMSDK.on(CbEvents.OnRecvC2CReadReceipt, singleMessageHasReadedHander);
    IMSDK.on(CbEvents.OnRecvGroupReadReceipt, groupMessageHasReadedHander);
  };

  const disposeIMListener = () => {
    IMSDK.off(CbEvents.OnRecvC2CReadReceipt, singleMessageHasReadedHander);
    IMSDK.off(CbEvents.OnRecvGroupReadReceipt, groupMessageHasReadedHander);
  };

  const singleMessageHasReadedHander = ({ data }: WSEvent<ReceiptInfo[]>) => {
    if (currentConversation?.conversationType !== SessionType.Single) return;

    data.map((receipt) => {
      (receipt.msgIDList ?? []).map((clientMsgID: string) => {
        updateOneMessage({
          clientMsgID,
          isRead: true,
        } as ExMessageItem);
      });
    });
  };

  const groupMessageHasReadedHander = ({ data }: WSEvent<ReceiptInfo[]>) => {
    if (!currentConversation?.groupID) return;

    data.forEach((receipt) => {
      if (receipt.groupID === currentConversation?.groupID) {
        const oldMessage = useMessageStore
          .getState()
          .historyMessageList.find(
            (message) => message.clientMsgID === receipt.msgIDList[0],
          );
        if (oldMessage) {
          updateOneMessage({
            ...oldMessage,
            isRead: true,
            attachedInfoElem: {
              ...oldMessage?.attachedInfoElem,
              groupHasReadInfo: {
                ...oldMessage?.attachedInfoElem.groupHasReadInfo,
                hasReadCount:
                  (oldMessage?.attachedInfoElem.groupHasReadInfo.hasReadCount ?? 0) + 1,
                hasReadUserIDList: [
                  ...(oldMessage?.attachedInfoElem.groupHasReadInfo.hasReadUserIDList ??
                    []),
                  receipt.userID,
                ],
              },
            },
          } as ExMessageItem);
        }
      }
    });
  };
}
