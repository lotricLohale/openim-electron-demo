import { useQuery } from "react-query";

import { searchBusinessUserInfo } from "@/api/login";
import { useConversationToggle } from "@/hooks/useConversationToggle";
import { getDefaultAvatar } from "@/utils/avatar";
import emitter from "@/utils/events";
import { SessionType } from "@/utils/open-im-sdk-wasm/types/enum";

import Empty from "../Empty";
import NavLink from "../NavLink";
import SearchItem from "../SearchItem";

type ContactsProps = {
  keyword: string;
  cutting?: boolean;
  setActiveKey?: (id: string) => void;
};

const Contacts = ({ keyword, cutting, setActiveKey }: ContactsProps) => {
  const { toSpecifiedConversation } = useConversationToggle();

  const { data } = useQuery(
    [keyword, "contacts"],
    () => searchBusinessUserInfo(keyword),
    {
      enabled: keyword !== "",
    },
  );
  const searchResult = data?.data.users ?? [];
  if (cutting) {
    if (!searchResult.length) {
      return null;
    }
    return (
      <div>
        <NavLink
          title="联系人"
          hasMore={searchResult.length > 2}
          callback={() => setActiveKey?.("1")}
        />
        {searchResult.map((friend, index) => {
          if (index < 2) {
            return (
              <SearchItem
                logo={getDefaultAvatar(friend.faceURL) || friend.faceURL}
                key={friend.userID}
                desc={friend.nickname}
                callback={() => {
                  toSpecifiedConversation({
                    sourceID: friend.userID,
                    sessionType: SessionType.Single,
                  }).then(() => emitter.emit("CLOSE_SEARCH_MODAL"));
                }}
              />
            );
          }
        })}
      </div>
    );
  }

  if (!searchResult.length) {
    return <Empty />;
  }

  return (
    <div className="mt-1 flex h-full flex-col">
      <div className="flex-1">
        {searchResult.map((friend) => (
          <SearchItem
            logo={getDefaultAvatar(friend.faceURL) || friend.faceURL}
            key={friend.userID}
            desc={friend.nickname}
            callback={() => {
              toSpecifiedConversation({
                sourceID: friend.userID,
                sessionType: SessionType.Single,
              }).then(() => emitter.emit("CLOSE_SEARCH_MODAL"));
            }}
          />
        ))}
      </div>

      <div className="text-center text-sm text-gray-400">已展示全部结果</div>
    </div>
  );
};

export default Contacts;
