import { LeftOutlined } from "@ant-design/icons";
import "moment/locale/zh-cn";
import moment from "moment";
import { Select, Button, Input, Modal, Form, message, DatePicker, Tooltip, Upload } from "antd";
import { FC, useState, useRef, useEffect, memo, ReactNode, useMemo } from "react";
import Draggable, { DraggableEvent, DraggableData } from "react-draggable";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../store";
import { copy2Text, events, filterEmptyValue, formatDate, im, switchUpload } from "../../../utils";
import user_card_uicon from "@/assets/images/user_card_uicon.png";
import user_card_dicon from "@/assets/images/user_card_dicon.png";
import user_card_remark from "@/assets/images/user_card_remark.png";
import MyAvatar from "../../../components/MyAvatar";
import { FORWARD_AND_MER_MSG, RESET_CVE, TO_ASSIGN_CVE } from "../../../constants/events";
import { PublicUserItem, FriendItem, FullUserItem, SessionType, GroupMemberItem, GroupJoinSource, AllowType } from "../../../utils/open_im_sdk/types";
import { useLocation, useNavigate } from "react-router";
import { Loading } from "../../../components/Loading";
import { t } from "i18next";
import { CbEvents } from "../../../utils/open_im_sdk";
import { useLatest } from "ahooks";
import { getOnline } from "../../../api/admin";
import { DetailType } from "../../../@types/open_im";
import { UploadRequestOption } from "rc-upload/lib/interface";
import { getUserInfoByBusiness, updateSelfInfo } from "../../../api/login";

type UserCardProps = {
  visible: boolean;
  cardInfo: CardInfo;
  cardType: CardType;
  inGroup: boolean;
  close: () => void;
};

type CardInfo = {
  public?: PublicUserItem;
  friend?: FriendItem;
  self?: FullUserItem;
  groupMemberItem?: GroupMemberItem;
};

export enum CardType {
  SelfInfo,
  UserInfo,
  FriendInfo,
  Apply,
}

type OrzInfoType = {
  departments: string;
  positions: string;
};
type GroupMemberCardItem = GroupMemberItem & FriendItem & OrzInfoType & { allowFriend: AllowType };
type UserCardItem = FriendItem & OrzInfoType;

type CardData = {
  userInfo?: UserCardItem;
  groupMemberInfo?: GroupMemberCardItem;
  loading: boolean;
};

enum ModalType {
  SelfInfo,
  Remark,
}

