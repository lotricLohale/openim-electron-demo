import { Badge, Popover } from "antd";
import clsx from "clsx";
import { t } from "i18next";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import disturb from "@/assets/images/disturb.png";
import OIMAvatar from "@/components/OIMAvatar";
import { useConversationStore } from "@/store";
import { formatConversionTime, formatMessageByType } from "@/utils/imCommon";
import type {
  ConversationItem,
  ConversationItem as ConversationItemType,
  MessageItem,
} from "@/utils/open-im-sdk-wasm/types/entity";
import {
  GroupAtType,
  MessageReceiveOptType,
  SessionType,
} from "@/utils/open-im-sdk-wasm/types/enum";

import styles from "./conversation-item.module.scss";
import ConversationMenuContent from "./ConversationMenuContent";

interface IConversationProps {
  conversation: ConversationItemType;
}

const ConversationItem = ({ conversation }: IConversationProps) => {
  const navigate = useNavigate();
  const [showConversationMenu, setShowConversationMenu] = useState(false);
  const conversationID = useConversationStore(
    (state) => state.currentConversation?.conversationID,
  );
  const updateCurrentConversation = useConversationStore(
    (state) => state.updateCurrentConversation,
  );

  const toSpecifiedConversation = () => {
    updateCurrentConversation({ ...conversation });
    navigate(`/chat/${conversation.conversationID}`);
  };

  const closeConversationMenu = () => {
    setShowConversationMenu(false);
  };

  const getMessagePrefix = () => {
    if (conversation.draftText && !isActive) {
      return "[草稿]";
    }
    let prefix = "";

    if (notNomalReceive && conversation.unreadCount > 0) {
      prefix = `[${conversation.unreadCount}条]`;
    }

    if (atReminder) {
      switch (conversation.groupAtType) {
        case GroupAtType.AtAll:
          prefix = t("messageDescription.atAllPrefix");
          break;
        case GroupAtType.AtMe:
          prefix = t("messageDescription.atYouPrefix");
          break;
        case GroupAtType.AtAllAtMe:
          prefix = t("messageDescription.atYouPrefix");
          break;
        case GroupAtType.AtGroupNotice:
          prefix = t("messageDescription.groupAnnouncementPrefix");
          break;
      }
    }

    return prefix;
  };

  const atReminder = conversation.groupAtType !== GroupAtType.AtNormal;
  const isNotification = conversation.conversationType === SessionType.Notification;
  const getLatestMessageContent = () => {
    if (conversation.draftText && !isActive) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(conversation.draftText, "text/html");
      const atEls = doc.querySelectorAll("b.at-el");
      atEls.forEach((el) => {
        const text = el.textContent;
        const parent = el.parentNode;
        parent?.replaceChild(document.createTextNode(text!), el);
      });
      return doc.body.innerHTML;
    }
    if (conversation.latestMsg) {
      return formatMessageByType(JSON.parse(conversation.latestMsg) as MessageItem);
    }
    return "";
  };

  const latestMessageTime = formatConversionTime(conversation.latestMsgSendTime);

  const isActive =
    conversationID === conversation.conversationID || conversation.isPinned;
  const notNomalReceive = conversation.recvMsgOpt !== MessageReceiveOptType.Nomal;

  return (
    <Popover
      overlayClassName="conversation-popover"
      placement="bottomRight"
      title={null}
      arrow={false}
      open={showConversationMenu}
      onOpenChange={(vis) => setShowConversationMenu(vis)}
      content={
        <ConversationMenuContent
          conversation={conversation}
          closeConversationMenu={closeConversationMenu}
        />
      }
      trigger="contextMenu"
    >
      <div
        className={clsx(
          styles["conversation-item"],
          isActive && `bg-[var(--primary-active)]`,
          conversation.isPinned && styles["conversation-item-pinned"],
        )}
        onClick={toSpecifiedConversation}
      >
        <Badge size="small" count={notNomalReceive ? 0 : conversation.unreadCount}>
          <OIMAvatar
            src={conversation.faceURL}
            isgroup={Boolean(conversation.groupID)}
            isnotification={isNotification}
            text={conversation.showName}
          />
        </Badge>

        <div className={clsx("ml-3 flex-1 truncate", styles["content-wrap"])}>
          <div className="mb-1 truncate font-medium">{conversation.showName}</div>
          <div className="flex min-h-[16px] text-xs">
            <div
              className={clsx("mr-px text-[var(--primary)]", {
                "!text-[var(--sub-text)]": notNomalReceive && !atReminder,
              })}
            >
              {getMessagePrefix()}
            </div>
            <div className="truncate text-[rgba(81,94,112,0.5)]">
              {getLatestMessageContent()}
            </div>
          </div>
        </div>
        <div className="absolute right-3 flex flex-col items-end">
          <div className="mb-2 text-xs text-[var(--sub-text)]">{latestMessageTime}</div>
          <img
            className={notNomalReceive ? "visible" : "invisible"}
            src={disturb}
            width={14}
            alt="disturb"
          />
        </div>
      </div>
    </Popover>
  );
};

export default ConversationItem;
