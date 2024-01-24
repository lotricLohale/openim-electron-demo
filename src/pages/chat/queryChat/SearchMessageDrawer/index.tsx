import { Drawer, Tabs, TabsProps } from "antd";
import { forwardRef, ForwardRefRenderFunction, memo, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";

import FileMessagePane from "./FileMessagePane";
import MediaMessagePane from "./MediaMessagePane";
import NomalMessagePane from "./NomalMessagePane";

const SearchMessageDrawer: ForwardRefRenderFunction<OverlayVisibleHandle, unknown> = (
  _,
  ref,
) => {
  const { conversationID } = useParams();
  const [activeTab, setActiveTab] = useState("0");

  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);

  useEffect(() => {
    if (!isOverlayOpen) {
      setActiveTab("0");
    }
  }, [isOverlayOpen]);

  const items: TabsProps["items"] = [
    {
      key: "0",
      label: `消息`,
      children: (
        <NomalMessagePane
          conversationID={conversationID}
          isOverlayOpen={isOverlayOpen}
        />
      ),
    },
    {
      key: "1",
      label: `图片`,
      children: (
        <MediaMessagePane
          tabKey="1"
          activeTab={activeTab}
          conversationID={conversationID}
        />
      ),
    },
    {
      key: "2",
      label: `视频`,
      children: (
        <MediaMessagePane
          isVideo
          tabKey="2"
          activeTab={activeTab}
          conversationID={conversationID}
        />
      ),
    },
    {
      key: "3",
      label: `文件`,
      children: (
        <FileMessagePane
          tabKey="3"
          activeTab={activeTab}
          conversationID={conversationID}
        />
      ),
    },
  ];

  const onTabChange = (key: string) => {
    setActiveTab(key);
  };

  return (
    <Drawer
      title={"聊天记录"}
      placement="right"
      rootClassName="chat-drawer"
      onClose={closeOverlay}
      open={isOverlayOpen}
      maskClassName="opacity-0"
      maskMotion={{
        visible: false,
      }}
      width={450}
      getContainer={"#chat-container"}
    >
      <Tabs
        activeKey={activeTab}
        className="message-drawer-tab"
        items={items}
        onChange={onTabChange}
      />
    </Drawer>
  );
};

export default memo(forwardRef(SearchMessageDrawer));