const UserCard: FC<UserCardProps> = ({ visible, cardInfo, inGroup, cardType, close }) => {
  const [updateModal, setUpdateModal] = useState({
    self: false,
    remark: false,
  });
  const selfOrzInfo = useSelector((state: RootState) => state.contacts.organizationInfo, shallowEqual);
  const appConfig = useSelector((state: RootState) => state.user.appConfig, shallowEqual);
  const [internalType, setInternalType] = useState<CardType>(cardType);
  const [bounds, setBounds] = useState({
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
  });
  const [cardData, setCardData] = useState<CardData>({
    userInfo: undefined,
    groupMemberInfo: undefined,
    loading: true,
  });
  const latestCardData = useLatest(cardData);
  const latestInternalType = useLatest(internalType);
  const draRef = useRef<any>(null);
  const loaction = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    im.on(CbEvents.ONSELFINFOUPDATED, selfInfoHandler);
    im.on(CbEvents.ONFRIENDINFOCHANGED, friednInfoHandler);
    im.on(CbEvents.ONFRIENDADDED, friednAddedHandler);
    return () => {
      im.off(CbEvents.ONSELFINFOUPDATED, selfInfoHandler);
      im.off(CbEvents.ONFRIENDINFOCHANGED, friednInfoHandler);
      im.off(CbEvents.ONFRIENDADDED, friednAddedHandler);
    };
  }, []);

  useEffect(() => {
    if (visible) {
      getCradData();
    }
  }, [visible]);

  const selfInfoHandler = ({ data }: any) => {
    if (latestInternalType.current === CardType.SelfInfo) {
      const info = JSON.parse(data);
      setCardData({
        ...latestCardData.current,
        userInfo: { ...latestCardData.current.userInfo, ...info } as UserCardItem,
      });
    }
  };

  const friednInfoHandler = ({ data }: any) => {
    const info = JSON.parse(data);
    if (latestInternalType.current === CardType.FriendInfo && info.userID === latestCardData.current.userInfo?.userID) {
      setCardData({
        ...latestCardData.current,
        userInfo: { ...latestCardData.current.userInfo, ...info } as UserCardItem,
      });
    }
  };

  const friednAddedHandler = ({ data }: any) => {
    const info = JSON.parse(data);
    if (latestInternalType.current === CardType.UserInfo && info.userID === latestCardData.current.userInfo?.userID) {
      setCardData({
        ...latestCardData.current,
        userInfo: { ...latestCardData.current.userInfo, ...info } as UserCardItem,
      });
      setInternalType(CardType.FriendInfo);
    }
  };

  const getCradData = async () => {
    switch (latestInternalType.current) {
      case CardType.FriendInfo:
        const { data } = await im.getUsersInfo([cardInfo.friend!.userID]);
        let friendBusinessInfo = {};
        try {
          friendBusinessInfo = JSON.parse(data)[0].friendInfo;
        } catch (error) {}
        filterEmptyValue(friendBusinessInfo);
        setCardData({
          userInfo: { ...cardInfo.friend, ...friendBusinessInfo } as UserCardItem,
          groupMemberInfo: (cardInfo.groupMemberItem ?? {}) as GroupMemberCardItem,
          loading: false,
        });
        break;
      case CardType.UserInfo:
        setCardData({
          userInfo: { ...cardInfo.public } as UserCardItem,
          groupMemberInfo: (cardInfo.groupMemberItem ?? {}) as GroupMemberCardItem,
          loading: false,
        });
        break;
      case CardType.SelfInfo:
        setCardData({
          userInfo: { ...cardInfo.self } as UserCardItem,
          groupMemberInfo: (cardInfo.groupMemberItem ?? {}) as GroupMemberCardItem,
          loading: false,
        });
        break;
    }
  };

  const onStart = (event: DraggableEvent, uiData: DraggableData) => {
    const { clientWidth, clientHeight } = window?.document?.documentElement;
    const targetRect = draRef!.current!.getBoundingClientRect();
    setBounds({
      left: -targetRect?.left + uiData?.x,
      right: clientWidth - (targetRect?.right - uiData?.x),
      top: -targetRect?.top + uiData?.y,
      bottom: clientHeight - (targetRect?.bottom - uiData?.y),
    });
  };

  const openUpdateModal = (type: ModalType) => {
    if (type === ModalType.Remark) {
      setUpdateModal({
        self: false,
        remark: true,
      });
    } else {
      setUpdateModal({
        self: true,
        remark: false,
      });
    }
  };

  const closeUpdateModal = () => {
    setUpdateModal({
      self: false,
      remark: false,
    });
  };

  const assignCve = () => {
    if (loaction.pathname !== "/") navigate("/");
    setTimeout(() => {
      events.emit(TO_ASSIGN_CVE, cardData.userInfo?.userID, SessionType.Single);
      close();
    });
  };

  const SwitchEditOrAddBtn = useMemo(() => {
    switch (latestInternalType.current) {
      case CardType.SelfInfo:
        return (
          <Button style={{ width: "98%" }} onClick={() => openUpdateModal(ModalType.SelfInfo)} type="primary">
            {t("EditInfo")}
          </Button>
        );
      case CardType.UserInfo:
        if (cardData.groupMemberInfo?.allowFriend === AllowType.NotAllowed) {
          return null;
        }
        return (
          <Button onClick={() => setInternalType(CardType.Apply)} type="primary">
            {t("AddFriend")}
          </Button>
        );
      default:
        return null;
    }
  }, [latestInternalType.current, cardData.groupMemberInfo]);

  const SwitchSendMessageBtn = useMemo(() => {
    if (latestInternalType.current === CardType.SelfInfo) {
      return null;
    }

    if (appConfig.allowSendMsgNotFriend === 2) {
      return latestInternalType.current === CardType.FriendInfo ? (
        <Button onClick={assignCve} style={{ width: "98%" }} type="primary">
          发送消息
        </Button>
      ) : null;
    }

    return (
      <Button onClick={assignCve} style={{ width: "auto" }} type="primary">
        发送消息
      </Button>
    );
  }, [appConfig.allowSendMsgNotFriend, cardData]);

  const ignoreClasses = `.card_title, .card_info, .card_action, .apply_info, .back_bar, .info_row, .apply_action, .edit_self_modal`;

  return (
    <Modal
      // key="UserCard"
      className={"draggable_user_card"}
      closable={false}
      footer={null}
      mask={false}
      width={332}
      destroyOnClose={true}
      centered
      onCancel={close}
      title={null}
      visible={visible}
      modalRender={(modal) => (
        <Draggable allowAnyClick={true} disabled={false} bounds={bounds} onStart={(event, uiData) => onStart(event, uiData)} cancel={ignoreClasses} enableUserSelectHack={false}>
          <div ref={draRef}>{modal}</div>
        </Draggable>
      )}
    >
      {cardData.loading ? (
        <Loading />
      ) : internalType !== CardType.Apply ? (
        <div className="card_content">
          <CardTitle cardType={internalType} baseInfo={cardData.userInfo!} hiddenUserID={inGroup && cardData.groupMemberInfo?.allowFriend === AllowType.NotAllowed} />
          <div className="card_info">
            {/* <DepCol title={selfOrzInfo.deps[0]?.name} depInfo={cardData.userInfo!} /> */}
            {inGroup && <GroupCol groupInfo={cardData.groupMemberInfo!} />}
            <UserCol userInfo={cardData.userInfo!} editFun={openUpdateModal} type={internalType} />
          </div>
          <div className="card_action">
            {SwitchEditOrAddBtn}
            {SwitchSendMessageBtn}
          </div>
        </div>
      ) : (
        <ApplyContent publicInfo={cardData.userInfo!} back2Info={() => setInternalType(CardType.UserInfo)} />
      )}
      {updateModal.self && cardData.userInfo && <EditModal close={closeUpdateModal} visible={updateModal.self} selfInfo={cardData.userInfo} />}
      {updateModal.remark && cardData.userInfo?.userID && <RemarkModal close={closeUpdateModal} visible={updateModal.remark} friendInfo={cardData.userInfo} />}
    </Modal>
  );
};

