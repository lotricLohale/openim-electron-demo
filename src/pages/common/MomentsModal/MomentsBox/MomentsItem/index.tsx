import { MoreOutlined } from "@ant-design/icons";
import { useSetState } from "ahooks";
import type { InputRef } from "antd";
import { Button, Col, Image, Input, Row, Skeleton, Tooltip } from "antd";
import { useEffect, useRef, useState } from "react";

import { modal } from "@/AntdGlobalComp";
import { BusinessUserInfo } from "@/api/login";
import { useCreateComment, useDeleteMoments, useLikeMoments } from "@/api/moments";
import call_video from "@/assets/images/moments/call_video.png";
import item_assign from "@/assets/images/moments/item_assign.png";
import item_comment from "@/assets/images/moments/item_comment.png";
import item_like from "@/assets/images/moments/item_like.png";
import item_liked from "@/assets/images/moments/item_liked.png";
import item_private from "@/assets/images/moments/item_private.png";
import OIMAvatar from "@/components/OIMAvatar";
import { useUserStore } from "@/store";
import { WorkMoments } from "@/types/moment";
import emitter from "@/utils/events";
import { formatMessageTime } from "@/utils/imCommon";

import { UserInfo } from "../index";
import CommitList from "./CommitList";
import Like from "./Like";

const { TextArea } = Input;

type MomentsItemProps = WorkMoments & {
  setUserInfo?: (userInfo: UserInfo) => void;
  deleteOneMoments: (workMomentID: string) => void;
};

