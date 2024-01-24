import { Image, Spin } from "antd";
import { FC } from "react";

import play_icon from "@/assets/images/messageItem/play_video.png";
import emitter from "@/utils/events";
import { MessageType } from "@/utils/open-im-sdk-wasm/types/enum";

import { IMessageItemProps } from ".";

const min = (a: number, b: number) => (a > b ? b : a);

const MediaMessageRender: FC<IMessageItemProps> = ({ message, showAlbum }) => {
  const isVideoMessage = message.contentType === MessageType.VideoMessage;
  const sourceUrl = isVideoMessage
    ? message.videoElem.snapshotUrl
    : message.pictureElem.snapshotPicture.url;
  const imageHeight = isVideoMessage
    ? message.videoElem.snapshotHeight
    : message.pictureElem.sourcePicture.height;
  const imageWidth = isVideoMessage
    ? message.videoElem.snapshotWidth
    : message.pictureElem.sourcePicture.width;
  const minHeight = min(200, imageWidth) * (imageHeight / imageWidth) + 2;
  const adaptedHight = min(minHeight, 320);
  const adaptedWidth = min(imageWidth, 200);

  const previewInAlbum = () => {
    if (isVideoMessage) {
      emitter.emit("OPEN_VIDEO_PLAYER", message.videoElem.videoUrl);
      return;
    }
    showAlbum?.(message.clientMsgID);
  };

  const getShowPreview = () => {
    if (isVideoMessage) {
      return false;
    }
    return showAlbum ? { visible: false } : true;
  };

  const minStyle = { minHeight: `${adaptedHight}px`, minWidth: `${adaptedWidth}px` };

  return (
    <div className="relative" style={minStyle}>
      <Image
        rootClassName="message-image cursor-pointer"
        className="max-w-[200px] rounded-md"
        src={sourceUrl}
        preview={getShowPreview()}
        onClick={previewInAlbum}
        placeholder={
          <div style={minStyle} className="flex items-center justify-center">
            <Spin />
          </div>
        }
      />
      {isVideoMessage && (
        <img
          src={play_icon}
          width={40}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
          alt="play"
          onClick={previewInAlbum}
        />
      )}
    </div>
  );
};

export default MediaMessageRender;
