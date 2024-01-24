import { SearchOutlined } from "@ant-design/icons";
import { Input, Tabs, TabsProps } from "antd";
import { useState } from "react";

import Contacts from "./tabs/Contacts";
import Dashboard from "./tabs/Dashboard";
import File from "./tabs/File";
import Group from "./tabs/Group";
import Message from "./tabs/Message";

const SearchBox = () => {
  const [keyword, setKeyword] = useState("");
  const [activeKey, setActiveKey] = useState("0");
  const [conversationID, setConversationID] = useState("");

  const items: TabsProps["items"] = [
    {
      key: "0",
      label: `综合`,
      children: (
        <Dashboard
          keyword={keyword}
          setActiveKey={setActiveKey}
          setConversationID={setConversationID}
        />
      ),
    },
    {
      key: "1",
      label: `联系人`,
      children: <Contacts keyword={keyword} />,
    },
    {
      key: "2",
      label: `群组`,
      children: <Group keyword={keyword} />,
    },
    {
      key: "3",
      label: `聊天记录`,
      children: <Message keyword={keyword} conversationID={conversationID} />,
    },
    {
      key: "4",
      label: `文档`,
      children: <File keyword={keyword} />,
    },
  ];

  return (
    <div className="flex h-[80vh] flex-col overflow-x-hidden py-5">
      <div className="px-8">
        <Input
          prefix={<SearchOutlined rev={undefined} />}
          placeholder="搜索"
          onPressEnter={(e) => setKeyword((e.target as HTMLInputElement).value)}
          onChange={(e) => {
            if ((e.target as HTMLInputElement).value === "") {
              setKeyword("");
            }
          }}
        />
      </div>

      <Tabs
        activeKey={activeKey}
        className="message-drawer-tab overflow-hidden"
        items={items}
        onChange={(e) => setActiveKey(e)}
      />
    </div>
  );
};

export default SearchBox;
