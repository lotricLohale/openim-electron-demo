import { Space, Tooltip } from "antd";
import { t } from "i18next";
import { memo, useState } from "react";

import { modal } from "@/AntdGlobalComp";
import cancel from "@/assets/images/common/cancel.png";
import card from "@/assets/images/common/card.png";
import { IMSDK } from "@/layout/MainContentWrap";
import { feedbackToast } from "@/utils/common";
import emitter from "@/utils/events";
import { FriendUserItem, SelfUserInfo } from "@/utils/open-im-sdk-wasm/types/entity";

const CardActionRow = ({
  isFriend,
  isSelf,
  cardInfo,
  closeOverlay,
}: {
  isFriend?: boolean;
  isSelf?: boolean;
  cardInfo?: Partial<SelfUserInfo & FriendUserItem>;
  closeOverlay: () => void;
}) => {
  const shareCard = () => {
    const cardMessageOptions = {
      userID: cardInfo?.userID ?? "",
      nickname: cardInfo?.nickname ?? "",
      faceURL: cardInfo?.faceURL ?? "",
      ex: cardInfo?.ex ?? "",
    };
    emitter.emit("OPEN_CHOOSE_MODAL", {
      type: "SHARE_CARD",
      extraData: cardMessageOptions,
    });
    closeOverlay();
  };

  const tryUnfriend = () => {
    modal.confirm({
      title: "解除好友",
      content: "确认解除好友吗？",
      onOk: async () => {
        try {
          await IMSDK.deleteFriend(cardInfo!.userID!);
        } catch (error) {
          feedbackToast({ error, msg: t("toast.unfriendFailed") });
        }
      },
    });
    closeOverlay();
  };

  return (
    <div className="flex items-center">
      <Space size={4}>
        <Tooltip title="分享名片" placement="bottom">
          <img
            className="cursor-pointer"
            width={18}
            src={card}
            alt=""
            onClick={shareCard}
          />
        </Tooltip>
        {isFriend && (
          <Tooltip title="解除好友" placement="bottom">
            <img
              className="cursor-pointer"
              width={18}
              src={cancel}
              alt=""
              onClick={tryUnfriend}
            />
          </Tooltip>
        )}
      </Space>
    </div>
  );
};

export default memo(CardActionRow);
