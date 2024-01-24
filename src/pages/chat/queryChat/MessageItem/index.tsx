import { Checkbox, Popover } from "antd";
import { CheckboxChangeEvent } from "antd/es/checkbox";
import clsx from "clsx";
import { FC, memo, useCallback, useEffect, useRef, useState } from "react";

import OIMAvatar from "@/components/OIMAvatar";
import { IMSDK } from "@/layout/MainContentWrap";
import { ExMessageItem, useMessageStore } from "@/store";
import { formatMessageTime } from "@/utils/imCommon";
import { GroupMemberItem, MergeElem } from "@/utils/open-im-sdk-wasm/types/entity";
import { MessageStatus, MessageType } from "@/utils/open-im-sdk-wasm/types/enum";

import AnnouncementRenderer from "./AnnouncementRender";
import CardMessageRenderer from "./CardMessageRenderer";
import CatchMessageRender from "./CatchMsgRenderer";
import CustomMessageSwitcher from "./CustomMessageSwitcher";
import FileMessageRenderer from "./FileMessageRenderer";
import LocationMessageRenderer from "./LocationMessageRenderer";
import MediaMessageRender from "./MediaMessageRender";
import MergeMessageRenderer from "./MergeMessageRenderer";
import styles from "./message-item.module.scss";
import MessageItemErrorBoundary from "./MessageItemErrorBoundary";
import MessageMenuContent from "./MessageMenuContent";
import MessageReadState from "./MessageReadState";
import MessageSuffix from "./MessageSuffix";
import QuoteMessageRenderer from "./QuoteMessageRenderer";
import TextMessageRender from "./TextMessageRender";
import VoiceMessageRender from "./VoiceMessageRender";

export interface IMessageItemProps {
  message: ExMessageItem;
  isSender: boolean;
  disabled?: boolean;
  conversationID?: string;
  messageUpdateFlag?: string;
  showAlbum?: (clientMsgID: string) => void;
  showMergeModal?: (data: MergeElem) => void;
  getAnnouncementPusher?: (userID: string) => void;
}

const components: Record<number, FC<IMessageItemProps>> = {
  [MessageType.TextMessage]: TextMessageRender,
  [MessageType.AtTextMessage]: TextMessageRender,
  [MessageType.QuoteMessage]: TextMessageRender,
  [MessageType.VoiceMessage]: VoiceMessageRender,
  [MessageType.PictureMessage]: MediaMessageRender,
  [MessageType.VideoMessage]: MediaMessageRender,
  [MessageType.CardMessage]: CardMessageRenderer,
  [MessageType.FileMessage]: FileMessageRenderer,
  [MessageType.CustomMessage]: CustomMessageSwitcher,
  [MessageType.LocationMessage]: LocationMessageRenderer,
  [MessageType.MergeMessage]: MergeMessageRenderer,
  [MessageType.GroupAnnouncementUpdated]: AnnouncementRenderer,
};

