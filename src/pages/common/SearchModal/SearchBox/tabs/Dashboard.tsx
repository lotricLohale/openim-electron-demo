import empty from "@/assets/images/searchModal/empty.png";

import Contacts from "./Contacts";
import File from "./File";
import Group from "./Group";
import Message from "./Message";

type DashboardProps = {
  keyword: string;
  setActiveKey: (id: string) => void;
  setConversationID: (id: string) => void;
};

const Dashboard = ({ keyword, setActiveKey, setConversationID }: DashboardProps) => {
  return (
    <div className="relative mt-2 h-full">
      <div className="absolute left-1/2 top-1/2 z-[1] flex -translate-x-1/2 -translate-y-1/2 transform flex-col items-center justify-center">
        <img src={empty} alt="empty" />
        <div className="text-[var(--sub-text)]">没有更多搜索结果</div>
      </div>

      <div className="relative z-[10] h-full overflow-scroll bg-white empty:h-0">
        <Contacts keyword={keyword} cutting setActiveKey={setActiveKey} />
        <Group keyword={keyword} cutting setActiveKey={setActiveKey} />
        <Message
          keyword={keyword}
          cutting
          setActiveKey={setActiveKey}
          setConversationID={setConversationID}
        />
        <File keyword={keyword} cutting setActiveKey={setActiveKey} />
      </div>
    </div>
  );
};

export default Dashboard;