export default memo(UserCard);

type CardColProps = {
  title: string;
  children?: ReactNode;
};
type CardRowProps = {
  label: string;
  content: string;
  editFun?: (type: ModalType) => void;
};

const CardCol: FC<CardColProps> = memo(({ title, children }) => (
  <div className="card_col">
    <div className="col_title">{title}</div>
    {children}
  </div>
));

const CardRow: FC<CardRowProps> = memo(({ label, content, editFun }) => (
  <div className="info_row">
    <span className="label">{label}</span>
    <span className="content">{content}</span>
    {editFun && <img onClick={() => editFun(ModalType.Remark)} src={user_card_remark} alt="" />}
  </div>
));

const GroupCol = memo(({ groupInfo: { nickname, groupID, joinTime, joinSource, inviterUserID } }: { groupInfo: GroupMemberCardItem }) => {
  const [joinSourceStr, setJoinSourceStr] = useState("-");

  useEffect(() => {
    getJoinSourceStr();
  }, []);
  const getJoinSourceStr = async () => {
    switch (joinSource) {
      case GroupJoinSource.Search:
        setJoinSourceStr(t("SearchInGroup"));
        break;
      case GroupJoinSource.QrCode:
        setJoinSourceStr(t("QrInGroup"));
        break;
      case GroupJoinSource.Invitation:
        const { data } = await im.getGroupMembersInfo({ groupID, userIDList: [inviterUserID] });
        const user = JSON.parse(data)[0] ?? {};
        setJoinSourceStr(t("InvitedInGroup", { inviter: user.nickname }));
        break;
      default:
        break;
    }
  };
  return (
    <CardCol title={t("GroupInfo")}>
      <CardRow label={t("NickInGruop")} content={nickname} />
      <CardRow label={t("InGroupTime")} content={joinTime ? formatDate(joinTime * 1000)[3] : "-"} />
      <CardRow label={t("InGroupMethod")} content={joinSourceStr} />
    </CardCol>
  );
});