const MessageItem: FC<IMessageItemProps> = ({
  message,
  disabled,
  isSender,
  conversationID,
  showAlbum,
  showMergeModal,
}) => {
  const messageWrapRef = useRef<HTMLDivElement>(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [announcementPusher, setAnnouncementPusher] = useState<GroupMemberItem>();
  const isCheckMode = useMessageStore((state) => state.isCheckMode);
  const updateMessage = useMessageStore((state) => state.updateOneMessage);
  const MessageRenderComponent = components[message.contentType] || CatchMessageRender;

  const isQuoteMessage = message.contentType === MessageType.QuoteMessage;

  useEffect(() => {
    if (disabled) return;
    const observer = getMessageVisible();
    return () => {
      observer?.disconnect();
    };
  }, []);

  const onCheckChange = (e: CheckboxChangeEvent) => {
    updateMessage({ ...message, checked: e.target.checked });
  };

  const tryShowUserCard = useCallback(() => {
    if (disabled) return;
    window.userClick(message.sendID, message.groupID);
  }, []);

  const markMessageAsRead = () => {
    IMSDK.markMessagesAsReadByMsgID({
      conversationID: conversationID!,
      clientMsgIDList: [message.clientMsgID],
    });
    updateMessage({
      clientMsgID: message.clientMsgID,
      isRead: true,
      isAppend: false,
    } as ExMessageItem);
  };

  const getMessageVisible = () => {
    if (isSender || message.isRead || !messageWrapRef.current || isCustomMessage) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.intersectionRatio > 0.5 || message.attachedInfoElem?.isPrivateChat) {
          markMessageAsRead();
          observer.disconnect();
        }
      });
    });
    observer.observe(messageWrapRef.current);
    return observer;
  };

  const closeMessageMenu = useCallback(() => {
    setShowMessageMenu(false);
  }, []);

  const getAnnouncementPusher = useCallback(async (userID: string) => {
    try {
      const { data } = await IMSDK.getSpecifiedGroupMembersInfo<GroupMemberItem[]>({
        groupID: message.groupID,
        userIDList: [userID],
      });
      setAnnouncementPusher(data[0]);
    } catch (error) {
      console.log(error);
    }
  }, []);

  const messageIsSuccess = message.status === MessageStatus.Succeed;
  const isAnnouncement = message.contentType === MessageType.GroupAnnouncementUpdated;
  const isCustomMessage = message.contentType === MessageType.CustomMessage;
  const showMessageReadState =
    isSender && messageIsSuccess && !isAnnouncement && !isCustomMessage;
  const canShowMessageMenu = !disabled && !isAnnouncement;

  return (
    <div
      className={clsx(
        "relative flex select-text px-5 py-3",
        message.gapTime && "!pt-6",
        message.errCode && "!pb-6",
        isCheckMode && "cursor-pointer",
      )}
      onClick={() =>
        isCheckMode &&
        onCheckChange({
          target: { checked: !message.checked },
        } as CheckboxChangeEvent)
      }
    >
      {isCheckMode && (
        <Checkbox
          checked={message.checked}
          disabled={false}
          onChange={onCheckChange}
          className="pointer-events-none mr-5 h-9"
        />
      )}
      <div
        className={clsx(
          styles["message-container"],
          isSender && styles["message-container-sender"],
          isCheckMode && "pointer-events-none",
        )}
      >
        <OIMAvatar
          size={36}
          src={announcementPusher?.faceURL ?? message.senderFaceUrl}
          text={announcementPusher?.nickname ?? message.senderNickname}
          onClick={tryShowUserCard}
        />
        <div className={styles["message-wrap"]} ref={messageWrapRef}>
          <div className={styles["message-profile"]}>
            <div
              title={message.senderNickname}
              className={clsx(
                "max-w-[30%] truncate text-[var(--sub-text)]",
                isSender ? "ml-2" : "mr-2",
              )}
            >
              {announcementPusher?.nickname ?? message.senderNickname}
            </div>
            <div className="text-[var(--sub-text)]">
              {formatMessageTime(message.sendTime)}
            </div>
          </div>

          <Popover
            className={styles["menu-wrap"]}
            content={
              <MessageMenuContent
                message={message}
                conversationID={conversationID!}
                closeMenu={closeMessageMenu}
              />
            }
            title={null}
            trigger="contextMenu"
            open={canShowMessageMenu ? showMessageMenu : false}
            onOpenChange={(vis) => setShowMessageMenu(vis)}
          >
            <MessageItemErrorBoundary message={message}>
              <MessageRenderComponent
                message={message}
                isSender={isSender}
                disabled={false}
                showAlbum={showAlbum}
                showMergeModal={showMergeModal}
                getAnnouncementPusher={getAnnouncementPusher}
              />
            </MessageItemErrorBoundary>

            <MessageSuffix
              message={message}
              isSender={isSender}
              disabled={false}
              conversationID={conversationID}
            />
          </Popover>

          {isQuoteMessage && (
            <QuoteMessageRenderer
              message={message}
              isSender={isSender}
              disabled={false}
            />
          )}

          {showMessageReadState && (
            <MessageReadState message={message} isSender={isSender} disabled={false} />
          )}
        </div>
      </div>
      {message.gapTime && (
        <div className="absolute left-1/2 top-1 -translate-x-1/2 text-xs text-[var(--sub-text)]">
          {formatMessageTime(message.sendTime, true)}
        </div>
      )}
      {message.errCode && (
        <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center text-xs">
          {/* <div className="text-xs text-[var(--sub-text)]">对方已将你加入黑名单</div> */}
          {/* <div className="text-[var(--sub-text)]">
            Lilibai开启了好友验证，你还不是他的好友
          </div>
          <div className="text-[var(--primary)] ml-2 cursor-pointer">验证添加</div> */}
        </div>
      )}
    </div>
  );
};

export default memo(MessageItem);
