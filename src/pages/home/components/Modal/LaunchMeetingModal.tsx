import { Button, DatePicker, Form, Input, message, Modal, Select, Spin } from "antd";
import moment from "moment";
import { FC, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import { useSelector } from "react-redux";
import { FORWARD_AND_MER_MSG, JOIN_MEETING } from "../../../../constants/events";
import { RootState } from "../../../../store";
import { events, genAvatar, im } from "../../../../utils";
import join_meeting from "@/assets/images/meeting_join.png";
import quick_meeting from "@/assets/images/meeting_quick.png";
import order_meeting from "@/assets/images/meeting_order.png";
import meeting_share from "@/assets/images/meeting_share.png";
import meeting_delete from "@/assets/images/meeting_delete.png";
import MyAvatar from "../../../../components/MyAvatar";
import { secondsToTime, UpdateMeetingParams } from "./data";
import { CloseOutlined, LeftOutlined } from "@ant-design/icons";
import { RangePickerProps } from "antd/lib/date-picker";

const actionList = [
  {
    icon: join_meeting,
    title: "加入会议",
  },
  {
    icon: quick_meeting,
    title: "快速会议",
  },
  {
    icon: order_meeting,
    title: "预约会议",
  },
];

type LaunchMeetingFormFields = {
  meetingName: string;
  startTime: moment.Moment;
  duration: number;
  meetingNo: string;
};

enum LaunchStep {
  Prepare,
  Order,
  Display,
  HistoryDisplay,
  Update,
  Join,
}
const displayTyps = [LaunchStep.Display, LaunchStep.HistoryDisplay];
const notBackTypes = [LaunchStep.Prepare, LaunchStep.Update];

type LaunchMeetingModalProps = {
  closeModal: () => void;
};
const LaunchMeetingModal: FC<LaunchMeetingModalProps> = memo(({ closeModal }) => {
  const draRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(LaunchStep.Prepare);
  // const { value: step, setValue: setStep, back } = useHistoryTravel<LaunchStep>(LaunchStep.Prepare);
  const [newMeetingInfo, setNewMeetingInfo] = useState<NewMeetingInfo>({} as NewMeetingInfo);
  const [bounds, setBounds] = useState({
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
  });
  const selfInfo = useSelector((state: RootState) => state.user.selfInfo);
  const [joinLoading, setJoinLoading] = useState(false);

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

  const updateStep = useCallback((next: LaunchStep, extraData?: unknown) => {
    console.log(extraData);
    if (extraData) {
      setNewMeetingInfo(extraData as NewMeetingInfo);
    }
    setStep(next);
  }, []);

  const joinMeeting = useCallback((options: any) => {
    setJoinLoading(true);
    im.signalingJoinMeeting(options)
      .then(({ data }) => {
        events.emit(JOIN_MEETING, JSON.parse(data));
        closeModal();
      })
      .catch((err) => {
        const isend = err.errMsg.includes("roomIsNotExist");
        message.warning(isend ? "会议已结束或会议不存在！" : "加入会议失败！");
        console.log(err);
      })
      .finally(() => setJoinLoading(false));
  }, []);

  const inviteMember = () => {
    const meetingInfo = {
      inviterFaceURL: selfInfo.faceURL,
      id: newMeetingInfo.roomID,
      duration: newMeetingInfo.duration,
      inviterNickname: selfInfo.nickname,
      inviterUserID: selfInfo.userID,
      subject: newMeetingInfo.meetingName,
      start: newMeetingInfo.startTime.unix(),
    };
    events.emit(FORWARD_AND_MER_MSG, "meeting_invite", JSON.stringify(meetingInfo));
  };

  const back = () => {
    setStep(LaunchStep.Prepare);
  };

  const deleteMeeting = () => {
    im.signalingCloseRoom(newMeetingInfo.roomID).then(() => back());
  };

  const MainRender = useMemo(() => {
    switch (step) {
      case LaunchStep.Prepare:
        return <MeetingPrepare updateStep={updateStep} />;
      case LaunchStep.Order:
        return <OrderOrJoinMeeting isLaunch={true} updateStep={updateStep} />;
      case LaunchStep.Join:
        return <OrderOrJoinMeeting joinMeeting={joinMeeting} joinLoading={joinLoading} />;
      case LaunchStep.Display:
      case LaunchStep.HistoryDisplay:
        return (
          <MeetingDisplay
            meetingInfo={newMeetingInfo}
            isHost={newMeetingInfo.hostUserID === selfInfo.userID}
            joinLoading={joinLoading}
            updateStep={updateStep}
            joinMeeting={joinMeeting}
          />
        );
      case LaunchStep.Update:
        return <OrderOrJoinMeeting isLaunch={true} updateStep={updateStep} meetingInfo={newMeetingInfo} />;
      default:
        break;
    }
  }, [step, updateStep]);

  const modalTitle = useMemo(() => {
    switch (step) {
      case LaunchStep.Prepare:
        return "视频会议";
      case LaunchStep.Join:
        return "加入会议";
      case LaunchStep.Order:
        return "预约会议";
      case LaunchStep.Display:
        return "预约成功";
      case LaunchStep.HistoryDisplay:
        return "会议详情";
      case LaunchStep.Update:
        return "修改会议信息";
      default:
        return "";
    }
  }, [step]);

  const ignoreClasses = `.ant-form,.join_btn,.action_row,.record_item`;

  const canShare = displayTyps.includes(step) && (newMeetingInfo.hostUserID === selfInfo.userID || !newMeetingInfo.onlyHostInviteUser);
  const canDelete = displayTyps.includes(step) && newMeetingInfo.hostUserID === selfInfo.userID;

  return (
    <Modal
      className={"launch_meeting_modal"}
      closable={false}
      footer={null}
      mask={false}
      width={360}
      centered
      onCancel={closeModal}
      title={null}
      visible
      modalRender={(modal) => (
        <Draggable allowAnyClick={true} disabled={false} bounds={bounds} onStart={(event, uiData) => onStart(event, uiData)} cancel={ignoreClasses} enableUserSelectHack={false}>
          <div ref={draRef}>{modal}</div>
        </Draggable>
      )}
    >
      <div className="main_wrap">
        <div className="modal_title">
          <span>{modalTitle}</span>
          <div className="top_action">
            {canShare ? <img width={14} src={meeting_share} alt="" onClick={inviteMember} /> : null}
            {canDelete ? <img className="delete_icon" width={14} src={meeting_delete} alt="" onClick={deleteMeeting} /> : null}
            {!displayTyps.includes(step) ? <CloseOutlined onClick={closeModal} /> : null}
          </div>
          {!notBackTypes.includes(step) ? (
            <div className="back_icon" onClick={back}>
              <LeftOutlined />
              <span>返回</span>
            </div>
          ) : null}
        </div>
        {MainRender}
      </div>
    </Modal>
  );
});

export default LaunchMeetingModal;

type OrderOrJoinMeetingProps = {
  isLaunch?: boolean;
  meetingInfo?: NewMeetingInfo;
  joinLoading?: boolean;
  joinMeeting?: (options: any) => void;
  updateStep?: (step: LaunchStep, extraData?: unknown) => void;
};
const OrderOrJoinMeeting: FC<OrderOrJoinMeetingProps> = ({ isLaunch, meetingInfo, joinLoading, joinMeeting, updateStep }) => {
  const [form] = Form.useForm<LaunchMeetingFormFields>();
  const selfInfo = useSelector((state: RootState) => state.user.selfInfo);

  const onFinish = (values: LaunchMeetingFormFields) => {
    console.log(values);

    if (meetingInfo) {
      const options = {} as UpdateMeetingParams;
      options.startTime = values.startTime.unix();
      options.endTime = values.startTime.unix() + values.duration;
      options.meetingName = values.meetingName;
      im.signalingUpdateMeetingInfo({
        ...options,
        roomID: meetingInfo.roomID,
      })
        .then(() => updateStep?.(LaunchStep.Display, { ...meetingInfo, ...values }))
        .catch((err) => {
          console.log(err);
        });
      return;
    }

    if (isLaunch) {
      im.signalingCreateMeeting({
        meetingName: values.meetingName,
        meetingHostUserID: selfInfo.userID,
        startTime: values.startTime.unix(),
        meetingDuration: values.duration,
        inviteeUserIDList: [],
      })
        .then(({ data }) => {
          im.signalingUpdateMeetingInfo({
            roomID: JSON.parse(data).roomID,
            participantCanUnmuteSelf: true,
          });
          updateStep?.(LaunchStep.Display, { ...JSON.parse(data), ...values, hostUserID: selfInfo.userID });
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      joinMeeting?.({
        meetingID: values.meetingNo,
        participantNickname: selfInfo.nickname,
      });
    }
  };

  const disabledDate: RangePickerProps["disabledDate"] = (current) => {
    // Can not select days before today and today
    return current && current < moment().subtract(1, "d").endOf("day");
  };
  const disabledTime: RangePickerProps["disabledTime"] = (current) => {
    // 如果日期为今天，禁止选择当前时间之前的值
    if (current && current.isSame(moment(), "day")) {
      return {
        disabledHours: () => [...Array(moment().hour()).keys()],
        disabledMinutes: () => [...Array(moment().minute()).keys()],
        disabledSeconds: () => [...Array(moment().second()).keys()],
      };
    }

    // 其他日期的时间没有限制
    return {};
  };

  return (
    <div className="form_wrap">
      <Form form={form} initialValues={meetingInfo} layout="vertical" size="small" autoComplete="off" onFinish={onFinish}>
        {isLaunch ? (
          <>
            <Form.Item name="meetingName" label="会议主题" rules={[{ required: true, message: "请输入会议主题!" }]}>
              <Input placeholder="请输入会议主题" />
            </Form.Item>
            <Form.Item
              name="startTime"
              label="开始时间"
              rules={[
                {
                  required: true,
                  message: "请选择会议开始时间!",
                },
                {
                  message: "选择的会议开始时间小于当前时间，请重新选择！",
                  validator: async (rule, value: moment.Moment) => {
                    if (value.clone().add(2, "m").isBefore(moment())) {
                      throw new Error("选择的会议开始时间小于当前时间，请重新选择！");
                    }
                  },
                },
              ]}
            >
              <DatePicker disabledDate={disabledDate} disabledTime={disabledTime as any} showTime={{ format: "HH:mm" }} placeholder="请选择会议开始时间" />
            </Form.Item>
            <Form.Item name="duration" label="会议时长" rules={[{ required: true, message: "请选择会议时长!" }]}>
              <Select placeholder="请选择会议时长">
                <Select.Option value={1800}>0.5小时</Select.Option>
                <Select.Option value={3600}>1小时</Select.Option>
                <Select.Option value={5400}>1.5小时</Select.Option>
                <Select.Option value={7200}>2小时</Select.Option>
              </Select>
            </Form.Item>
          </>
        ) : (
          <Form.Item name="meetingNo" label="会议号" rules={[{ required: true, message: "请输入会议号!" }]}>
            <Input placeholder="请输入会议号" />
          </Form.Item>
        )}
      </Form>

      <div className="join_btn">
        <Button type="primary" onClick={form.submit} loading={joinLoading}>
          {meetingInfo ? "确认修改" : isLaunch ? "预约会议" : "加入会议"}
        </Button>
      </div>
    </div>
  );
};

type MeetingRecordItem = {
  createTime: number;
  endTime: number;
  hostUserID: string;
  joinDisableVideo: boolean;
  meetingID: string;
  meetingName: string;
  onlyHostInviteUser: boolean;
  participantCanEnableVideo: boolean;
  startTime: number;
  faceURL: string;
};

type MeetingPrepareProps = {
  updateStep: (step: LaunchStep, extraData?: unknown) => void;
};
const MeetingPrepare: FC<MeetingPrepareProps> = ({ updateStep }) => {
  const selfInfo = useSelector((state: RootState) => state.user.selfInfo);
  const [meetingList, setMeetingList] = useState<MeetingRecordItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getMeetingRecords();
  }, []);

  const getMeetingRecords = () => {
    setLoading(true);
    im.signalingGetMeetings()
      .then(async ({ data }) => {
        const meetingInfoList: MeetingRecordItem[] = JSON.parse(data).meetingInfoList ?? [];
        if (meetingInfoList.length > 0) {
          const { data } = await im.getUsersInfo(meetingInfoList.map((item) => item.hostUserID));
          const userData = JSON.parse(data).map((user: any) => user.publicInfo);
          meetingInfoList.map((meeting) => {
            const findUser = userData.find((user: any) => user.userID === meeting.hostUserID);
            meeting.faceURL = findUser?.faceURL ?? genAvatar(findUser?.nickname, 42);
          });
        }
        setMeetingList(meetingInfoList);
      })
      .finally(() => setLoading(false));
  };

  const actionClick = (idx: number) => {
    switch (idx) {
      case 0:
        updateStep(LaunchStep.Join);
        break;
      case 1:
        im.signalingCreateMeeting({
          meetingName: `${selfInfo.nickname}发起的会议`,
          meetingHostUserID: selfInfo.userID,
          startTime: moment().unix(),
          meetingDuration: 3600,
          inviteeUserIDList: [],
        })
          .then(({ data }) => {
            im.signalingUpdateMeetingInfo({
              roomID: JSON.parse(data).roomID,
              participantCanUnmuteSelf: true,
            });
            setTimeout(() => {
              getMeetingRecords();
            });
            events.emit(JOIN_MEETING, JSON.parse(data));
          })
          .catch((err) => {
            console.log(err);
          });
        break;
      case 2:
        updateStep(LaunchStep.Order);
        break;
      default:
        break;
    }
  };

  return (
    <>
      <div className="action_row">
        {actionList.map((action, idx) => (
          <div key={action.title} className="action_item" onClick={() => actionClick(idx)}>
            <img src={action.icon} alt="" />
            <span>{action.title}</span>
          </div>
        ))}
      </div>
      <div className="loading_wrap">
        {loading ? <Spin tip="" size="default" /> : null}
        <div className="record_list">
          {meetingList.map((item) => (
            <div
              key={item.meetingID}
              className="record_item"
              onClick={() =>
                updateStep(LaunchStep.HistoryDisplay, { ...item, startTime: moment(item.startTime * 1000), duration: item.endTime - item.startTime, roomID: item.meetingID })
              }
            >
              <MyAvatar size={42} src={item.faceURL} />
              <div className="record_details">
                <div className="item_title">
                  <div>{item.meetingName}</div>
                  {Date.now() < item.startTime * 1000 ? <span>未开始</span> : Date.now() < item.endTime * 1000 ? <span style={{ backgroundColor: "#FF9D3C" }}>已开始</span> : null}
                </div>
                <div className="time">{`${moment(item.startTime * 1000).format("M月DD日 HH:mm")}-${moment(item.endTime * 1000).format("HH:mm")}`}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

type NewMeetingInfo = {
  meetingName: string;
  startTime: moment.Moment;
  duration: number;
  roomID: string;
  token: string;
  liveURL: string;
  hostUserID: string;
  onlyHostInviteUser?: boolean;
};

type MeetingDisplayProps = {
  isHost: boolean;
  meetingInfo: NewMeetingInfo;
  joinLoading: boolean;
  joinMeeting: (options: any) => void;
  updateStep: (step: LaunchStep, extraData?: unknown) => void;
};
const MeetingDisplay: FC<MeetingDisplayProps> = ({ isHost, meetingInfo, joinLoading, updateStep, joinMeeting }) => {
  const selfName = useSelector((state: RootState) => state.user.selfInfo.nickname);

  return (
    <div className="display_wrap">
      <h4>{meetingInfo.meetingName}</h4>
      <div className="meeting_time_line">
        <div className="time_point">
          <span>{meetingInfo.startTime.format("HH:mm")}</span>
          <span>{meetingInfo.startTime.format("YYYY年M月D日")}</span>
        </div>
        <div className="duration">
          {Date.now() < meetingInfo.startTime.unix() * 1000 ? (
            <span className="state">待开始</span>
          ) : Date.now() < (meetingInfo.startTime.unix() + meetingInfo.duration) * 1000 ? (
            <span className="state" style={{ backgroundColor: "#FF9D3C" }}>
              已开始
            </span>
          ) : (
            <span className="state">已结束</span>
          )}
          {/* @ts-ignore */}
          <span className="time_desc">{secondsToTime[meetingInfo.duration] ?? ""}</span>
        </div>
        <div className="time_point">
          <span>{meetingInfo.startTime.clone().add(Number(meetingInfo.duration), "s").format("HH:mm")}</span>
          <span>{meetingInfo.startTime.clone().add(Number(meetingInfo.duration), "s").format("YYYY年M月D日")}</span>
        </div>
      </div>

      <div className="desc_row">
        <div>{`会议号：${meetingInfo.roomID}`}</div>
        <div>{`发起人：${selfName}`}</div>
      </div>

      <div className="display_action">
        <Button
          type="primary"
          loading={joinLoading}
          onClick={() =>
            joinMeeting({
              meetingID: meetingInfo.roomID,
              meetingName: meetingInfo.meetingName,
              participantNickname: selfName,
            })
          }
        >
          进入会议
        </Button>
        {isHost ? (
          <Button type="text" onClick={() => updateStep(LaunchStep.Update, meetingInfo)}>
            修改会议信息
          </Button>
        ) : null}
      </div>
    </div>
  );
};
