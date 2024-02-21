import { ClockCircleFilled, EllipsisOutlined, LeftOutlined } from "@ant-design/icons";
import { Button, Input, Modal, Form, message } from "antd";
import { FC, useState, useRef, useEffect } from "react";
import Draggable, { DraggableEvent, DraggableData } from "react-draggable";
import { shallowEqual, useSelector } from "react-redux";
import { RootState } from "../../../store";
import { events, formatDate, im } from "../../../utils";
import MyAvatar from "../../../components/MyAvatar";
import { GROUP_INFO_UPDATED, TO_ASSIGN_CVE } from "../../../constants/events";
import { useTranslation } from "react-i18next";
import { GroupItem, GroupJoinSource, GroupMemberItem, GroupRole, GroupType, GroupVerificationType, SessionType } from "../../../utils/open_im_sdk/types";
import group_icon from "@/assets/images/group_icon.png";
import { useNavigate, useLocation } from "react-router";

type GroupCardProps = {
  draggableCardVisible: boolean;
  info: GroupItem;
  close: () => void;
};

const GroupCard: FC<GroupCardProps> = ({ draggableCardVisible, info, close }) => {
  const [draggDisable, setDraggDisable] = useState(false);
  const [inGroup, setInGroup] = useState({
    state: false,
    members: [] as GroupMemberItem[],
  });
  const [step, setStep] = useState<"info" | "send">("info");
  const [groupInfo, setGroupInfo] = useState(info);
  const groupList = useSelector((state: RootState) => state.contacts.groupList, shallowEqual);
  const [bounds, setBounds] = useState({
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
  });
  const navigate = useNavigate();
  const loaction = useLocation();
  const draRef = useRef<any>(null);
  const { t } = useTranslation();
  const [form] = Form.useForm();

  useEffect(() => {
    events.on(GROUP_INFO_UPDATED, groupInfoUpdateHandler);
    return () => {
      events.off(GROUP_INFO_UPDATED, groupInfoUpdateHandler);
    };
  }, []);

  useEffect(() => {
    if (isInGroup()) {
      im.getGroupMemberList({ groupID: groupInfo.groupID, offset: 0, filter: 0, count: 10 }).then((res) => {
        setInGroup({
          state: true,
          members: JSON.parse(res.data),
        });
      });
      setStep("info");
    } else {
      setInGroup({
        state: false,
        members: [],
      });
    }
  }, [groupList, draggableCardVisible]);

  const isInGroup = () => groupList.find((g) => g.groupID === groupInfo.groupID);

  const groupInfoUpdateHandler = (ginfo: GroupItem) => {
    if (ginfo.groupID === groupInfo.groupID) {
      setGroupInfo(ginfo);
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

  const sendApplication = ({ reqMessage }: { reqMessage: string }) => {
    const param = {
      groupID: groupInfo.groupID!,
      reqMsg: reqMessage??"",
      joinSource: GroupJoinSource.Search
    };
    im.joinGroup(param)
      .then((res) => {
        message.success(t("SendAddGruopSuc"));
        myClose();
      })
      .catch((err) => {
        message.error(t("SendAddGruopFailed"));
      });
  };

  const goBack = () => {
    setStep("info");
    form.resetFields();
  };

  const myClose = () => {
    close();
    setStep("info");
    form.resetFields();
  };

  const nextStep = () => {
    if (inGroup.state) {
      if (loaction.pathname !== "/") {
        navigate("/");
      }
      setTimeout(() => events.emit(TO_ASSIGN_CVE, groupInfo.groupID, groupInfo.groupType === GroupType.NomalGroup? SessionType.Group: SessionType.SuperGroup))
    } else {
      if(groupInfo.needVerification === GroupVerificationType.AllNot){
        sendApplication({reqMessage:""})
        return;
      }
      setStep("send");
    }
  };

  const InfoTitle = () => {
    return (
      <>
        <div className="left_info">
          <div className="left_info_title">{groupInfo.groupName + " (" + groupInfo.memberCount + ")"}</div>
          <div className="left_info_subtitle">
            <ClockCircleFilled />
            {formatDate(groupInfo.createTime * 1000)[3]}
          </div>
        </div>
        <MyAvatar src={groupInfo.faceURL === "" ? group_icon : groupInfo.faceURL} size={42} />
      </>
    );
  };

  const SendTitle = () => (
    <>
      <div className="send_msg_title">
        <LeftOutlined className="cancel_drag" onClick={goBack} style={{ fontSize: "12px", marginRight: "12px" }} />
        <div className="send_msg_title_text">{t("GroupValidation")}</div>
      </div>
    </>
  );

  const InfoBody = () => (
    <div className="group_card_body">
      <div className="group_card_title">群成员：{groupInfo.memberCount + t("People")}</div>
      <div className="group_card_member">
        {inGroup.members.map((member, idx) => idx < 5 && <MyAvatar key={member.userID} src={member.faceURL} size={35.3} />)}
        {inGroup.state && <EllipsisOutlined />}
      </div>
      <div style={{ padding: "8px 0" }} className="group_card_title">{`${t("GroupID")}  ${groupInfo.groupID}`}</div>
      <Button onClick={nextStep} className="add_con_btn" type="primary">
        {inGroup.state ? t("SendMessage") : t("AddGroup")}
      </Button>
    </div>
  );

  const SendBody = () => (
    <>
      <div className="send_card_info">
        <div className="send_card_info_row1">
          <div>{groupInfo.groupName}</div>
          <MyAvatar src={groupInfo.faceURL === "" ? group_icon : groupInfo.faceURL} size={42} />
        </div>
        <Form form={form} name="basic" onFinish={sendApplication} autoComplete="off">
          <Form.Item name="reqMessage">
            <Input maxLength={40} placeholder={t("VerficationTip")} />
          </Form.Item>
        </Form>
      </div>
      <Button onClick={() => form.submit()} className="add_con_btn" type="primary">
        {t("Send")}
      </Button>
    </>
  );

  return (
    <Modal
      // key="UserCard"
      className={step !== "send" ? "draggable_card" : "draggable_card_next"}
      closable={false}
      footer={null}
      mask={false}
      width={280}
      destroyOnClose={true}
      centered
      onCancel={myClose}
      title={
        <div
          className="draggable_card_title"
          onMouseOver={() => {
            if (draggDisable) {
              setDraggDisable(false);
            }
          }}
          onMouseOut={() => {
            setDraggDisable(true);
          }}
        >
          {step === "info" ? <InfoTitle /> : <SendTitle />}
        </div>
      }
      visible={draggableCardVisible}
      modalRender={(modal) => (
        <Draggable
          allowAnyClick={true}
          disabled={draggDisable}
          bounds={bounds}
          onStart={(event, uiData) => onStart(event, uiData)}
          cancel={`.cancel_drag, .cancel_input, .ant-upload,.left_info_icon,.ant-modal-body`}
          enableUserSelectHack={false}
        >
          <div ref={draRef}>{modal}</div>
        </Draggable>
      )}
    >
      {step === "info" ? <InfoBody /> : <SendBody />}
    </Modal>
  );
};

export default GroupCard;
