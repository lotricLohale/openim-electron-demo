import { CloseOutlined } from "@ant-design/icons";
import { Button, Input, Modal, Upload } from "antd";
import {
  forwardRef,
  ForwardRefRenderFunction,
  memo,
  useEffect,
  useRef,
  useState,
} from "react";
import { v4 as uuidV4 } from "uuid";

import { message } from "@/AntdGlobalComp";
import OIMAvatar from "@/components/OIMAvatar";
import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";
import { IMSDK } from "@/layout/MainContentWrap";
import { useSendMessage } from "@/pages/chat/queryChat/ChatFooter/useSendMessage";
import { ExMessageItem, useConversationStore, useUserStore } from "@/store";
import { feedbackToast } from "@/utils/common";
import emitter from "@/utils/events";
import { CardElem } from "@/utils/open-im-sdk-wasm/types/entity";
import { GroupType, SessionType } from "@/utils/open-im-sdk-wasm/types/enum";
import {
  CustomMsgParams,
  MergerMsgParams,
} from "@/utils/open-im-sdk-wasm/types/params";

import ChooseBox, { ChooseBoxHandle } from "./ChooseBox";
import { CheckListItem } from "./ChooseBox/CheckItem";

export type ChooseModalType =
  | "CRATE_GROUP"
  | "INVITE_TO_GROUP"
  | "KICK_FORM_GROUP"
  | "TRANSFER_IN_GROUP"
  | "FORWARD_MESSAGE"
  | "SELECT_CARD"
  | "SHARE_CARD"
  | "SELECT_USER"
  | "RTC_INVITE"
  | "MEETING_INVITE";

export interface SelectUserExtraData {
  notConversation: boolean;
  list: CheckListItem[];
}

export interface ChooseModalState {
  type: ChooseModalType;
  extraData?: unknown;
}

interface IChooseModalProps {
  state: ChooseModalState;
}

const titleMap = {
  CRATE_GROUP: "创建群聊",
  INVITE_TO_GROUP: "邀请好友",
  KICK_FORM_GROUP: "移出成员",
  TRANSFER_IN_GROUP: "转让群主",
  FORWARD_MESSAGE: "转发消息",
  SELECT_CARD: "分享名片",
  SHARE_CARD: "分享名片",
  SELECT_USER: "选择用户",
  RTC_INVITE: "选择成员",
  MEETING_INVITE: "选择成员",
};

const showConversationTypes = ["FORWARD_MESSAGE", "SHARE_CARD", "MEETING_INVITE"];
const onlyOneTypes = ["TRANSFER_IN_GROUP", "SELECT_CARD"];
const onlyMemberTypes = ["KICK_FORM_GROUP", "TRANSFER_IN_GROUP", "RTC_INVITE"];

