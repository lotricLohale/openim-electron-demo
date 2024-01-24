import { FC } from "react";

import { WorkMoments } from "@/types/moment";

import { UserInfo } from "../index";
import MomentsItem from "../MomentsItem";

type SelfContentProps = {
  unread: number;
  items: WorkMoments[];
  setUserInfo: (userInfo: UserInfo) => void;
  showMessageList: () => void;
  deleteOneMoments: (workMomentID: string) => void;
};

const SelfContent: FC<SelfContentProps> = ({
  unread,
  items,
  setUserInfo,
  showMessageList,
  deleteOneMoments,
}) => {
  return (
    <>
      {unread > 0 && (
        <div className="mb-4 flex items-center justify-center">
          <span
            className="cursor-pointer rounded-md bg-slate-200 px-4 py-1 text-white"
            style={{ background: "#B6BBC2" }}
            onClick={showMessageList}
          >
            {unread}条新消息
          </span>
        </div>
      )}

      {(items || []).map((item) => (
        <MomentsItem
          {...item}
          key={item.workMomentID}
          setUserInfo={setUserInfo}
          deleteOneMoments={deleteOneMoments}
        />
      ))}

      {(items || []).length <= 0 && (
        <div className="flex h-80 w-full items-center justify-center text-base">
          暂无动态
        </div>
      )}
    </>
  );
};

export default SelfContent;
