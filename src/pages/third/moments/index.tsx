import { useEffect, useState } from "react";

import { Moments as MomentsPage } from "@/pages/common/MomentsModal/MomentsBox";
import VideoPlayerModal from "@/pages/common/VideoPlayerModal";
import emitter from "@/utils/events";

export const Moments = () => {
  const [videoUrl, setVideoUrl] = useState("");

  useEffect(() => {
    const videoPlayerHandler = (url: string) => {
      setVideoUrl(url);
    };
    emitter.on("OPEN_VIDEO_PLAYER", videoPlayerHandler);
    return () => {
      emitter.off("OPEN_VIDEO_PLAYER", videoPlayerHandler);
    };
  });

  return (
    <>
      {Boolean(videoUrl) && (
        <VideoPlayerModal url={videoUrl} closeOverlay={() => setVideoUrl("")} />
      )}
      <MomentsPage />
    </>
  );
};
