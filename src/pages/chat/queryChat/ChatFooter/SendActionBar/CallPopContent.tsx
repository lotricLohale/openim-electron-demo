import { memo } from "react";
import { v4 as uuidV4 } from "uuid";

import call_audio from "@/assets/images/chatFooter/call_audio.png";
import call_video from "@/assets/images/chatFooter/call_video.png";
import { useConversationStore, useUserStore } from "@/store";
import emitter from "@/utils/events";
import { isGroupSession } from "@/utils/imCommon";
import { SessionType } from "@/utils/open-im-sdk-wasm/types/enum";

const callList = [
  {
    idx: 0,
    title: "视频通话",
    icon: call_video,
  },
  {
    idx: 1,
    title: "语音通话",
    icon: call_audio,
  },
];

const CallPopContent = ({ callClick }: { callClick?: (idx: number) => void }) => {
  const prepareCall = (idx: number) => {
    const conversation = useConversationStore.getState().currentConversation!;
    const mediaType = idx ? "audio" : "video";
    if (isGroupSession(conversation.conversationType)) {
      emitter.emit("OPEN_CHOOSE_MODAL", {
        type: "RTC_INVITE",
        extraData: mediaType,
      });
      callClick?.(idx);
      return;
    }
    emitter.emit("OPEN_RTC_MODAL", {
      invitation: {
        inviterUserID: useUserStore.getState().selfInfo.userID,
        inviteeUserIDList: [conversation.userID],
        groupID: "",
        roomID: uuidV4(),
        timeout: 60,
        mediaType,
        sessionType: SessionType.Single,
        platformID: window.electronAPI?.getPlatform() ?? 5,
      },
      participant: {
        userInfo: {
          nickname: conversation.showName,
          userID: conversation.userID,
          faceURL: conversation.faceURL,
          ex: "",
        },
      },
    });
    callClick?.(idx);
  };
  return (
    <div className="p-1">
      {callList.map((item) => (
        <div
          className="flex cursor-pointer items-center rounded px-3 py-2 text-xs hover:bg-[var(--primary-active)]"
          key={item.title}
          onClick={() => prepareCall(item.idx)}
        >
          <img width={20} src={item.icon} alt="call_video" />
          <div className="ml-3 text-[#515E70]">{item.title}</div>
        </div>
      ))}
    </div>
  );
};
export default memo(CallPopContent);
