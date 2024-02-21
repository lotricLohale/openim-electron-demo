import { FC, memo, ReactNode, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { throttle } from "throttle-debounce";
import { Loading } from "../Loading";
import styles from "./index.module.less";

type ScrollViewProps = {
  data: any[];
  fetchMoreData: () => void;
  hasMore: boolean;
  loading: boolean;
  height?: number;
  holdHeight?: number;
  reverse?: boolean;
  tip?: JSX.Element | null;
  children: ReactNode;
};

const ScrollView: FC<ScrollViewProps> = ({ data, fetchMoreData, hasMore, children, loading, height, holdHeight, tip, reverse = true }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // const onScroll = async (e: any) => {
  //   const loadThreshold = reverse ? 0 - e.target.scrollHeight + e.target.offsetHeight + (holdHeight ?? 30) : holdHeight ?? 30;
  //   if (e.target.scrollTop < loadThreshold && e.target.scrollTop !== 0) {
  //     if (loading || !hasMore) return;

  //     requestAnimationFrame(fetchMoreData);
  //   }
  // };

  const onScroll = async (e: any) => {
    if (!reverse) {
      const loadThreshold = e.target.scrollHeight - e.target.offsetHeight - (holdHeight ?? 30);
      if (e.target.scrollTop > loadThreshold && e.target.scrollTop !== e.target.scrollHeight) {
        if (loading || !hasMore) return;
        requestAnimationFrame(fetchMoreData);
      }
    } else {
      const loadThreshold = 0 - e.target.scrollHeight + e.target.offsetHeight + (holdHeight ?? 30);
      if (e.target.scrollTop < loadThreshold && e.target.scrollTop !== 0) {
        if (loading || !hasMore) return;

        requestAnimationFrame(fetchMoreData);
      }
    }
  };

  const throttleScroll = throttle(250, onScroll);

  const LoadingAndTip = () =>
    useMemo(
      () =>
        hasMore && loading ? (
          <Loading style={{ backgroundColor: "transparent" }} size={data.length === 0 ? "large" : "small"} height={data.length === 0 ? `${height}px` ?? "600px" : "60px"} />
        ) : tip === undefined ? (
          <div className={styles.con_nomore}>{t("NoMore")}</div>
        ) : (
          tip
        ),
      [hasMore, loading, data.length, height]
    );

  return (
    <div
      ref={scrollRef}
      onScroll={throttleScroll}
      id="scr_container"
      style={{ height: height ?? "100%", flexDirection: reverse ? "column-reverse" : "column" }}
      className={styles.con}
    >
      {/* {!reverse && <LoadingAndTip />} */}
      {children}
      <LoadingAndTip />
    </div>
  );
};

export default memo(ScrollView);
