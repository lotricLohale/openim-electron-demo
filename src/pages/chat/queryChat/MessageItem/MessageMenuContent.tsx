import { memo } from "react";
import { useCopyToClipboard } from "react-use";

import check from "@/assets/images/messageMenu/check.png";
import copy from "@/assets/images/messageMenu/copy.png";
import emoji from "@/assets/images/messageMenu/emoji.png";
import forward from "@/assets/images/messageMenu/forward.png";
import remove from "@/assets/images/messageMenu/remove.png";
import reply from "@/assets/images/messageMenu/reply.png";
import revoke from "@/assets/images/messageMenu/revoke.png";
import { useCurrentMemberRole } from "@/hooks/useCurrentMemberRole";
import { IMSDK } from "@/layout/MainContentWrap";
import {
  ExMessageItem,
  useConversationStore,
  useMessageStore,
  useUserStore,
} from "@/store";
import { feedbackToast } from "@/utils/common";
import emitter from "@/utils/events";
import { isGroupSession } from "@/utils/imCommon";
import { MessageStatus, MessageType } from "@/utils/open-im-sdk-wasm/types/enum";

const messageMenuList = [
  // {
  //   idx: 0,
  //   title: "添加",
  //   icon: emoji,
  //   hidden: false,
  // },
  {
    idx: 1,
    title: "转发",
    icon: forward,
    hidden: false,
  },
  {
    idx: 2,
    title: "复制",
    icon: copy,
    hidden: false,
  },
  {
    idx: 3,
    title: "多选",
    icon: check,
    hidden: false,
  },
  {
    idx: 4,
    title: "回复",
    icon: reply,
    hidden: false,
  },
  {
    idx: 5,
    title: "撤回",
    icon: revoke,
    hidden: false,
  },
  {
    idx: 6,
    title: "删除",
    icon: remove,
    hidden: false,
  },
];

const canCopyTypes = [
  MessageType.TextMessage,
  MessageType.AtTextMessage,
  MessageType.QuoteMessage,
];

const canAddPhizTypes = [MessageType.PictureMessage, MessageType.FaceMessage];

const MessageMenuContent = ({
  message,
  conversationID,
  closeMenu,
}: {
  message: ExMessageItem;
  conversationID: string;
  closeMenu: () => void;
}) => {
  const selfUserID = useUserStore((state) => state.selfInfo.userID);
  const ownerUserID = useConversationStore(
    (state) => state.currentGroupInfo?.ownerUserID,
  );
  const updateCheckMode = useMessageStore((state) => state.updateCheckMode);
  const updateOneMessage = useMessageStore((state) => state.updateOneMessage);
  const deleteOneMessage = useMessageStore((state) => state.deleteOneMessage);
  const updateQuoteMessage = useConversationStore((state) => state.updateQuoteMessage);
  const addRevokedMessage = useConversationStore((state) => state.addRevokedMessage);

  const [_, copyToClipboard] = useCopyToClipboard();
  const { isNomal, isAdmin } = useCurrentMemberRole();

  const menuClick = (idx: number) => {
    switch (idx) {
      case 0:
        break;
      case 1:
        emitter.emit("OPEN_CHOOSE_MODAL", {
          type: "FORWARD_MESSAGE",
          extraData: message,
        });
        break;
      case 2:
        copyToClipboard(getCopyText());
        feedbackToast({ msg: "复制成功！" });
        break;
      case 3:
        updateOneMessage({ ...message, checked: true });
        updateCheckMode(true);
        break;
      case 4:
        updateQuoteMessage(message);
        break;
      case 5:
        tryRevoke();
        break;
      case 6:
        tryRemove();
        break;
      default:
        break;
    }
    closeMenu();
  };

  const tryRevoke = async () => {
    try {
      await IMSDK.revokeMessage({ conversationID, clientMsgID: message.clientMsgID });
      updateOneMessage({
        ...message,
        contentType: MessageType.RevokeMessage,
        notificationElem: {
          detail: JSON.stringify({
            clientMsgID: message.clientMsgID,
            revokeTime: Date.now(),
            revokerID: selfUserID,
            revokerNickname: "你",
            revokerRole: 0,
            seq: message.seq,
            sessionType: message.sessionType,
            sourceMessageSendID: message.sendID,
            sourceMessageSendTime: message.sendTime,
            sourceMessageSenderNickname: message.senderNickname,
          }),
        },
      });
      if (canCopyTypes.includes(message.contentType)) {
        addRevokedMessage({ ...message }, message.quoteElem?.quoteMessage);
      }
    } catch (error) {
      feedbackToast({ error });
    }
  };

  const tryRemove = async () => {
    try {
      await IMSDK.deleteMessage({ clientMsgID: message.clientMsgID, conversationID });
      deleteOneMessage(message.clientMsgID);
    } catch (error) {
      feedbackToast({ error });
    }
  };

  const getCopyText = () => {
    if (message.contentType === MessageType.AtTextMessage) {
      return message.atTextElem.text;
    }
    if (message.contentType === MessageType.QuoteMessage) {
      return message.quoteElem.text;
    }
    return message.textElem.content;
  };

  const senderIsOwner = message.sendID === ownerUserID;
  const isSender = message.sendID === selfUserID;
  const sendOneDayBefore = message.sendTime < Date.now() - 24 * 60 * 60 * 1000;
  const messageIsSuccess = message.status === MessageStatus.Succeed;

  return (
    <div className="p-1">
      {messageMenuList.map((menu) => {
        if (menu.idx === 0 && !canAddPhizTypes.includes(message.contentType)) {
          return null;
        }

        if (menu.idx === 2 && !canCopyTypes.includes(message.contentType)) {
          return null;
        }

        if (
          (menu.idx === 4 || menu.idx === 5) &&
          (!messageIsSuccess || message.contentType === MessageType.CustomMessage)
        ) {
          return null;
        }

        if (menu.idx === 5) {
          if (sendOneDayBefore) return null;

          if (!isSender && !isGroupSession(message.sessionType)) return null;

          if (isGroupSession(message.sessionType)) {
            if ((isAdmin && senderIsOwner) || (isNomal && !isSender)) {
              return null;
            }
          }
        }
        return (
          <div
            className="flex cursor-pointer items-center rounded px-3 py-2 hover:bg-[var(--primary-active)]"
            key={menu.idx}
            onClick={() => menuClick(menu.idx)}
          >
            <img className="mr-2 h-3.5" width={14} src={menu.icon} alt={menu.title} />
            <div className="text-xs">{menu.title}</div>
          </div>
        );
      })}
    </div>
  );
};

export default memo(MessageMenuContent);