const MomentsItem = (props: MomentsItemProps) => {
  const {
    nickname,
    userID,
    content,
    createTime,
    atUsers,
    likeUsers,
    comments,
    workMomentID,
    permission,
    faceURL,
    setUserInfo,
    deleteOneMoments,
  } = props;
  const { mutate: likeMoments } = useLikeMoments();
  const { mutate: createCommit } = useCreateComment();

  const [selfInfo, setSelfInfo] = useState<BusinessUserInfo>(
    useUserStore((state) => state.selfInfo),
  );
  // useEffect(() => {
  //   if (window.electronAPI) {
  //     const str = window.location.href.split("selfInfo=")[1];
  //     const userInfo = JSON.parse(decodeURIComponent(str)) as BusinessUserInfo;
  //     setSelfInfo(userInfo);
  //   }
  // }, []);

  const inputRef = useRef<InputRef>(null);
  const [commitData, setCommitData] = useSetState({
    workMomentID: "",
    content: "",
    replyUserID: "",
    replyUserName: "",
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, [commitData.workMomentID]);

  const sendCommit = () => {
    createCommit(commitData);
    setCommitData({
      workMomentID: "",
      content: "",
      replyUserID: "",
    });
  };

  const tryRemove = () => {
    modal.confirm({
      title: "提示",
      content: "确认删除该条朋友圈吗？",
      onOk: () => {
        deleteOneMoments(workMomentID);
      },
    });
  };

  const isSelf = selfInfo?.userID === userID;

  const isLike = likeUsers?.some((e) => e.userID === selfInfo?.userID);

  return (
    <>
      <div className="mb-4 flex">
        {/* icon */}
        <OIMAvatar
          src={faceURL}
          text={nickname}
          isgroup={false}
          onClick={() => {
            setUserInfo?.({
              nickname,
              userID,
              faceURL,
            });
          }}
        />

        <div className="flex-1 pl-3">
          {/* content */}
          <div className="max-w-[200px] truncate text-blue-500">{nickname}</div>
          <div className="select-text break-words break-all">{content.text}</div>
          <div className="w-[300px]">
            <Row className={content.metas?.length ? "mt-2" : ""}>
              {((content.type === 1 && content?.metas) || []).map((e) => (
                <Col
                  span={8}
                  key={e.original}
                  style={{ width: "100px", height: "100px" }}
                >
                  <div
                    className="video-img cursor-pointer"
                    onClick={() => emitter.emit("OPEN_VIDEO_PLAYER", e.original)}
                  >
                    <Image
                      width={100}
                      height={100}
                      src={e.thumb}
                      className="object-cover p-0.5"
                      placeholder={<Skeleton.Image />}
                    />
                    <div className="video-image-mask">
                      <img src={call_video} alt="" width={40} />
                    </div>
                  </div>
                </Col>
              ))}
              <Image.PreviewGroup>
                {((content.type === 0 && content?.metas) || []).map((e) => (
                  <Col
                    span={8}
                    key={e.original || e.thumb}
                    style={{ width: "100px", height: "100px" }}
                  >
                    <Image
                      width={100}
                      height={100}
                      src={e.thumb || e.original}
                      className="object-cover p-0.5"
                      placeholder={<Skeleton.Image />}
                    />
                  </Col>
                ))}
              </Image.PreviewGroup>
            </Row>
          </div>

          {/* atUser */}
          {Boolean(atUsers?.length) && (
            <p className="mt-2 text-xs" style={{ color: "#8E9AB0" }}>
              提到了：
              {atUsers?.map((e, i) => (
                <span key={e.userID}>
                  {i === 0 ? "" : "、"}
                  {e.nickname}
                </span>
              ))}
            </p>
          )}

          {/* delete & like & commit */}
          <div className="mt-2 flex justify-between">
            <div className="flex items-center text-xs" style={{ color: "#8E9AB0" }}>
              <span>{formatMessageTime(createTime)}</span>
              {permission > 0 && (
                <span className="ml-2">
                  {permission > 1 ? (
                    <img width={15} src={item_assign} />
                  ) : (
                    <img width={9} src={item_private} />
                  )}
                </span>
              )}
              {isSelf && (
                <span className="ml-2 cursor-pointer text-blue-400" onClick={tryRemove}>
                  删除
                </span>
              )}
            </div>

            <Tooltip
              title={
                <div className="flex flex-row items-center justify-center">
                  <div
                    className="flex cursor-pointer items-center px-2 text-white"
                    onClick={() => likeMoments({ workMomentID, like: !isLike })}
                  >
                    <img src={isLike ? item_liked : item_like} width={16} alt="" />
                    <span className="px-1.5">{isLike ? "取消" : "点赞"}</span>
                  </div>
                  <div className="flex cursor-pointer items-center px-1 text-white">
                    <img src={item_comment} width={16} alt="" />
                    <span
                      className="px-1.5"
                      onClick={() => setCommitData({ workMomentID })}
                    >
                      评论
                    </span>
                  </div>
                </div>
              }
              placement="left"
              arrow={false}
              trigger={["hover"]}
            >
              <div style={{ transform: "rotate(90deg)", background: "#F4F5F7" }}>
                <MoreOutlined />
              </div>
            </Tooltip>
          </div>
          <Like likeUsers={likeUsers ?? []} />
          <CommitList
            workMomentID={workMomentID}
            comments={comments ?? []}
            setCommitData={setCommitData}
            ownerUserID={userID}
            selfInfo={selfInfo}
          />
          {(commitData.workMomentID === workMomentID ||
            commitData.replyUserID !== "") && (
            <div
              className="flex cursor-pointer flex-col items-end p-2 leading-7"
              style={{ background: "#f4f5f7" }}
            >
              <TextArea
                autoSize={{ minRows: 4, maxRows: 4 }}
                value={commitData.content}
                onChange={(e) => setCommitData({ content: e.target.value })}
                ref={inputRef}
                onBlur={() =>
                  setCommitData({
                    workMomentID: "",
                    content: "",
                    replyUserID: "",
                  })
                }
                placeholder={
                  commitData.replyUserID !== ""
                    ? `回复${commitData.replyUserName}`
                    : "评论"
                }
              />
              <Button
                className="mt-2 text-right"
                type="primary"
                onMouseDown={sendCommit}
              >
                发送
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MomentsItem;
