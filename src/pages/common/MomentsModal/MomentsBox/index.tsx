import { LeftOutlined } from "@ant-design/icons";
import { useLatest, useThrottleFn } from "ahooks";
import { Col, Row, Spin } from "antd";
import clsx from "clsx";
import { FC, useCallback, useEffect, useRef, useState } from "react";

import {
  useDeleteMoments,
  useMoment,
  useSelfMoments,
  useUserMoments,
} from "@/api/moments";
import background from "@/assets/images/moments/background.png";
import { IMSDK } from "@/layout/MainContentWrap";
import { useUserStore } from "@/store";
import { Comments, WorkMoments } from "@/types/moment";
import { CbEvents } from "@/utils/open-im-sdk-wasm/constant";
import { WSEvent } from "@/utils/open-im-sdk-wasm/types/entity";

import Header from "./Header";
import styles from "./index.module.scss";
import MomentsItem from "./MomentsItem";
import PublishModal from "./PublishModal";
import SelfContent from "./SelfContent";
import UserContent from "./UserContent";

// -1隐藏发布框 0图文 1视频
export type PublishType = -1 | 0 | 1;

export type UserInfo = {
  userID: string;
  nickname: string;
  faceURL: string;
};

type MomentProps = {
  onCancel?: () => void;
};

export const Moments: FC<MomentProps> = ({ onCancel }) => {
  const mainEl = useRef<HTMLDivElement>(null);
  const headerRef = useRef<{ showMessageList: () => void }>(null);
  const [publishType, setPublishType] = useState<PublishType>(-1);
  // firedns
  const [userInfo, setUserInfo] = useState<UserInfo>({
    userID: "",
    nickname: "",
    faceURL: "",
  });
  // detail
  const [workMomentID, setWorkMomentID] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [discoverMoments, setDiscoverMoments] = useState<WorkMoments[]>([]);
  const latestDiscoverMoments = useLatest(discoverMoments);
  const workMomentsUnreadCount = useUserStore((state) => state.workMomentsUnreadCount);

  const { mutate: deleteMoments } = useDeleteMoments();

  const { data: moment } = useMoment(workMomentID);
  const {
    isFetching,
    fetchNextPage,
    refetch: refetchSelfMoment,
  } = useSelfMoments({
    onSuccess: (data) => {
      setHasMore(data.length % 10 === 0);
      setDiscoverMoments(data);
    },
  });
  const {
    isFetching: isUserFetching,
    fetchNextPage: fetchNexUsertPage,
    refetch: refetchUserMoment,
  } = useUserMoments({
    userID: userInfo.userID,
    onSuccess: (data) => {
      setHasMore(data.length % 10 === 0);
      setDiscoverMoments(data);
    },
  });

  useEffect(() => {
    const customMessageHandler = ({
      data: { key, data },
    }: WSEvent<{ key: string; data: string }>) => {
      if (key.includes("wm_")) {
        const moments = JSON.parse(data).body as WorkMoments;
        const tempArr = [...latestDiscoverMoments.current].map((item) => {
          if (item.workMomentID === moments.workMomentID) {
            if (key === "wm_delete_comment") {
              moments.comments = item.comments?.filter(
                (comment) =>
                  comment.commentID !== (moments as unknown as Comments).commentID,
              );
            }
            item = { ...item, ...moments };
          }
          return item;
        });
        setDiscoverMoments(tempArr);
      }
    };
    IMSDK.on(CbEvents.OnRecvCustomBusinessMessage, customMessageHandler);
    return () => {
      IMSDK.off(CbEvents.OnRecvCustomBusinessMessage, customMessageHandler);
    };
  }, []);

  const { run: scroll } = useThrottleFn(
    () => {
      if (mainEl.current && hasMore) {
        const { clientHeight, scrollTop, scrollHeight } = mainEl.current;
        if (scrollTop + clientHeight >= scrollHeight - 50) {
          console.log("web到底");
          if (userInfo.userID !== "") {
            fetchNexUsertPage();
          } else {
            fetchNextPage();
          }
        }
      }
    },
    { wait: 500 },
  );

  const init = () => {
    if (userInfo.userID) {
      refetchUserMoment();
      return;
    }

    refetchSelfMoment();
  };

  const showMessageList = () => {
    headerRef.current?.showMessageList();
  };

  const deleteOneMoments = useCallback((workMomentID: string) => {
    deleteMoments(workMomentID);
    const tempArr = [...latestDiscoverMoments.current].filter(
      (item) => item.workMomentID !== workMomentID,
    );
    setDiscoverMoments(tempArr);
  }, []);

  if (workMomentID && moment) {
    return (
      <div
        className="flex flex-col bg-white drop-shadow-md"
        style={{
          minHeight: "80vh",
        }}
      >
        <Row className="h-12 px-5" justify="space-between" align="middle">
          <Col span={9}>
            <LeftOutlined
              className="cursor-pointer"
              onClick={() => setWorkMomentID("")}
            />
          </Col>
          <Col span={6} className={`${styles["title-bar"]} text-center`}>
            <span className="text-center text-black">详情</span>
          </Col>
          <Col span={9} className=" text-right"></Col>
        </Row>
        <div className="no-scrollbar ignore-drag box-content overflow-scroll px-5 py-4">
          <MomentsItem
            {...moment?.data.workMoment}
            deleteOneMoments={(workMomentID) => {
              deleteOneMoments(workMomentID);
              setWorkMomentID("");
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Header
        ref={headerRef}
        setPublishType={setPublishType}
        init={init}
        isUser={userInfo.userID !== ""}
        setUser={() =>
          setUserInfo({
            userID: "",
            nickname: "",
            faceURL: "",
          })
        }
        onCancel={onCancel}
      />
      <div
        className={clsx(
          "no-scrollbar ignore-drag box-content flex-1 overflow-scroll bg-white drop-shadow-md",
          styles.modal,
          {
            "h-[72vh] max-h-[80vh]": true,
          },
        )}
        onScroll={scroll}
        ref={mainEl}
      >
        <Spin spinning={isFetching || isUserFetching}>
          <PublishModal publishType={publishType} setPublishType={setPublishType} />
          <div className={styles.main}>
            <img src={background} alt="background" className="absolute top-[-40px]" />
            <div className={styles.content}>
              {userInfo.userID === "" && (
                <SelfContent
                  unread={workMomentsUnreadCount}
                  items={discoverMoments}
                  setUserInfo={setUserInfo}
                  showMessageList={showMessageList}
                  deleteOneMoments={deleteOneMoments}
                />
              )}
              {userInfo.userID !== "" && (
                <UserContent
                  userItems={discoverMoments}
                  setWorkMomentID={setWorkMomentID}
                />
              )}
              <div className="h-4"></div>
            </div>
          </div>
        </Spin>
      </div>
    </div>
  );
};
