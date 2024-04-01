// @ts-nocheck
import { Modal } from "antd";
import { FC, useEffect } from "react";
import Player from "xgplayer/dist/core_player";
import play from "xgplayer/dist/controls/play";
import fullscreen from "xgplayer/dist/controls/fullscreen";
import progress from "xgplayer/dist/controls/progress";
import volume from "xgplayer/dist/controls/volume";
import pip from "xgplayer/dist/controls/pip";
import flex from "xgplayer/dist/controls/flex";
import enter from "xgplayer/dist/controls/enter";
import loading from "xgplayer/dist/controls/loading";
import memoryPlay from "xgplayer/dist/controls/memoryPlay";
import replay from "xgplayer/dist/controls/replay";
import playbackRate from "xgplayer/dist/controls/playbackRate";

type PlayVideoModalProps = {
  isModalVisible: boolean;
  url: string;
  close: () => void;
};

const PlayVideoModal: FC<PlayVideoModalProps> = ({ isModalVisible, url, close }) => {
  useEffect(() => {
    let player = new Player({
      id: "video_player",
      url,
      controlPlugins: [play, fullscreen, progress, volume, pip, flex, enter, loading, memoryPlay, replay, playbackRate],
      pip: true,
      fluid: true,
      // autoplay: true,
      videoInit: true,
      lang: "zh-cn",
      playbackRate: [0.5, 0.75, 1, 1.5, 2],
    });
  }, []);

  return (
    <Modal className="player_modal" width="80vw" bodyStyle={{ padding: 0 }} centered title={null} footer={null} visible={isModalVisible} onCancel={close}>
      <div id="video_player"></div>
    </Modal>
  );
};

export default PlayVideoModal;