const ChooseModal: ForwardRefRenderFunction<OverlayVisibleHandle, IChooseModalProps> = (
  { state: { type, extraData } },
  ref,
) => {
  const chooseBoxRef = useRef<ChooseBoxHandle>(null);
  const [loading, setLoading] = useState(false);
  const [groupBaseInfo, setGroupBaseInfo] = useState({
    groupName: "",
    groupAvatar: "",
  });

  const { sendMessage } = useSendMessage();
  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);

  useEffect(() => {
    if (isOverlayOpen && type === "CRATE_GROUP" && extraData) {
      setTimeout(
        () => chooseBoxRef.current?.updatePrevCheckList(extraData as CheckListItem[]),
        100,
      );
    }
    if (isOverlayOpen && type === "SELECT_USER" && extraData) {
      setTimeout(
        () =>
          chooseBoxRef.current?.updatePrevCheckList(
            (extraData as SelectUserExtraData).list,
          ),
        100,
      );
    }
  }, [isOverlayOpen]);

  const confirmChoose = async () => {
    const choosedList = chooseBoxRef.current?.getCheckedList() ?? [];
    if (!choosedList?.length && type !== "SELECT_USER")
      return message.warning("请至少选择一项！");

    if (!groupBaseInfo.groupName && type === "CRATE_GROUP")
      return message.warning("请输入群名称！");

    setLoading(true);
    try {
      switch (type) {
        case "CRATE_GROUP":
          await IMSDK.createGroup({
            groupInfo: {
              groupType: GroupType.WorkingGroup,
              groupName: groupBaseInfo.groupName,
              faceURL: groupBaseInfo.groupAvatar,
            },
            memberUserIDs: choosedList.map(
              (item) => item.userID ?? item.user?.userID ?? "",
            ),
            adminUserIDs: [],
          });
          break;
        case "INVITE_TO_GROUP":
          await IMSDK.inviteUserToGroup({
            groupID: extraData as string,
            userIDList: choosedList.map(
              (item) => item.userID ?? item.user?.userID ?? "",
            ),
            reason: "",
          });
          break;
        case "KICK_FORM_GROUP":
          await IMSDK.kickGroupMember({
            groupID: extraData as string,
            userIDList: choosedList.map(
              (item) => item.userID ?? item.user?.userID ?? "",
            ),
            reason: "",
          });
          break;
        case "TRANSFER_IN_GROUP":
          await IMSDK.transferGroupOwner({
            groupID: extraData as string,
            newOwnerUserID: choosedList[0].userID!,
          });
          break;
        case "SELECT_CARD":
          sendMessage({
            message: (
              await IMSDK.createCardMessage<ExMessageItem>({
                userID: choosedList[0].userID ?? choosedList[0].user?.userID ?? "",
                nickname:
                  choosedList[0].nickname ?? choosedList[0].user?.nickname ?? "",
                faceURL: choosedList[0].faceURL ?? choosedList[0].user?.faceURL ?? "",
                ex: choosedList[0].ex ?? "",
              })
            ).data,
          });
          break;
        case "FORWARD_MESSAGE":
        case "SHARE_CARD":
        case "MEETING_INVITE":
          choosedList.map(async (item) => {
            const message = await getBatchMessage();
            sendMessage({
              message,
              recvID: item.userID ?? item.user?.userID ?? "",
              groupID: item.groupID ?? "",
            });
          });
          message.success("发送成功！");
          break;
        case "SELECT_USER":
          emitter.emit("SELECT_USER", {
            notConversation: (extraData as SelectUserExtraData).notConversation,
            choosedList,
          });
          break;
        case "RTC_INVITE":
          emitter.emit("OPEN_RTC_MODAL", {
            invitation: {
              inviterUserID: useUserStore.getState().selfInfo.userID,
              inviteeUserIDList: choosedList.map((item) => item.userID!),
              groupID:
                useConversationStore.getState().currentConversation?.groupID ?? "",
              roomID: uuidV4(),
              timeout: 60,
              mediaType: extraData as string,
              sessionType: SessionType.WorkingGroup,
              platformID: window.electronAPI?.getPlatform() ?? 5,
            },
          });
          break;
        default:
          break;
      }
    } catch (error) {
      feedbackToast({ error });
    }
    setLoading(false);
    closeOverlay();
  };

  const getBatchMessage = async () => {
    if ((extraData as MergerMsgParams).title) {
      return (
        await IMSDK.createMergerMessage<ExMessageItem>(extraData as MergerMsgParams)
      ).data;
    }
    if ((extraData as ExMessageItem).clientMsgID) {
      return (
        await IMSDK.createForwardMessage<ExMessageItem>(extraData as ExMessageItem)
      ).data;
    }
    if ((extraData as CustomMsgParams).data) {
      return (
        await IMSDK.createCustomMessage<ExMessageItem>(extraData as CustomMsgParams)
      ).data;
    }
    return (await IMSDK.createCardMessage<ExMessageItem>(extraData as CardElem)).data;
  };

  const resetState = () => {
    chooseBoxRef.current?.resetState();
    setGroupBaseInfo({
      groupName: "",
      groupAvatar: "",
    });
  };

  const customUpload = async ({ file }: { file: File }) => {
    try {
      const {
        data: { url },
      } = await IMSDK.uploadFile({
        name: file.name,
        contentType: file.type,
        uuid: uuidV4(),
        file,
      });
      setGroupBaseInfo((prev) => ({ ...prev, groupAvatar: url }));
    } catch (error) {
      feedbackToast({ error: "修改群头像失败！" });
    }
  };

  const isCheckInGroup = type === "INVITE_TO_GROUP";
  const notConversation = !showConversationTypes.includes(type);

  return (
    <Modal
      title={null}
      footer={null}
      centered
      open={isOverlayOpen}
      closable={false}
      width={680}
      onCancel={closeOverlay}
      destroyOnClose
      maskStyle={{
        opacity: 0,
        transition: "none",
      }}
      afterClose={resetState}
      className="no-padding-modal max-w-[80vw]"
      maskTransitionName=""
    >
      <div>
        <div className="app-no-drag flex h-16 items-center justify-between bg-[var(--gap-text)] px-7">
          <div>{titleMap[type]}</div>
          <CloseOutlined
            className="cursor-pointer text-[#8e9ab0]"
            rev={undefined}
            onClick={closeOverlay}
          />
        </div>
        {type === "CRATE_GROUP" ? (
          <div className="px-6 pt-4">
            <div className="mb-6 flex items-center">
              <div className="min-w-[60px] font-medium">群名称</div>
              <Input
                placeholder="请输入"
                value={groupBaseInfo.groupName}
                onChange={(e) =>
                  setGroupBaseInfo((state) => ({ ...state, groupName: e.target.value }))
                }
              />
            </div>
            <div className="mb-6 flex items-center">
              <div className="min-w-[60px] font-medium">群头像</div>
              <div className="flex items-center">
                <OIMAvatar src={groupBaseInfo.groupAvatar} isgroup />
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  customRequest={customUpload as any}
                >
                  <span className="ml-3 cursor-pointer text-xs text-[var(--primary)]">
                    点击修改
                  </span>
                </Upload>
              </div>
            </div>
            <div className="flex">
              <div className="min-w-[60px] font-medium">群成员</div>
              <ChooseBox
                className="!m-0 !h-[40vh] flex-1"
                ref={chooseBoxRef}
                notConversation={notConversation}
              />
            </div>
          </div>
        ) : (
          <ChooseBox
            className="!h-[60vh]"
            ref={chooseBoxRef}
            isCheckInGroup={isCheckInGroup}
            notConversation={
              (extraData as SelectUserExtraData)?.notConversation || notConversation
            }
            showGroupMember={onlyMemberTypes.includes(type)}
            chooseOneOnly={onlyOneTypes.includes(type)}
            checkMemberRole={type === "KICK_FORM_GROUP"}
          />
        )}
        <div className="flex justify-end px-9 py-6">
          <Button
            className="mr-6 border-0 bg-[var(--chat-bubble)] px-6"
            onClick={closeOverlay}
          >
            取消
          </Button>
          <Button
            className="px-6"
            type="primary"
            loading={loading}
            onClick={confirmChoose}
          >
            确定
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default memo(forwardRef(ChooseModal));
