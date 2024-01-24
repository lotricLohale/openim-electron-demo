import { Image } from "antd";
import clsx from "clsx";
import { FC } from "react";

import file_icon from "@/assets/images/messageItem/file_icon.png";
import location from "@/assets/images/messageItem/location.png";
import play_icon from "@/assets/images/messageItem/play_video.png";
import OIMAvatar from "@/components/OIMAvatar";
import { ExMessageItem } from "@/store";
import { formatEmoji } from "@/utils/emojis";
import { formatLink, formatMessageByType } from "@/utils/imCommon";
import { PublicUserItem } from "@/utils/open-im-sdk-wasm/types/entity";
import { MessageType } from "@/utils/open-im-sdk-wasm/types/enum";

import { IMessageItemProps } from ".";

const extraTypes = [
  MessageType.FileMessage,
  MessageType.LocationMessage,
  MessageType.PictureMessage,
  MessageType.VideoMessage,
  MessageType.CardMessage,
];

const QuoteMessageRenderer: FC<IMessageItemProps> = ({ message: { quoteElem } }) => {
  const hasExtra = extraTypes.includes(quoteElem.quoteMessage.contentType);

  const isFileMessage = quoteElem.quoteMessage.contentType === MessageType.FileMessage;
  const isPictureMessage =
    quoteElem.quoteMessage.contentType === MessageType.PictureMessage;
  const isVideoMessage =
    quoteElem.quoteMessage.contentType === MessageType.VideoMessage;
  const isMediaMessage = isPictureMessage || isVideoMessage;
  const isCardMessage = quoteElem.quoteMessage.contentType === MessageType.CardMessage;
  const isLocationMessage =
    quoteElem.quoteMessage.contentType === MessageType.LocationMessage;
  const isRevokedMessage =
    quoteElem.quoteMessage.contentType === MessageType.RevokeMessage;

  const getMessageContent = () => {
    if (isMediaMessage) {
      return "";
    }
    if (isRevokedMessage) {
      return "引用内容已被撤回";
    }
    return formatEmoji(formatLink(formatMessageByType(quoteElem.quoteMessage)));
  };

  return (
    <div
      className={clsx(
        "mt-1 flex w-fit items-center rounded-md bg-[var(--chat-bubble)] p-2.5",
        {
          "py-1.5": hasExtra,
        },
      )}
    >
      <div
        className="text-xs text-[var(--sub-text)]"
        dangerouslySetInnerHTML={{
          __html: `${quoteElem.quoteMessage.senderNickname}：${getMessageContent()}`,
        }}
      >
        {}
      </div>
      {hasExtra && (
        <div className={clsx({ "pl-1.5": !isMediaMessage })}>
          {isFileMessage && <img width={26} src={file_icon} alt="file" />}
          {isLocationMessage && <img width={14} src={location} alt="location" />}
          {isCardMessage && <CardExtra message={quoteElem.quoteMessage} />}
          {isMediaMessage && <MediaExtra message={quoteElem.quoteMessage} />}
        </div>
      )}
    </div>
  );
};

export default QuoteMessageRenderer;

const CardExtra: FC<{ message: ExMessageItem }> = ({ message }) => (
  <OIMAvatar
    src={message.cardElem.faceURL}
    size={26}
    text={message.cardElem.nickname}
  />
);

const MediaExtra: FC<{ message: ExMessageItem }> = ({ message }) => {
  const isVideoMessage = message.contentType === MessageType.VideoMessage;
  const sourceUrl = isVideoMessage
    ? message.videoElem.snapshotUrl
    : message.pictureElem.snapshotPicture.url;

  return (
    <div className="relative flex items-center">
      <Image
        rootClassName="message-image quote-image"
        className="rounded-md"
        height={30}
        src={sourceUrl}
        preview={!isVideoMessage}
      />
      {isVideoMessage && (
        <img
          src={play_icon}
          width={13}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
          alt="play"
        />
      )}
    </div>
  );
};