const DepCol = memo(({ depInfo: { departments, positions }, title }: { depInfo: UserCardItem; title: string }) => {
  return (
    <CardCol title={title}>
      <CardRow label={t("Department")} content={departments} />
      <CardRow label={t("Position")} content={positions} />
    </CardCol>
  );
});

type UserColProps = {
  userInfo: UserCardItem;
  type: CardType;
  editFun?: (type: ModalType) => void;
};

const UserCol: FC<UserColProps> = memo(({ userInfo: { nickname, gender, birth, phoneNumber, email, remark }, type, editFun }) => {
  const getGender = (gender: number) => {
    switch (gender) {
      case 1:
        return t("Man");
      case 2:
        return t("Woman");
      default:
        return t("Unknown");
    }
  };

  const getAge = (timestamp: number) => {
    if (timestamp === 0) {
      return "-";
    }
    let birthDayTime = new Date(timestamp).getTime();
    let nowTime = new Date().getTime();
    return Math.ceil((nowTime - birthDayTime) / 31536000000).toString();
  };
  return (
    <CardCol title={t("SelfInfo")}>
      <CardRow label={t("Nickname")} content={nickname} />
      <CardRow label={t("Sex")} content={getGender(gender)} />
      {type !== CardType.UserInfo && (
        <>
          <CardRow label={t("Age")} content={getAge(birth * 1000)} />
          <CardRow label={t("Birthday")} content={birth ? formatDate(birth * 1000)[3] : "-"} />
          <CardRow label={t("PhoneNumber")} content={phoneNumber || "-"} />
          {/* <CardRow label={t("Email")} content={email || '-'} /> */}
        </>
      )}
      {type === CardType.FriendInfo && <CardRow editFun={editFun} label={t("Note")} content={remark} />}
    </CardCol>
  );
});

