import { useQuery } from "react-query";

import my_groups from "@/assets/images/contact/my_groups.png";
import { useConversationToggle } from "@/hooks/useConversationToggle";
import { IMSDK } from "@/layout/MainContentWrap";
import emitter from "@/utils/events";
import { SessionType } from "@/utils/open-im-sdk-wasm/types/enum";

import Empty from "../Empty";
import NavLink from "../NavLink";
import SearchItem from "../SearchItem";

type GroupInfo = {
  groupID: string;
  groupName: string;
  faceURL: string;
};

type GroupProps = {
  keyword: string;
  cutting?: boolean;
  setActiveKey?: (id: string) => void;
};

const Group = ({ keyword, cutting, setActiveKey }: GroupProps) => {
  const { toSpecifiedConversation } = useConversationToggle();

  const { data } = useQuery<{ data: GroupInfo[] }>(
    [keyword, "group"],
    () =>
      IMSDK.searchGroups({
        keywordList: [keyword],
        isSearchGroupID: true,
        isSearchGroupName: true,
      }),
    {
      enabled: keyword !== "",
    },
  );

  if (cutting) {
    if (!data?.data.length) {
      return null;
    }
    return (
      <div>
        <NavLink
          title="我的群组"
          hasMore={data?.data.length > 2}
          callback={() => setActiveKey?.("2")}
        />
        {(data?.data || []).map((group, index) => {
          if (index < 2) {
            return (
              <SearchItem
                logo={group.faceURL || my_groups}
                key={group.groupID}
                desc={group.groupName}
                callback={() => {
                  toSpecifiedConversation({
                    sourceID: group.groupID,
                    sessionType: SessionType.WorkingGroup,
                  }).then(() => emitter.emit("CLOSE_SEARCH_MODAL"));
                }}
              />
            );
          }
        })}
      </div>
    );
  }

  if (!data?.data.length) {
    return <Empty />;
  }

  return (
    <div className="mt-1 flex h-full flex-col">
      <div className="flex-1">
        {data?.data.map((group) => {
          return (
            <SearchItem
              logo={group.faceURL || my_groups}
              key={group.groupID}
              desc={group.groupName}
              callback={() => {
                toSpecifiedConversation({
                  sourceID: group.groupID,
                  sessionType: SessionType.WorkingGroup,
                }).then(() => emitter.emit("CLOSE_SEARCH_MODAL"));
              }}
            />
          );
        })}
      </div>

      <div className=" text-center text-sm text-gray-400">已展示全部结果</div>
    </div>
  );
};

export default Group;
