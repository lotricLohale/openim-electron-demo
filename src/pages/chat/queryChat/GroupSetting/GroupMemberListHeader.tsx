import { LeftOutlined, SearchOutlined } from "@ant-design/icons";
import { Input } from "antd";
import { t } from "i18next";
import { memo, useState } from "react";

import invite_header from "@/assets/images/chatSetting/invite_header.png";
import search from "@/assets/images/chatSetting/search.png";

const GroupMemberListHeader = ({
  back2Settings,
  searchMemebers,
  updateSearching,
}: {
  back2Settings: () => void;
  searchMemebers: (keyword: string) => void;
  updateSearching: (val: boolean) => void;
}) => {
  const [searchState, setSearchState] = useState({
    keyword: "",
    visible: false,
  });

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <LeftOutlined
          className="mr-2 !text-[var(--base-black)]"
          rev={undefined}
          onClick={back2Settings}
        />
        <div>群成员列表</div>
      </div>
      {searchState.visible ? (
        <div className="mr-4 flex items-center transition-opacity">
          <Input
            className="w-36 rounded-2xl border-[var(--sub-text)] bg-[var(--gap-text)] px-2.5 py-[2px] text-sm font-normal"
            value={searchState.keyword}
            allowClear
            classNames={{ input: "bg-[var(--gap-text)]" }}
            onChange={(e) => {
              setSearchState((state) => ({ ...state, keyword: e.target.value }));
              if (!e.target.value) {
                updateSearching(false);
              }
            }}
            placeholder={t("placeholder.search")!}
            prefix={<SearchOutlined rev={undefined} />}
            onPressEnter={() => {
              if (!searchState.keyword) return;
              updateSearching(true);
              searchMemebers(searchState.keyword);
            }}
          />
          <span
            className="mx-3 cursor-pointer text-sm font-normal text-[var(--primary)]"
            onClick={() => {
              setSearchState({ visible: false, keyword: "" });
              updateSearching(false);
            }}
          >
            取消
          </span>
        </div>
      ) : (
        <div className="mr-4 flex items-center">
          <img className="mr-3 cursor-pointer" width={18} src={invite_header} alt="" />
          <img
            className="mr-3 cursor-pointer"
            width={18}
            src={search}
            onClick={() => setSearchState({ visible: true, keyword: "" })}
            alt=""
          />
        </div>
      )}
    </div>
  );
};

export default memo(GroupMemberListHeader);
