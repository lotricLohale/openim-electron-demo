import { Button, Empty, message } from "antd";
import { FC, forwardRef, memo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import MyAvatar from "../../../components/MyAvatar";
import { im } from "../../../utils";
import { FriendApplicationItem, GroupApplicationItem } from "../../../utils/open_im_sdk/types";
import List from "rc-virtual-list";
import useListHight from "../../../utils/hooks/useListHight";

type NewNoticeProps = {
  type: number;
  renderType: "recv" | "sent";
  renderList: any;
};

const NewNotice: FC<NewNoticeProps> = ({ type, renderType, renderList }) => {
  const { t } = useTranslation();

  const { listHeight } = useListHight(106);

  return (
    <div className="notice_bg">
      {renderList.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("NoNotice")} />
      ) : (
        <List
          height={listHeight}
          data={renderList}
          itemHeight={100}
          itemKey={(item: any) => (item.groupID ?? item.toUserID) + (item.userID ?? item.fromUserID)}
          children={(item) => <NoticeItem ap={item} type={type} renderType={renderType} />}
        />
      )}
    </div>
  );
};

export default NewNotice;

const NoticeItem = memo(
  forwardRef(({ ap, type, renderType }: { ap: FriendApplicationItem | GroupApplicationItem; type: number; renderType: "recv" | "sent" },ref) => {
    const { t } = useTranslation();

    const acceptApplication = () => {
      if (type === 1) {
        im.acceptFriendApplication({ toUserID: (ap as FriendApplicationItem).fromUserID, handleMsg: "" })
          .then((res) => message.success(t("AddFriendSuc")))
          .catch((err) => message.error(t("AccessFailed")));
      } else {
        const options = {
          groupID: (ap as GroupApplicationItem).groupID,
          fromUserID: (ap as GroupApplicationItem).userID,
          handleMsg: "",
        };
        im.acceptGroupApplication(options)
          .then((res) => message.success(t("AgreeJoin")))
          .catch((err) => message.error(t("AccessFailed")));
      }
    };
    const refuseApplication = () => {
      if (type === 1) {
        im.refuseFriendApplication({ toUserID: (ap as FriendApplicationItem).fromUserID, handleMsg: "" })
          .then((res) => {})
          .catch((err) => message.error(t("AccessFailed")));
      } else {
        const options = {
          groupID: (ap as GroupApplicationItem).groupID,
          fromUserID: (ap as GroupApplicationItem).userID,
          handleMsg: "",
        };
        im.refuseGroupApplication(options)
          .then((res) => {})
          .catch((err) => message.error(t("AccessFailed")));
      }
    };

    const AccessButtons = () => (
      <>
        <Button onClick={() => acceptApplication()} type="primary">
          {t("Accept")}
        </Button>
        <Button onClick={() => refuseApplication()}>{t("Refuse")}</Button>
      </>
    );

    const noticeTip = (tip: string) => <div className="apt_result">{tip}</div>;
    const switchUrl =
      type === 1
        ? renderType === "recv"
          ? (ap as FriendApplicationItem).fromFaceURL
          : (ap as FriendApplicationItem).toFaceURL
        : renderType === "recv"
        ? (ap as GroupApplicationItem).userFaceURL
        : (ap as GroupApplicationItem).groupFaceURL;

    return (
      <div ref={ref as any} className="notice_bg_item">
        <div className="notice_bg_item_left" style={{ alignItems: "flex-start" }}>
          <MyAvatar size={36} shape="square" src={switchUrl} />
          {type === 1 ? (
            <div className="notice_friend">
              <div className="notice_friend_title">{renderType === "recv" ? (ap as FriendApplicationItem).fromNickname : (ap as FriendApplicationItem).toNickname}</div>
              <div className="application_desc">申请添加你为好友</div>
              <div className="notice_friend_sub">
                <div>验证信息：</div>
                <div> {(ap as FriendApplicationItem).reqMsg}</div>
              </div>
            </div>
          ) : (
            <div className="notice_group">
              <div className="notice_group_title">{(ap as GroupApplicationItem).nickname}</div>
              <div className="notice_group_sub">
                {t("ApplyJoin")} <span style={{ color: "#428BE5" }}>{(ap as GroupApplicationItem).groupName}</span>
              </div>
              <div className="notice_group_res">{t("ApplyReason")}：</div>
              <div className="notice_group_res">{(ap as GroupApplicationItem).reqMsg}</div>
            </div>
          )}
        </div>
        <div className="notice_bg_item_right">
          {ap.handleResult === 0 ? renderType === "recv" ? <AccessButtons /> : noticeTip(t("WaitingProcessed")) : noticeTip(ap.handleResult === -1 ? t("Refused") : t("Accepted"))}
        </div>
      </div>
    );
  })
);
