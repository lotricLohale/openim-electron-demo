import { useDeepCompareEffect } from "ahooks";
import { useCallback, useEffect } from "react";
import { Virtuoso } from "react-virtuoso";

import ApplicationItem, { AccessFunction } from "@/components/ApplicationItem";
import { IMSDK } from "@/layout/MainContentWrap";
import { useUserStore } from "@/store";
import { useContactStore } from "@/store/contact";
import { feedbackToast } from "@/utils/common";
import { calcApplicationBadge } from "@/utils/imCommon";
import { FriendApplicationItem } from "@/utils/open-im-sdk-wasm/types/entity";
import { ApplicationHandleResult } from "@/utils/open-im-sdk-wasm/types/enum";
import { setAccessedFriendApplication } from "@/utils/storage";

export const NewFriends = () => {
  const currentUserID = useUserStore((state) => state.selfInfo.userID);

  const recvFriendApplicationList = useContactStore(
    (state) => state.recvFriendApplicationList,
  );
  const sendFriendApplicationList = useContactStore(
    (state) => state.sendFriendApplicationList,
  );

  const friendApplicationList = sortArray(
    recvFriendApplicationList.concat(sendFriendApplicationList),
  );

  useDeepCompareEffect(() => {
    const accessedFriendApplications = [...recvFriendApplicationList]
      .filter(
        (application) =>
          application.handleResult === ApplicationHandleResult.Unprocessed,
      )
      .map((application) => `${application.fromUserID}_${application.createTime}`);
    setAccessedFriendApplication(accessedFriendApplications).then(calcApplicationBadge);
  }, [recvFriendApplicationList]);

  const onAccept = useCallback(async (application: FriendApplicationItem) => {
    try {
      await IMSDK.acceptFriendApplication({
        toUserID: application.fromUserID,
        handleMsg: "",
      });
    } catch (error) {
      feedbackToast({ error });
    }
  }, []);

  const onReject = useCallback(async (application: FriendApplicationItem) => {
    try {
      await IMSDK.refuseFriendApplication({
        toUserID: application.fromUserID,
        handleMsg: "",
      });
    } catch (error) {
      feedbackToast({ error });
    }
  }, []);

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <p className="m-5.5 text-base font-extrabold">新的好友</p>
      <div className="flex-1 pb-3">
        <Virtuoso
          className="h-full overflow-x-hidden"
          data={friendApplicationList}
          itemContent={(_, item) => (
            <ApplicationItem
              key={`${
                currentUserID === item.fromUserID ? item.toUserID : item.fromUserID
              }${item.createTime}`}
              source={item}
              currentUserID={currentUserID}
              onAccept={onAccept as AccessFunction}
              onReject={onReject as AccessFunction}
            />
          )}
        />
      </div>
    </div>
  );
};

const sortArray = (list: FriendApplicationItem[]) => {
  list.sort((a, b) => {
    if (a.handleResult === 0 && b.handleResult === 0) {
      return b.createTime - a.createTime;
    } else if (a.handleResult === 0) {
      return -1;
    } else if (b.handleResult === 0) {
      return 1;
    }
    return 0;
  });
  return list;
};
