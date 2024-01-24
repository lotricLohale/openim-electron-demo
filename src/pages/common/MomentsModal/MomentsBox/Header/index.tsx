import {
  FileImageOutlined,
  LeftOutlined,
  VideoCameraAddOutlined,
} from "@ant-design/icons";
import { Badge, Col, Divider, Image, Popover, Row } from "antd";
import dayjs from "dayjs";
import {
  forwardRef,
  ForwardRefRenderFunction,
  memo,
  useImperativeHandle,
  useState,
} from "react";
import { v4 as uuidV4 } from "uuid";

import { MomentsClearType, useClearUnread, useLogs } from "@/api/moments";
import background from "@/assets/images/moments/background.png";
import liked from "@/assets/images/moments/liked.png";
import top_close from "@/assets/images/moments/top_close.png";
import top_message from "@/assets/images/moments/top_message.png";
import top_publish from "@/assets/images/moments/top_publish.png";
import top_refresh from "@/assets/images/moments/top_refresh.png";
import OIMAvatar from "@/components/OIMAvatar";
import { WorkMomentLogType } from "@/constants";
import { useUserStore } from "@/store";
import { formatMessageTime } from "@/utils/imCommon";

import type { PublishType } from "../index";
import styles from "./index.module.scss";

interface HeaderProps {
  init: () => void;
  isUser: boolean;
  setUser: () => void;
  onCancel?: () => void;
  setPublishType: (type: PublishType) => void;
}

