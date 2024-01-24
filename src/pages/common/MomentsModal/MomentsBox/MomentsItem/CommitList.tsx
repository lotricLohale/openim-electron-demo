import { Tooltip } from "antd";

import { BusinessUserInfo } from "@/api/login";
import { useDeleteComment } from "@/api/moments";
import { Comments } from "@/types/moment";

import styles from "./index.module.scss";

type CommitProps = {
  workMomentID: string;
  comments: Comments[];
  setCommitData: ({
    replyUserID,
    replyUserName,
    workMomentID,
  }: {
    replyUserID: string;
    replyUserName: string;
    workMomentID: string;
  }) => void;
  ownerUserID: string;
  selfInfo: BusinessUserInfo;
};

const CommitList = ({
  comments,
  ownerUserID,
  selfInfo,
  workMomentID,
  setCommitData,
}: CommitProps) => {
  const { mutate: deleteCommit } = useDeleteComment();

  function renderComment(comment: Comments) {
    return (
      <div
        className={`cursor-pointer px-2 leading-7 ${styles.commit}`}
        onClick={() => {
          setCommitData({
            workMomentID,
            replyUserID: comment.userID,
            replyUserName: comment.nickname,
          });
        }}
      >
        {comment.replyUserID === "" ? (
          <>
            <span className="text-blue-400">{comment.nickname}</span>
            <span>：{comment.content}</span>
          </>
        ) : (
          <>
            <span className="text-blue-400">{comment.nickname}</span>
            <span className="mx-1">回复</span>
            <span className="text-blue-400">{comment.replyNickname}</span>
            <span>：{comment.content}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div>
        {comments.map((comment) => {
          const isOwnerOrSelf =
            selfInfo.userID === ownerUserID || selfInfo.userID === comment.userID;
          return (
            <div key={comment.commentID}>
              {isOwnerOrSelf && (
                <Tooltip
                  title={
                    <span
                      className="cursor-pointer"
                      onClick={() =>
                        deleteCommit({ workMomentID, commentID: comment.commentID })
                      }
                    >
                      删除
                    </span>
                  }
                  arrow={false}
                  key={comment.commentID}
                >
                  {renderComment(comment)}
                </Tooltip>
              )}
              {!isOwnerOrSelf && renderComment(comment)}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default CommitList;
