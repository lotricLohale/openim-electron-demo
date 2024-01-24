import { Button, Divider, Drawer, Input } from "antd";
import {
  forwardRef,
  ForwardRefRenderFunction,
  memo,
  useEffect,
  useReducer,
  useState,
} from "react";

import empty_announcement from "@/assets/images/chatSetting/empty_announcement.png";
import OIMAvatar from "@/components/OIMAvatar";
import { useCurrentMemberRole } from "@/hooks/useCurrentMemberRole";
import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";
import { IMSDK } from "@/layout/MainContentWrap";
import { useConversationStore } from "@/store";
import { feedbackToast, formatBr } from "@/utils/common";
import { formatMessageTime } from "@/utils/imCommon";
import { GroupItem, GroupMemberItem } from "@/utils/open-im-sdk-wasm/types/entity";

const initialState = {
  editing: false,
  loading: false,
};

type ActionType = "editing" | "loading" | "done";

const reducer = (state: typeof initialState, action: { type: ActionType }) => {
  switch (action.type) {
    case "editing":
      return { ...state, editing: true, loading: false };
    case "loading":
      return { ...state, editing: true, loading: true };
    case "done":
      return { ...state, editing: false, loading: false };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
};

const GroupAnnouncementDrawer: ForwardRefRenderFunction<
  OverlayVisibleHandle,
  unknown
> = (_, ref) => {
  const [notification, setNotification] = useState<string>();
  const [editState, dispatch] = useReducer(reducer, initialState);
  const currentGroup = useConversationStore((state) => state.currentGroupInfo);
  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);

  const { isNomal } = useCurrentMemberRole();

  useEffect(() => {
    setNotification(currentGroup?.notification);
  }, [currentGroup?.notification]);

  const editOrPublish = async () => {
    if (!editState.editing) {
      setNotification(currentGroup?.notification);
      dispatch({ type: "editing" });
      return;
    }
    dispatch({ type: "loading" });

    try {
      await IMSDK.setGroupInfo({
        groupID: currentGroup!.groupID,
        notification,
      });
    } catch (error) {
      feedbackToast({ error });
    }
    dispatch({ type: "done" });
  };

  return (
    <Drawer
      title={"群公告"}
      placement="right"
      rootClassName="chat-drawer"
      onClose={closeOverlay}
      open={isOverlayOpen}
      afterOpenChange={(vis) => {
        if (!vis) {
          dispatch({ type: "done" });
        }
      }}
      maskClassName="opacity-0"
      maskMotion={{
        visible: false,
      }}
      width={450}
      getContainer={"#chat-container"}
    >
      <div className="relative m-5.5 flex h-full flex-col justify-center">
        <div className="flex flex-1 flex-col overflow-hidden">
          {!editState.editing ? (
            <NotificationContent currentGroup={currentGroup} />
          ) : (
            <Input.TextArea
              showCount
              value={notification}
              maxLength={250}
              bordered={false}
              placeholder="请输入"
              styles={{
                textarea: {
                  padding: 0,
                },
              }}
              onChange={(e) => setNotification(e.target.value)}
              autoSize={{ minRows: 24, maxRows: 24 }}
            />
          )}

          <div className="h-20" />
        </div>
        {isNomal ? (
          <Divider className="border-1 absolute bottom-12 border-[var(--gap-text)] px-20 !text-xs !text-[var(--sub-text)]">
            只有群主及管理员可以编辑
          </Divider>
        ) : (
          <div className="absolute bottom-12 right-9">
            <Button
              className="px-5"
              type="primary"
              onClick={editOrPublish}
              loading={editState.loading}
            >
              {editState.editing ? "发布" : "编辑"}
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default memo(forwardRef(GroupAnnouncementDrawer));

const NotificationContent = ({ currentGroup }: { currentGroup?: GroupItem }) => {
  const [notificationOpUser, setNotificationOpUser] = useState<GroupMemberItem>();

  useEffect(() => {
    if (!currentGroup?.notificationUserID) return;

    const getNotificationOpUser = async () => {
      try {
        const { data } = await IMSDK.getSpecifiedGroupMembersInfo<GroupMemberItem[]>({
          groupID: currentGroup.groupID,
          userIDList: [currentGroup.notificationUserID],
        });
        setNotificationOpUser(data[0]);
      } catch (error) {
        console.log(error);
      }
    };
    getNotificationOpUser();
  }, [currentGroup?.notificationUserID, currentGroup?.groupID]);

  return (
    <>
      {currentGroup?.notification ? (
        <>
          <div className="flex">
            <OIMAvatar
              src={notificationOpUser?.faceURL}
              text={notificationOpUser?.nickname || "管理员"}
            />
            <div className="ml-3">
              <div className="mb-1.5 max-w-[200px] truncate">
                {notificationOpUser?.nickname || "管理员"}
              </div>
              <div className="text-xs text-[var(--sub-text)]">
                {formatMessageTime(Number(currentGroup?.notificationUpdateTime))}
              </div>
            </div>
          </div>
          <div
            className="text-break mt-3 flex-1 overflow-y-auto"
            dangerouslySetInnerHTML={{
              __html: formatBr(currentGroup?.notification || ""),
            }}
          ></div>
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center">
          <img width={176} src={empty_announcement} alt="empty_announcement" />
          <div className="mt-9 text-xs text-[var(--sub-text)]">还没有群公告哦～</div>
        </div>
      )}
    </>
  );
};