const CardTitle = memo(({ baseInfo, cardType, hiddenUserID }: { baseInfo: UserCardItem; cardType: CardType; hiddenUserID: boolean }) => {
  const { faceURL, nickname, userID } = baseInfo;
  const [onlineStatus, setOnlineStatus] = useState<string>("");
  const [isFriend, setIsFriend] = useState<boolean>(cardType === CardType.FriendInfo);

  useEffect(() => {
    getOnlineStatus();
  }, []);
  const getOnlineStatus = () => {
    getOnline([userID]).then((res) => {
      const statusItem = res.data[0];
      switchOnline(statusItem.status, statusItem.detailPlatformStatus);
    });
  };

  const switchOnline = (oType: string, details?: DetailType[]) => {
    switch (oType) {
      case "offline":
        return setOnlineStatus(`[${t("Offline")}]`);
      case "online":
        let str = "";
        details?.map((detail) => {
          if (detail.status === "online") {
            str += `${detail.platform}/`;
          }
        });
        setOnlineStatus(`[${str.slice(0, -1)} ${t("Online")}]`);
        break;
      default:
        break;
    }
  };

  const shareCard = () => {
    events.emit(FORWARD_AND_MER_MSG, "card_share", JSON.stringify(baseInfo));
  };

  const delFriend = () => {
    im.deleteFriend(userID)
      .then((res) => {
        events.emit(RESET_CVE);
        setIsFriend(false);
        message.success(t("UnfriendingSuc"));
        // delCve();
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

  const uploadIcon = async (uploadData: UploadRequestOption) => {
    switchUpload(uploadData)
      .then((res) => {
        const selfInfo: any = { userID };
        selfInfo.faceURL = res.data.URL;
        // im.setSelfInfo(selfInfo)
        updateSelfInfo(selfInfo)
          .then((res) => {
            message.success(t("ModifySuc"));
          })
          .catch((err) => message.error(t("ModifyFailed")));
      })
      .catch((err) => message.error(t("UploadFailed")));
  };

  return (
    <div className="card_title">
      <Upload accept="image/*" openFileDialogOnClick={cardType === CardType.SelfInfo ? true : false} action="" customRequest={(data) => uploadIcon(data)} showUploadList={false}>
        <MyAvatar nickname={nickname} src={faceURL} size={48} />
      </Upload>
      <div className="title_right">
        <div className="right_top">
          <Tooltip title={nickname}>
            <div>{nickname}</div>
          </Tooltip>
          <Tooltip title={onlineStatus}>
            <div>{onlineStatus}</div>
          </Tooltip>
        </div>
        <div className="right_bottom">
          {!hiddenUserID && <span onClick={() => copy2Text(userID)}>{userID}</span>}
          <Tooltip title={t("SendCard")}>
            <img onClick={shareCard} src={user_card_uicon} />
          </Tooltip>
          {isFriend && (
            <Tooltip title={t("RemoveFriend")}>
              <img onClick={delFriendWarning} src={user_card_dicon} />
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
});

type EditModalProps = {
  selfInfo: FullUserItem;
  visible: boolean;
  close: () => void;
};

const EditModal: FC<EditModalProps> = memo(({ visible, selfInfo, close }) => {
  const [form] = Form.useForm();
  const [comfirmLoading, setComfirmLoading] = useState(false);

  useEffect(() => {
    if (visible && selfInfo.birth) {
      form.setFieldsValue({ birthday: moment(selfInfo.birth * 1000) });
    }
  }, [selfInfo.birth, visible]);

  const onGenderChange = (value: number) => {
    switch (value) {
      case 1:
        form.setFieldsValue({ sex: "男" });
        return;
      case 2:
        form.setFieldsValue({ sex: "女" });
        return;
      case 0:
        form.setFieldsValue({ sex: "-" });
    }
  };

  const getGender = (gender: string) => {
    switch (gender) {
      case "男":
        return 1;
      case "女":
        return 2;
      case "-":
        return 0;
    }
  };

  const onFinish = (value: any) => {
    setComfirmLoading(true);
    if (value.birthday) {
      value.birth = moment(value.birthday).unix();
    }
    // console.log(value.gender);

    // if (value.gender) {
    //   value.gender = getGender(value.gender);
    // }
    value.birthday = undefined;
    value.userID = selfInfo.userID;
    // im.setSelfInfo({ ...value })
    updateSelfInfo({ ...value })
      .then((res) => {
        message.success(t("UpdateSelfSuc"));
      })
      .catch((err) => {
        message.error(err.errMsg);
      })
      .finally(() => {
        setComfirmLoading(false);
        close();
      });
  };

  return (
    <Modal width={484} className="edit_self_modal" centered title={"编辑资料"} footer={null} visible={visible} onCancel={close}>
      <div className="form_content">
        <Form
          form={form}
          name="self_info"
          colon={false}
          requiredMark={false}
          labelCol={{ span: 4 }}
          labelAlign="left"
          wrapperCol={{ span: 20 }}
          initialValues={selfInfo}
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item label="昵称" name="nickname" rules={[{ required: true, max: 15 }]}>
            <Input />
          </Form.Item>
          <Form.Item label="性别" name="gender">
            <Select placeholder="Select a option and change input text above" onChange={onGenderChange} allowClear>
              <Select.Option value={1}>男</Select.Option>
              <Select.Option value={2}>女</Select.Option>
              <Select.Option value={0}>-</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="生日" name="birthday">
            <DatePicker />
          </Form.Item>
          <Form.Item label="手机号" rules={[{ max: 11 }]} name="phoneNumber">
            <Input disabled type="number" />
          </Form.Item>
          <Form.Item label="邮箱" name="email">
            <Input type="email" />
          </Form.Item>
        </Form>
        <div className="form_action">
          <Button loading={comfirmLoading} onClick={form.submit} type="primary">
            完成
          </Button>
        </div>
      </div>
    </Modal>
  );
});

type RemarkModalProps = {
  friendInfo: FriendItem;
  visible: boolean;
  close: () => void;
};

const RemarkModal: FC<RemarkModalProps> = memo(({ visible, friendInfo, close }) => {
  const [form] = Form.useForm();
  const [comfirmLoading, setComfirmLoading] = useState(false);

  const onFinish = (value: any) => {
    setComfirmLoading(true);
    im.setFriendRemark({ toUserID: friendInfo.userID, remark: value.remark ?? "" })
      .then(() => {
        message.success(t("UpdateRemarkSuc"));
      })
      .catch((err) => {
        message.error(err.errMsg);
      })
      .finally(() => {
        setComfirmLoading(false);
        close();
      });
  };

  return (
    <Modal width={484} className="edit_self_modal" centered title={"设置备注"} footer={null} visible={visible} onCancel={close}>
      <div className="form_content">
        <Form
          form={form}
          name="self_info"
          colon={false}
          requiredMark={false}
          labelCol={{ span: 4 }}
          labelAlign="left"
          wrapperCol={{ span: 20 }}
          initialValues={friendInfo}
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item label="备注" name="remark">
            <Input />
          </Form.Item>
        </Form>
        <div className="form_action">
          <Button loading={comfirmLoading} onClick={form.submit} type="primary">
            完成
          </Button>
        </div>
      </div>
    </Modal>
  );
});

type ApplyContentProps = {
  publicInfo: PublicUserItem;
  back2Info: () => void;
};

const ApplyContent: FC<ApplyContentProps> = memo(({ publicInfo: { userID, nickname, faceURL }, back2Info }) => {
  const [applyMsg, setApplyMsg] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);

  const sendApply = () => {
    setApplyLoading(false);
    const param = {
      toUserID: userID,
      reqMsg: applyMsg,
    };
    im.addFriend(param)
      .then((res) => {
        message.success(t("SendFriendSuc"));
      })
      .catch((err) => {
        if (err.errCode === 10007) {
          message.error("对不起您没有权限！");
          return;
        }
        message.error(t("SendFriendFailed"));
      })
      .finally(() => {
        setApplyLoading(false);
        back2Info();
      });
  };
  return (
    <div className="card_apply">
      <div className="back_bar">
        <LeftOutlined onClick={back2Info} />
        <span>好友验证</span>
      </div>
      <div className="info_row">
        <MyAvatar nickname={nickname} src={faceURL} size={48} />
        <div className="right_details">
          <div>{nickname}</div>
          <div>{userID}</div>
        </div>
      </div>
      <div className="apply_info">
        <div className="apply_title">验证信息</div>
        <Input.TextArea value={applyMsg} onChange={(e) => setApplyMsg(e.target.value)} showCount bordered={false} className="apply_msg" maxLength={50} />
      </div>
      <div className="apply_action">
        <Button loading={applyLoading} onClick={sendApply} type="primary">
          发送消息
        </Button>
      </div>
    </div>
  );
});
