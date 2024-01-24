import { useRequest } from "ahooks";
import dayjs from "dayjs";
import { FC, useEffect } from "react";

import { message as toast } from "@/AntdGlobalComp";
import meeting_arrow from "@/assets/images/messageItem/meeting_arrow.png";
import meeting_icon from "@/assets/images/messageItem/meeting_icon.png";
import { IMSDK } from "@/layout/MainContentWrap";
import { MeetingAuthData } from "@/pages/common/MeetingManageModal/data";
import { MeetingInvitation, secondsToTime } from "@/pages/common/MeetingModal/data";
import emitter from "@/utils/events";

import { IMessageItemProps } from ".";

const MeetingMessageRender: FC<IMessageItemProps> = ({ message }) => {
  const meetingInfo = JSON.parse(message.customElem.data).data as MeetingInvitation;
  const { runAsync, loading, cancel } = useRequest(
    IMSDK.signalingJoinMeeting<MeetingAuthData>,
    {
      manual: true,
    },
  );

  useEffect(() => {
    return () => {
      cancel();
    };
  }, []);

  const joinMeeting = () => {
    if (loading) return;
    runAsync(meetingInfo.id)
      .then(({ data }) => emitter.emit("OPEN_MEETING_MODAL", data))
      .catch((err) => {
        console.log(err);

        const isend = err.errMsg.includes("roomIsNotExist");
        toast.warning(isend ? "会议已结束或会议不存在！" : "加入会议失败！");
        console.log(err);
      });
  };

  return (
    <div className="w-60 rounded-md border border-[var(--gap-text)] px-3 py-2">
      <div className="mb-1 flex items-center">
        <img src={meeting_icon} alt="" />
        <div className="ml-2 truncate">{meetingInfo.subject}</div>
      </div>
      <ul className="ml-6 list-disc text-sm">
        <li className="py-1">{`开始时间：${dayjs(meetingInfo.start * 1000).format(
          "M月DD日 HH:mm",
        )}`}</li>
        {/* @ts-ignore */}
        <li className="py-1">{`会议时长：${secondsToTime[meetingInfo.duration]}`}</li>
        <li className="py-1">{`会议号：${meetingInfo.id}`}</li>
      </ul>
      <div
        className="mt-1 flex cursor-pointer items-center justify-center"
        onClick={joinMeeting}
      >
        <div className="text-xs text-[var(--primary)]">进入会议</div>
        <img src={meeting_arrow} alt="" />
      </div>
    </div>
  );
};

export default MeetingMessageRender;
