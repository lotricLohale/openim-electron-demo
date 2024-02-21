import { RightOutlined } from "@ant-design/icons";
import { Switch, Button, message, Modal } from "antd";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import MyAvatar from "../../../../components/MyAvatar";
import { DELETE_MESSAGE, OPEN_SINGLE_MODAL, RESET_CVE } from "../../../../constants/events";
import { RootState } from "../../../../store";
import { setCurCve, setCveList } from "../../../../store/actions/cve";
import { events, im } from "../../../../utils";
import { ConversationItem, OptType } from "../../../../utils/open_im_sdk/types";
import { CardType } from "../../components/UserCard";
import { DrawerType } from "./CveRightDrawer";

type SingleDrawerProps = {
  curCve: ConversationItem;
  updatePin: () => void;
  updateOpt: (v: boolean, isMute?: boolean) => void;
  changeType: (tp: DrawerType) => void;
};

enum ShipType {
  Nomal = 0,
  Friend = 1,
  Black = 2,
}

const SingleDrawer: FC<SingleDrawerProps> = ({ curCve, updateOpt, updatePin, changeType }) => {
  const blackList = useSelector((state: RootState) => state.contacts.blackList, shallowEqual);
  const friendList = useSelector((state: RootState) => state.contacts.friendList, shallowEqual);
  const cveList = useSelector((state: RootState) => state.cve.cves, shallowEqual);
  const [ship, setShip] = useState<ShipType>();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  useEffect(() => {
    let flag = 0;
    if (friendList.find((item) => item.userID === curCve?.userID)) {
      flag = 1;
    } else if (blackList.find((item) => item.userID === curCve?.userID)) {
      flag = 2;
    }
    setShip(flag);
  }, [blackList, friendList]);

  const blackListChnage = (e: boolean) => {
    if (e) {
      im.addBlack(curCve?.userID!)
        .then((res) => message.success(t("AddBlackSuc")))
        .catch((err) => message.error(t("AddBlackFailed")));
    } else {
      im.removeBlack(curCve?.userID!).catch((err) => message.error(t("RemoveBlackFailed")));
    }
  };

  const readLimit = (isPrivate: boolean) => {
    im.setOneConversationPrivateChat({ conversationID: curCve.conversationID, isPrivate });
  };

  const delFriend = () => {
    im.deleteFriend(curCve.userID)
      .then((res) => {
        events.emit(RESET_CVE);
        message.success(t("UnfriendingSuc"));
        delCve();
      })
      .catch((err) => message.error(t("UnfriendingFailed")));
  };

  const delFriendWarning = () => {
    Modal.confirm({
      title: t("RemoveFriend"),
      content: t("UnfriendingTip"),
      onOk: delFriend,
    });
  };

  const delCve = () => {
    im.deleteConversationFromLocalAndSvr(curCve.conversationID)
      .then((res) => {
        const tarray = [...cveList];
        const farray = tarray.filter((c) => c.conversationID !== curCve.conversationID);
        dispatch(setCveList(farray));
        dispatch(setCurCve({} as ConversationItem));
      })
      .catch((err) => message.error(t("AccessFailed")));
  };

  const getFriendOrPublicInfo = async (id: string) => {
    const { data } = await im.getDesignatedFriendsInfo([id]);
    const result = JSON.parse(data)[0] ?? {};

    if (result.friendInfo) {
      return JSON.parse(data).length > 0 ? result.friendInfo : false;
    } else {
      const { data: result } = await im.getUsersInfo([id]);
      return JSON.parse(result).length > 0 ? JSON.parse(result)[0].publicInfo : false;
    }
  };

  const openCard = async () => {
    const info = await getFriendOrPublicInfo(curCve.userID);
    if (info) {
      const isFriend = info.addSource !== undefined;
      const data = isFriend ? { friend: info } : { public: info };
      const cardType = isFriend ? CardType.FriendInfo : CardType.UserInfo;
      events.emit(OPEN_SINGLE_MODAL, data, cardType);
    } else {
      message.error(t("GetUserFailed"));
    }
  };

  const delMsgConfirm = () => {
    Modal.confirm({
      title: t("DeleteMessage"),
      content: t("DeleteCveMessageConfirm", { name: curCve.showName }),
      cancelText: t("Cancel"),
      okText: t("Delete"),
      okButtonProps: {
        danger: true,
        type: "primary",
      },
      closable: false,
      className: "warning_modal",
      onOk: () => delRemoteRecord(),
    });
  };

  const delRemoteRecord = () => {
    im.clearC2CHistoryMessageFromLocalAndSvr(curCve.userID)
      .then((res) => {
        events.emit(DELETE_MESSAGE, curCve.userID, true);
      })
      .catch((err) => message.error(t("DeleteMessageFailed")));
  };

  const getBurnDurationStr = () => {
    switch (curCve.burnDuration) {
      case 0:
      case 30:
        return "30s";
      case 300:
        return t("Min", { num: 5 });
      case 3600:
        return t("Hour", { num: 1 });
      case 86400:
        return t("Day", { num: 1 });
      default:
        return `${curCve.burnDuration}s`;
    }
  };

  return (
    <div className="single_drawer">
      <div onClick={openCard} className="single_drawer_item single_drawer_item_bottom">
        <div className="single_drawer_item_left">
          <MyAvatar size={36} src={curCve.faceURL} />
          <div style={{ fontWeight: 500 }} className="single_drawer_item_title">
            {curCve.showName}
          </div>
        </div>
        <RightOutlined />
      </div>
      {/* <div className="single_drawer_item">
        <div className="single_drawer_item_left">
          <TeamOutlined />
          <div className="single_drawer_item_title">创建群组</div>
        </div>
        <RightOutlined />
      </div> */}
      <div className="single_drawer_item">
        <div>{t("Pin")}</div>
        <Switch checked={curCve.isPinned} size="small" onChange={updatePin} />
      </div>
      <div className="single_drawer_item">
        <div>{t("NotDisturb")}</div>
        <Switch checked={curCve.recvMsgOpt === OptType.WithoutNotify} size="small" onChange={(e) => updateOpt(e)} />
      </div>
      <div className="single_drawer_item">
        <div>{t("BlockThisFriend")}</div>
        <Switch size="small" checked={curCve.recvMsgOpt === OptType.Mute} onChange={(e) => updateOpt(e, true)} />
      </div>
      <div className="single_drawer_item single_drawer_item_bottom">
        <div>{t("AddBlack")}</div>
        <Switch size="small" checked={ship === ShipType.Black} onChange={(e) => blackListChnage(e)} />
      </div>
      <div className="single_drawer_item">
        <div>{t("ReadTimeLimit")}</div>
        <Switch size="small" disabled={ship === ShipType.Black} checked={curCve.isPrivateChat} onChange={(e) => readLimit(e)} />
      </div>
      <div onClick={() => changeType("read_limit_setting")} className="single_drawer_item single_drawer_item_bottom">
        <div>{t("DurationSetting")}</div>
        <div>
          <span className="sub_title">{getBurnDurationStr()}</span>
          <RightOutlined />
        </div>
      </div>
      <div onClick={delMsgConfirm} className="single_drawer_item single_drawer_item_del">
        <div>{t("ClearChat")}</div>
        <RightOutlined />
      </div>
      {ship === ShipType.Friend && (
        <Button onClick={delFriendWarning} danger type="primary" className="single_drawer_btn">
          {t("RemoveFriend")}
        </Button>
      )}
    </div>
  );
};

export default SingleDrawer;