const Header: ForwardRefRenderFunction<{ showMessageList: () => void }, HeaderProps> = (
  props,
  ref,
) => {
  const { setPublishType, isUser, setUser } = props;
  const [messageListVisble, setMessageListVisble] = useState(false);
  const { data, refetch } = useLogs();
  const { mutate: clearUnread } = useClearUnread();
  const workMomentsUnreadCount = useUserStore((state) => state.workMomentsUnreadCount);
  const updateWorkMomentsUnreadCount = useUserStore(
    (state) => state.updateWorkMomentsUnreadCount,
  );

  const items = data?.pages.flatMap((page) =>
    (page.data?.workMoments ?? []).map((item) => {
      if (!item.uuid) item.uuid = uuidV4();
      return item;
    }),
  );

  const refetchAll = () => {
    props.init();
  };

  const Publish = () => (
    <div className="px-2 py-1">
      <div
        className="cursor-pointer border-b border-b-gray-200 p-2"
        onClick={() => setPublishType(0)}
      >
        <FileImageOutlined />
        <span className=" ml-1.5">发布图文</span>
      </div>
      <div className="cursor-pointer p-2" onClick={() => setPublishType(1)}>
        <VideoCameraAddOutlined />
        <span className=" ml-1.5">发布视频</span>
      </div>
    </div>
  );

  const MessageItemList = () => {
    return (
      <div className="mt-2 flex-1 overflow-y-auto">
        {items?.map((item) => (
          <div className=" flex h-24 justify-between px-4 py-2" key={item.uuid}>
            <div className="flex flex-row">
              {item.type === WorkMomentLogType.Like && (
                <>
                  <OIMAvatar
                    src={item.likeUsers?.[0].faceURL}
                    text={item.likeUsers?.[0].nickname}
                  />
                  <div className="pl-3">
                    <div style={{ color: "#6085B1" }}>
                      {item.likeUsers?.[0].nickname}
                    </div>
                    <p className="mb-2 break-words break-all">{item.content.text}</p>
                    <p className="break-words break-all text-xs text-gray-400">
                      <img
                        width={12}
                        src={liked}
                        className="mb-1 mr-1 inline-block"
                        alt=""
                      />
                      <span>为你点了赞</span>
                    </p>
                  </div>
                </>
              )}
              {item.type === WorkMomentLogType.At && (
                <>
                  <OIMAvatar src={item.faceURL} text={item.nickname} />
                  <div className="pl-3">
                    <div style={{ color: "#6085B1" }}>{item.nickname}</div>
                    <p className="mb-2 break-words break-all">{item.content.text}</p>
                    <p className="break-words break-all text-xs text-gray-400">
                      提到了你
                    </p>
                  </div>
                </>
              )}
              {item.type === WorkMomentLogType.Commit && (
                <>
                  <OIMAvatar
                    src={item.comments?.[0].faceURL}
                    text={item.comments?.[0].nickname}
                  />
                  <div className="pl-3">
                    <div style={{ color: "#6085B1" }}>
                      {item.comments?.[0].nickname}
                    </div>
                    <p className="mb-2 break-words break-all">
                      评论了你：{item.comments?.[0]?.content}
                    </p>
                    <p className="break-words break-all text-xs text-gray-400">
                      {formatMessageTime(item.comments?.[0].createTime ?? 0)}
                    </p>
                  </div>
                </>
              )}
            </div>
            {item.content.metas?.[0]?.thumb && (
              <Image
                width={62}
                height={62}
                src={item.content.metas[0].thumb}
                preview={false}
              />
            )}
          </div>
        ))}
        <Divider className="border-1 bottom-12 !m-0 border-[var(--sub-text)] bg-[#F4F5F7] px-16 py-2 !text-xs !text-[var(--sub-text)]">
          没有更多消息了
        </Divider>
      </div>
    );
  };

  const Message = () => {
    return (
      <div className="flex h-[420px] w-[300px] flex-col">
        <div className="relative flex h-10 items-center justify-center border-b border-b-gray-200">
          <span className="text-sm">消息</span>
          {Boolean(items?.length) && (
            <span
              className="absolute right-3 cursor-pointer"
              onClick={() => {
                clearUnread(MomentsClearType.All, {
                  onSuccess: () => refetch(),
                });
                updateWorkMomentsUnreadCount();
              }}
            >
              清空
            </span>
          )}
        </div>
        <MessageItemList />
      </div>
    );
  };

  const close = () => {
    // if (window.electronAPI) {
    //   window.electronAPI.ipcInvoke("closeWindow", "moments");
    // } else {
    props.onCancel?.();
    // }
  };

  const showMessageList = () => {
    if (workMomentsUnreadCount > 0) {
      refetch();
      clearUnread(MomentsClearType.Count);
    }
    updateWorkMomentsUnreadCount();
    setMessageListVisble(true);
  };

  useImperativeHandle(ref, () => ({
    showMessageList,
  }));

  return (
    <div className="relative overflow-hidden">
      <img src={background} alt="background" className="absolute" />
      <Row className="h-10 px-4 leading-10">
        <Col span={9} className="flex items-center">
          <img
            src={top_close}
            width={12}
            className="cursor-pointer"
            alt=""
            onClick={close}
          />
          {isUser && (
            <LeftOutlined
              className="ml-2 cursor-pointer text-white"
              onClick={() => setUser()}
            />
          )}
        </Col>
        <Col span={6} className={`${styles["title-bar"]} text-center`}>
          <span className="text-center text-white">朋友圈</span>
        </Col>
        <Col span={9} className="ignore-drag text-right">
          <div className="flex h-full items-center justify-end">
            <img
              src={top_refresh}
              width={23}
              className="ml-3 cursor-pointer"
              alt=""
              onClick={refetchAll}
            />
            <Popover
              placement="bottomRight"
              arrow={false}
              content={Message}
              open={messageListVisble}
              onOpenChange={(vis) => {
                if (vis) {
                  showMessageList();
                  return;
                }
                setMessageListVisble(vis);
              }}
              trigger="click"
            >
              <Badge size="small" dot={workMomentsUnreadCount > 0}>
                <img
                  src={top_message}
                  width={20}
                  className="ml-3 cursor-pointer"
                  alt=""
                />
              </Badge>
            </Popover>
            <Popover
              placement="bottomRight"
              arrow={false}
              content={Publish}
              trigger="hover"
            >
              <img
                src={top_publish}
                width={20}
                className="ml-3 cursor-pointer"
                alt=""
              />
            </Popover>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default memo(forwardRef(Header));
