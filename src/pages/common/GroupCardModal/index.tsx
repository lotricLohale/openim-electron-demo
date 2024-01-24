import { LeftOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import { Button, Input } from "antd";
import dayjs from "dayjs";
import { t } from "i18next";
import { forwardRef, ForwardRefRenderFunction, memo, useEffect, useState } from "react";

import clock from "@/assets/images/common/clock.png";
import member_etc from "@/assets/images/common/member_etc.png";
import DraggableModalWrap from "@/components/DraggableModalWrap";
import OIMAvatar from "@/components/OIMAvatar";
import { useConversationToggle } from "@/hooks/useConversationToggle";
import useGroupMembers from "@/hooks/useGroupMembers";
import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";
import { IMSDK } from "@/layout/MainContentWrap";
import { getDefaultAvatar } from "@/utils/avatar";
import { feedbackToast } from "@/utils/common";
import { GroupItem } from "@/utils/open-im-sdk-wasm/types/entity";
import {
  GroupJoinSource,
  GroupVerificationType,
  SessionType,
} from "@/utils/open-im-sdk-wasm/types/enum";

interface IGroupCardModalProps {
  groupData?: GroupItem;
}

const GroupCardModal: ForwardRefRenderFunction<
  OverlayVisibleHandle,
  IGroupCardModalProps
> = ({ groupData }, ref) => {
  const [reqMsg, setReqMsg] = useState("");
  const [isSendRequest, setIsSendRequest] = useState(false);

  const { fetchState, getMemberData, resetState } = useGroupMembers({
    groupID: groupData?.groupID,
  });

  const { toSpecifiedConversation } = useConversationToggle();
  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);

  const { runAsync, loading } = useRequest(IMSDK.joinGroup, {
    manual: true,
  });

  useEffect(() => {
    if (isOverlayOpen) {
      getMemberData(true);
    }
  }, [isOverlayOpen]);

  const createTimeStr = dayjs(groupData?.createTime ?? 0).format("YYYY年M月D日");
  const inThisGroup = fetchState.groupMemberList.length > 0;

  const renderList = inThisGroup
    ? fetchState.groupMemberList.slice(0, 7)
    : new Array(7).fill(1).map((_, idx) => ({
        userID: idx,
        nickname: "",
        faceURL: getDefaultAvatar(`ic_avatar_0${idx === 6 ? 1 : idx + 1}`),
      }));

  const joinOrSendMessage = async () => {
    if (inThisGroup) {
      toSpecifiedConversation({
        sourceID: groupData!.groupID,
        sessionType: SessionType.WorkingGroup,
      });
      closeOverlay();
      return;
    }

    if (groupData?.needVerification === GroupVerificationType.AllNot) {
      await sendApplication();
      closeOverlay();
      return;
    }
    setIsSendRequest(true);
  };

  const sendApplication = async () => {
    try {
      await runAsync({
        groupID: groupData!.groupID,
        reqMsg,
        joinSource: GroupJoinSource.Search,
      });
      feedbackToast({ msg: "发送入群请求成功！" });
      setIsSendRequest(false);
    } catch (error) {
      feedbackToast({ error, msg: t("toast.sendApplicationFailed") });
    }
  };

  return (
    <DraggableModalWrap
      title={null}
      footer={null}
      open={isOverlayOpen}
      closable={false}
      width={484}
      onCancel={closeOverlay}
      afterClose={resetState}
      destroyOnClose
      maskStyle={{
        opacity: 0,
        transition: "none",
      }}
      ignoreClasses=".ignore-drag, .no-padding-modal, .cursor-pointer"
      className="no-padding-modal"
      maskTransitionName=""
    >
      <div>
        {isSendRequest && (
          <div
            className="flex w-fit cursor-pointer items-center pl-5.5 pt-5.5"
            onClick={() => setIsSendRequest(false)}
          >
            <LeftOutlined rev={undefined} />
            <div className="ml-1 font-medium">群聊验证</div>
          </div>
        )}
        <div className="flex p-5.5">
          <OIMAvatar size={60} src={groupData?.faceURL} isgroup />
          <div className="ml-3">
            <div className="mb-3 max-w-[120px] truncate text-base font-medium">
              {groupData?.groupName}
            </div>
            <div className="flex items-center">
              <div className="text-xs text-[var(--sub-text)]">{`ID：${groupData?.groupID}`}</div>
              <div className="ml-4 flex items-center">
                <img src={clock} width={10} alt="" />
                <div className="text-xs text-[var(--sub-text)]">{createTimeStr}</div>
              </div>
            </div>
          </div>
        </div>
        {isSendRequest ? (
          <div className="mx-5.5">
            <div className="text-xs text-[var(--sub-text)]">验证信息</div>
            <div className="mt-3">
              <Input.TextArea
                showCount
                value={reqMsg}
                maxLength={50}
                bordered={false}
                placeholder="请输入"
                style={{ padding: "8px 6px" }}
                autoSize={{ minRows: 4, maxRows: 4 }}
                onChange={(e) => setReqMsg(e.target.value)}
                className="bg-[var(--chat-bubble)] hover:bg-[var(--chat-bubble)]"
              />
            </div>
            <div className="my-6 flex justify-center">
              <Button
                className="w-[60%]"
                type="primary"
                loading={loading}
                onClick={sendApplication}
              >
                {"发送"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-[#F2F8FF] p-5.5">
            {inThisGroup && (
              <div className="mb-3">{`群成员：${groupData?.memberCount}人`}</div>
            )}
            <div className="flex items-center">
              {renderList.map((item) => (
                <OIMAvatar
                  className="mr-3"
                  src={item.faceURL}
                  text={item.nickname}
                  key={item.userID}
                />
              ))}
              {(groupData?.memberCount ?? 0) < 8 && <OIMAvatar src={member_etc} />}
            </div>
            <div className="mt-28 flex justify-center">
              <Button
                className="w-[60%]"
                type="primary"
                loading={loading}
                onClick={joinOrSendMessage}
              >
                {inThisGroup ? "发送消息" : "添加群聊"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DraggableModalWrap>
  );
};

export default memo(forwardRef(GroupCardModal));
