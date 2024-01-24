import { Button, DatePicker, Form, Input, Select } from "antd";
import { RangePickerProps } from "antd/es/date-picker";
import dayjs from "dayjs";
import { memo } from "react";

import { IMSDK } from "@/layout/MainContentWrap";
import { useUserStore } from "@/store";

import { UpdateMeetingParams } from "../MeetingModal/data";
import {
  LaunchMeetingFormFields,
  LaunchStep,
  MeetingAuthData,
  NewMeetingInfo,
} from "./data";

type OrderOrJoinMeetingProps = {
  isLaunch?: boolean;
  meetingInfo?: NewMeetingInfo;
  joinLoading?: boolean;
  joinMeeting?: (roomID: string) => void;
  updateStep?: (step: LaunchStep, extraData?: unknown) => void;
};
export const OrderOrJoinMeeting = memo(
  ({
    isLaunch,
    meetingInfo,
    joinLoading,
    joinMeeting,
    updateStep,
  }: OrderOrJoinMeetingProps) => {
    const [form] = Form.useForm<LaunchMeetingFormFields>();
    const selfInfo = useUserStore((state) => state.selfInfo);

    const onFinish = (values: LaunchMeetingFormFields) => {
      if (meetingInfo) {
        const options = {} as UpdateMeetingParams;
        options.startTime = values.startTime.unix();
        options.endTime = values.startTime.unix() + values.duration;
        options.meetingName = values.meetingName;
        IMSDK.signalingUpdateMeetingInfo({
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
        IMSDK.signalingCreateMeeting<MeetingAuthData>({
          meetingName: values.meetingName,
          meetingHostUserID: selfInfo.userID,
          startTime: values.startTime.unix(),
          meetingDuration: values.duration,
          inviteeUserIDList: [],
        })
          .then(({ data }) => {
            IMSDK.signalingUpdateMeetingInfo({
              roomID: data.roomID,
              participantCanUnmuteSelf: true,
            });
            updateStep?.(LaunchStep.Display, {
              ...data,
              ...values,
              hostUserID: selfInfo.userID,
            });
          })
          .catch((err) => {
            console.log(err);
          });
      } else {
        joinMeeting?.(values.meetingNo);
      }
    };

    const disabledDate: RangePickerProps["disabledDate"] = (current) => {
      // Can not select days before today
      return current && current < dayjs().subtract(1, "d").endOf("day");
    };
    const disabledTime: RangePickerProps["disabledTime"] = (current) => {
      // 如果日期为今天，禁止选择当前时间之前的值
      if (current && current.isSame(dayjs(), "day")) {
        return {
          disabledHours: () => [...Array(dayjs(meetingInfo?.startTime).hour()).keys()],
          disabledMinutes: () => [
            ...Array(dayjs(meetingInfo?.startTime).minute()).keys(),
          ],
          disabledSeconds: () => [
            ...Array(dayjs(meetingInfo?.startTime).second()).keys(),
          ],
        };
      }

      // 其他日期的时间没有限制
      return {};
    };

    return (
      <div className="p-4">
        <Form
          className="meeting-form w-full"
          form={form}
          initialValues={meetingInfo}
          layout="vertical"
          size="small"
          autoComplete="off"
          onFinish={onFinish}
        >
          {isLaunch ? (
            <>
              <Form.Item
                name="meetingName"
                label="会议主题"
                rules={[{ required: true, message: "请输入会议主题!" }]}
              >
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
                    // eslint-disable-next-line
                    validator: async (_, value: dayjs.Dayjs) => {
                      if (
                        value
                          .clone()
                          .add(2, "m")
                          .isBefore(dayjs(meetingInfo?.startTime))
                      ) {
                        throw new Error("选择的会议开始时间小于当前时间，请重新选择！");
                      }
                    },
                  },
                ]}
              >
                <DatePicker
                  disabledDate={disabledDate}
                  disabledTime={disabledTime as any}
                  showTime={{ format: "HH:mm" }}
                  placeholder="请选择会议开始时间"
                />
              </Form.Item>
              <Form.Item
                name="duration"
                label="会议时长"
                rules={[{ required: true, message: "请选择会议时长!" }]}
              >
                <Select placeholder="请选择会议时长">
                  <Select.Option value={1800}>0.5小时</Select.Option>
                  <Select.Option value={3600}>1小时</Select.Option>
                  <Select.Option value={5400}>1.5小时</Select.Option>
                  <Select.Option value={7200}>2小时</Select.Option>
                </Select>
              </Form.Item>
            </>
          ) : (
            <Form.Item
              name="meetingNo"
              label="会议号"
              rules={[{ required: true, message: "请输入会议号!" }]}
            >
              <Input placeholder="请输入会议号" />
            </Form.Item>
          )}
        </Form>

        <div className="mb-14 mt-20 w-full text-center">
          <Button
            className="ignore-drag w-[80%] rounded"
            type="primary"
            onClick={form.submit}
            loading={joinLoading}
          >
            {meetingInfo ? "确认修改" : isLaunch ? "预约会议" : "加入会议"}
          </Button>
        </div>
      </div>
    );
  },
);
