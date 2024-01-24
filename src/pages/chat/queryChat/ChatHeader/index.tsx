import { Layout, Tooltip } from "antd";
import clsx from "clsx";
import { memo, useEffect, useRef, useState } from "react";

import group_member from "@/assets/images/chatHeader/group_member.png";
import group_notice from "@/assets/images/chatHeader/group_notice.png";
import launch_group from "@/assets/images/chatHeader/launch_group.png";
import search_history from "@/assets/images/chatHeader/search_history.png";
import settings from "@/assets/images/chatHeader/settings.png";
import OIMAvatar from "@/components/OIMAvatar";
import { OverlayVisibleHandle } from "@/hooks/useOverlayVisible";
import { IMSDK } from "@/layout/MainContentWrap";
import { useConversationStore } from "@/store";
import emitter from "@/utils/events";
import { isGroupSession } from "@/utils/imCommon";
import { CbEvents } from "@/utils/open-im-sdk-wasm/constant";
import { UserOnlineState, WSEvent } from "@/utils/open-im-sdk-wasm/types/entity";
import {
  GroupAtType,
  OnlineState,
  SessionType,
} from "@/utils/open-im-sdk-wasm/types/enum";

import GroupAnnouncementDrawer from "../GroupAnnouncementDrawer";
import GroupSetting from "../GroupSetting";
import SearchMessageDrawer from "../SearchMessageDrawer";
import SingleSetting from "../SingleSetting";
import styles from "./chat-header.module.scss";
import GroupAnnouncementCard from "./GroupAnnouncementCard";

const menuList = [
  {
    title: "群公告",
    icon: group_notice,
    idx: 0,
  },
  {
    title: "历史记录",
    icon: search_history,
    idx: 1,
  },
  // {
  //   title: "文件",
  //   icon: file_manage,
  //   idx: 2,
  // },
  {
    title: "创建群聊",
    icon: launch_group,
    idx: 3,
  },
  {
    title: "邀请",
    icon: launch_group,
    idx: 4,
  },
  {
    title: "设置",
    icon: settings,
    idx: 5,
  },
];

const ChatHeader = () => {
  const singleSettingRef = useRef<OverlayVisibleHandle>(null);
  const groupSettingRef = useRef<OverlayVisibleHandle>(null);
  const searchMessageRef = useRef<OverlayVisibleHandle>(null);
  const groupAnnouncementRef = useRef<OverlayVisibleHandle>(null);

  const currentConversation = useConversationStore(
    (state) => state.currentConversation,
  );
  const currentGroupInfo = useConversationStore((state) => state.currentGroupInfo);
  const inGroup = useConversationStore((state) =>
    Boolean(state.currentMemberInGroup?.groupID),
  );

  const menuClick = (idx: number) => {
    switch (idx) {
      case 0:
        groupAnnouncementRef.current?.openOverlay();
        break;
      case 1:
        searchMessageRef.current?.openOverlay();
        break;
      // case 2:
      //   break;
      case 3:
      case 4:
        emitter.emit("OPEN_CHOOSE_MODAL", {
          type: isSingle ? "CRATE_GROUP" : "INVITE_TO_GROUP",
          extraData: isSingle
            ? [{ ...currentConversation }]
            : currentConversation?.groupID,
        });
        break;
      case 5:
        if (isGroupSession(currentConversation?.conversationType)) {
          groupSettingRef.current?.openOverlay();
        } else {
          singleSettingRef.current?.openOverlay();
        }
        break;
      default:
        break;
    }
  };

  const isNotification =
    currentConversation?.conversationType === SessionType.Notification;
  const isSingle = currentConversation?.conversationType === SessionType.Single;

  const hasGroupAnnouncement =
    currentConversation?.groupAtType === GroupAtType.AtGroupNotice;

  return (
    <Layout.Header className="relative border-b border-b-[var(--gap-text)] !bg-white !px-3">
      <div className="flex h-full items-center justify-between leading-none">
        <div className="flex items-center">
          <OIMAvatar
            src={currentConversation?.faceURL}
            text={currentConversation?.showName}
            isgroup={Boolean(currentConversation?.groupID)}
            isnotification={isNotification}
          />
          <div className="ml-3 flex h-10.5 flex-col justify-between">
            <div className="text-base font-semibold">
              {currentConversation?.showName}
            </div>
            {isSingle ? (
              <OnlineOrTypingStatus userID={currentConversation?.userID} />
            ) : (
              <div className="flex items-center text-xs text-[var(--sub-text)]">
                <img width={20} src={group_member} alt="member" />
                <span>{currentGroupInfo?.memberCount}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mr-5 flex">
          {menuList.map((menu) => {
            if (
              (menu.idx === 0 || menu.idx === 4) &&
              (isSingle || (!inGroup && !isSingle))
            ) {
              return null;
            }
            if (menu.idx === 3 && !isSingle) {
              return null;
            }

            return (
              <Tooltip title={menu.title} key={menu.idx}>
                <img
                  className="ml-5 cursor-pointer"
                  width={20}
                  src={menu.icon}
                  alt=""
                  onClick={() => menuClick(menu.idx)}
                />
              </Tooltip>
            );
          })}
        </div>
      </div>
      {hasGroupAnnouncement && (
        <GroupAnnouncementCard
          currentGroupInfo={currentGroupInfo}
          conversationID={currentConversation?.conversationID}
        />
      )}
      <SingleSetting ref={singleSettingRef} />
      <GroupSetting ref={groupSettingRef} />
      <SearchMessageDrawer ref={searchMessageRef} />
      <GroupAnnouncementDrawer ref={groupAnnouncementRef} />
    </Layout.Header>
  );
};

export default memo(ChatHeader);

const OnlineOrTypingStatus = ({ userID }: { userID: string }) => {
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(false);
  const timer = useRef<NodeJS.Timer | number | null>(null);

  useEffect(() => {
    const userStatusChangeHandler = ({ data }: WSEvent<UserOnlineState>) => {
      if (data.userID === userID) {
        setOnline(data.status === OnlineState.Online);
      }
    };
    IMSDK.on(CbEvents.OnUserStatusChanged, userStatusChangeHandler);
    IMSDK.subscribeUsersStatus([userID]).then(({ data }) =>
      setOnline(data[0].status === OnlineState.Online),
    );
    return () => {
      IMSDK.off(CbEvents.OnUserStatusChanged, userStatusChangeHandler);
      IMSDK.unsubscribeUsersStatus([userID]);
    };
  }, [userID]);

  useEffect(() => {
    const typingHandler = () => {
      setTyping(true);
      timer.current = setTimeout(() => {
        if (timer.current) {
          clearTimeout(timer.current as number);
        }
        setTyping(false);
      }, 1000);
    };
    emitter.on("TYPING_UPDATE", typingHandler);
    return () => {
      if (timer.current) {
        clearTimeout(timer.current as number);
      }
      emitter.off("TYPING_UPDATE", typingHandler);
    };
  }, []);

  return (
    <div className="flex items-center">
      {typing ? (
        <p className="text-xs text-[var(--sub-text)]">
          正在输入 <span className={styles["dot-1"]}>.</span>
          <span className={styles["dot-2"]}>.</span>
          <span className={styles["dot-3"]}>.</span>
        </p>
      ) : (
        <>
          <i
            className={clsx(
              "mr-1.5 inline-block h-[6px] w-[6px] rounded-full bg-[#2ddd73]",
              {
                "bg-[#999]": !online,
              },
            )}
          />
          <span className="text-xs text-[var(--sub-text)]">
            {online ? "在线" : "离线"}
          </span>
        </>
      )}
    </div>
  );
};
