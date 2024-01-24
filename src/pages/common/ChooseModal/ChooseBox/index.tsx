import { SearchOutlined } from "@ant-design/icons";
import { useLatest, useRequest } from "ahooks";
import { Breadcrumb, Input, Spin } from "antd";
import { BreadcrumbItemType } from "antd/es/breadcrumb/Breadcrumb";
import clsx from "clsx";
import {
  forwardRef,
  ForwardRefRenderFunction,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Virtuoso } from "react-virtuoso";

import { searchBusinessUserInfo } from "@/api/login";
import { getSubDepartmentAndMember } from "@/api/organization";
import friend from "@/assets/images/chooseModal/friend.png";
import group from "@/assets/images/chooseModal/group.png";
import recently from "@/assets/images/chooseModal/recently.png";
import organization_icon from "@/assets/images/contact/organization_icon.png";
import { useCurrentMemberRole } from "@/hooks/useCurrentMemberRole";
import useGroupMembers, { REACH_SEARCH_FLAG } from "@/hooks/useGroupMembers";
import { IMSDK } from "@/layout/MainContentWrap";
import { useConversationStore } from "@/store";
import { useContactStore } from "@/store/contact";
import { feedbackToast } from "@/utils/common";
import { GroupMemberItem } from "@/utils/open-im-sdk-wasm/types/entity";

import CheckItem, { CheckListItem } from "./CheckItem";
import MenuItem from "./MenuItem";

const menuList = [
  {
    idx: 0,
    title: "最近聊天",
    icon: recently,
  },
  {
    idx: 1,
    title: "我的好友",
    icon: friend,
  },
  {
    idx: 2,
    title: "我的群组",
    icon: group,
  },
  {
    idx: 3,
    title: "组织架构",
    icon: organization_icon,
  },
];

export type ChooseMenuItem = (typeof menuList)[0];

interface IChooseBoxProps {
  className?: string;
  isCheckInGroup?: boolean;
  notConversation?: boolean;
  showGroupMember?: boolean;
  chooseOneOnly?: boolean;
  checkMemberRole?: boolean;
}

export interface ChooseBoxHandle {
  getCheckedList: () => CheckListItem[];
  updatePrevCheckList: (data: CheckListItem[]) => void;
  resetState: () => void;
}

const ChooseBox: ForwardRefRenderFunction<ChooseBoxHandle, IChooseBoxProps> = (
  props,
  ref,
) => {
  const {
    className,
    isCheckInGroup,
    notConversation,
    showGroupMember,
    chooseOneOnly,
    checkMemberRole,
  } = props;

  const [checkedList, setCheckedList] = useState<CheckListItem[]>([]);
  const latestCheckedList = useLatest(checkedList);

  const [searchState, setSearchState] = useState({
    keywords: "",
    searching: false,
    canSearch: showGroupMember,
  });

  const memberListRef = useRef<MemberListHandle>(null);
  const commLeftRef = useRef<CommonLeftHandle>(null);

  const checkClick = useCallback(
    (data: CheckListItem) => {
      const idx = latestCheckedList.current.findIndex(
        (item) =>
          (item.userID && item.userID === data.userID) ||
          (item.groupID && item.groupID === data.groupID && !showGroupMember) ||
          (item.user?.userID &&
            item.user.userID === (data.userID ?? data.user?.userID)),
      );
      if (idx > -1) {
        setCheckedList((state) => {
          const newState = [...state];
          newState.splice(idx, 1);
          return newState;
        });
      } else {
        if (chooseOneOnly && latestCheckedList.current.length > 0) {
          feedbackToast({ msg: "超出选择限制", error: "超出选择限制" });
          return;
        }

        setCheckedList((state) => [...state, data]);
      }
    },
    [chooseOneOnly],
  );

  const isChecked = useCallback(
    (data: CheckListItem) =>
      checkedList.some(
        (item) =>
          (item.userID && item.userID === data.userID) ||
          (item.user?.userID &&
            item.user.userID === (data.userID ?? data.user?.userID)) ||
          (item.groupID && item.groupID === data.groupID && !showGroupMember),
      ),
    [checkedList.length, showGroupMember],
  );

  const resetState = () => {
    setCheckedList([]);
  };

  const updatePrevCheckList = (data: CheckListItem[]) => {
    setCheckedList([...data]);
  };

  const onEnterSearch = () => {
    if (!searchState.keywords) return;
    setSearchState((state) => ({ ...state, searching: true }));

    if (showGroupMember) {
      memberListRef.current?.searchMember(searchState.keywords);
    } else {
      commLeftRef.current?.getFilterCheckList(searchState.keywords);
    }
  };

  const updateIsCanSearch = useCallback((canSearch: boolean) => {
    setSearchState((state) => ({ ...state, canSearch }));
  }, []);

  useImperativeHandle(ref, () => ({
    getCheckedList: () => checkedList,
    resetState,
    updatePrevCheckList,
  }));

  return (
    <div
      className={clsx(
        "mx-9 mt-5 flex h-[480px] rounded-md border border-[var(--gap-text)]",
        className,
      )}
    >
      <div className="flex flex-1 flex-col border-r border-[var(--gap-text)]">
        <div className="p-5.5 pb-3">
          <Input
            value={searchState.keywords}
            allowClear
            disabled={!searchState.canSearch}
            onChange={(e) =>
              setSearchState((state) => ({
                searching: e.target.value ? state.searching : false,
                keywords: e.target.value,
                canSearch: state.canSearch,
              }))
            }
            onPressEnter={onEnterSearch}
            prefix={<SearchOutlined rev={undefined} className="text-[#8e9ab0]" />}
          />
        </div>
        {showGroupMember ? (
          <ForwardMemberList
            ref={memberListRef}
            isChecked={isChecked}
            checkClick={checkClick}
            checkMemberRole={checkMemberRole}
            isSearching={searchState.searching}
          />
        ) : (
          <ForwardCommonLeft
            ref={commLeftRef}
            notConversation={notConversation!}
            isCheckInGroup={isCheckInGroup!}
            isSearching={searchState.searching}
            isChecked={isChecked}
            checkClick={checkClick}
            updateIsCanSearch={updateIsCanSearch}
          />
        )}
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="mx-5 py-5.5">
          已选择
          <span className="text-[var(--primary)]">{` ${checkedList.length} `}</span>项
        </div>
        <div className="mb-3 flex-1 overflow-y-auto">
          {checkedList.map((item) => (
            <CheckItem
              data={item}
              key={item.userID || item.groupID || item.user?.userID}
              cancelClick={checkClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default memo(forwardRef(ChooseBox));

interface ICommonLeftProps {
  notConversation: boolean;
  isCheckInGroup: boolean;
  isSearching: boolean;
  checkClick: (data: CheckListItem) => void;
  isChecked: (data: CheckListItem) => boolean;
  updateIsCanSearch: (canSearch: boolean) => void;
}

interface CommonLeftHandle {
  getFilterCheckList: (keyword: string) => void;
}

const CommonLeft: ForwardRefRenderFunction<CommonLeftHandle, ICommonLeftProps> = (
  {
    notConversation,
    isCheckInGroup,
    isSearching,
    checkClick,
    isChecked,
    updateIsCanSearch,
  },
  ref,
) => {
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItemType[]>([]);
  const [checkList, setCheckList] = useState<CheckListItem[]>([]);
  const [searchList, setSearchList] = useState<CheckListItem[]>([]);
  const latestBreadcrumb = useLatest(breadcrumb);

  const { runAsync: getSubDepartmentAndMemberData, loading: orgDataLoading } =
    useRequest(getSubDepartmentAndMember, {
      manual: true,
    });

  const breadcrumbClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    e.preventDefault();
    setBreadcrumb([]);
    updateIsCanSearch(false);
  };

  const checkInGroup = async (list: CheckListItem[]) => {
    const currentGroupID = useConversationStore.getState().currentConversation?.groupID;
    if (!isCheckInGroup || !currentGroupID) {
      return list;
    }
    const tmpList = JSON.parse(JSON.stringify(list)) as CheckListItem[];
    const userIDList = tmpList
      .filter((item) => Boolean(item.userID || item.user?.userID))
      .map((item) => item.userID ?? item.user?.userID ?? "");
    try {
      const { data } = await IMSDK.getSpecifiedGroupMembersInfo<GroupMemberItem[]>({
        groupID: currentGroupID,
        userIDList,
      });
      const inGroupUserIDList = data.map((item) => item.userID);
      tmpList.map((item) => {
        item.disabled = inGroupUserIDList.includes(
          item.userID ?? item.user?.userID ?? "",
        );
      });
    } catch (error) {
      console.log(error);
    }
    return tmpList;
  };

  const menuClick = useCallback(async (idx: number) => {
    const pushItem: BreadcrumbItemType = {};
    switch (idx) {
      case 0:
        setCheckList(
          await checkInGroup(useConversationStore.getState().conversationList),
        );
        pushItem.title = "最近聊天";
        break;
      case 1:
        setCheckList(await checkInGroup(useContactStore.getState().friendList));
        pushItem.title = "我的好友";
        break;
      case 2:
        setCheckList(await checkInGroup(useContactStore.getState().groupList));
        pushItem.title = "我的群组";
        break;
      case 3:
        getOrgnizationData();
        pushItem.title = "组织架构";
        pushItem.href = "";
        pushItem.key = "";
        pushItem.onClick = (e) => breadcrumbDepClick(e, "", 0);
        break;
      default:
        break;
    }
    setBreadcrumb((state) => [...state, pushItem]);
    updateIsCanSearch(true);
  }, []);

  const getOrgnizationData = (departmentID = "") => {
    getSubDepartmentAndMemberData(departmentID).then(async ({ data }) => {
      setCheckList(
        await checkInGroup([...(data.members ?? []), ...(data.departments ?? [])]),
      );
    });
  };

  const getFilterCheckList = (keyword: string) => {
    if (!latestBreadcrumb.current) return;

    if (!keyword) {
      setSearchList([]);
      return;
    }
    if (latestBreadcrumb.current[0].href !== undefined) {
      searchInOrganization(keyword);
      return;
    }
    const filterList = checkList.filter((item) => {
      if (item.conversationID) {
        return item.showName?.includes(keyword);
      }
      if (item.groupID) {
        return item.groupName?.includes(keyword) || item.groupID?.includes(keyword);
      }
      return item.nickname?.includes(keyword) || item.userID?.includes(keyword);
    });
    setSearchList(filterList);
  };

  const searchInOrganization = async (keyword: string) => {
    let searchData: CheckListItem[] = [];
    try {
      const {
        data: { total, users },
      } = await searchBusinessUserInfo(keyword);
      searchData = total ? users : [];
    } catch (error) {
      console.log(error);
    }
    setSearchList(searchData);
  };

  const breadcrumbDepClick = (
    e: React.MouseEvent<HTMLAnchorElement | HTMLSpanElement, MouseEvent>,
    departmentID: string,
    idx: number,
  ) => {
    e.preventDefault();
    if (idx === latestBreadcrumb.current.length - 1) return;
    getOrgnizationData(departmentID);
    setBreadcrumb((prev) => prev.slice(0, idx + 1));
  };

  const itemClick = useCallback((item: CheckListItem) => {
    if (item.departmentID) {
      const idx = latestBreadcrumb.current.length;

      const pushItem: BreadcrumbItemType = {
        title: item.name,
        href: "",
        key: item.departmentID,
        onClick: (e) => breadcrumbDepClick(e, item.departmentID ?? "", idx),
      };
      setBreadcrumb((prev) => [...prev, pushItem]);
      getOrgnizationData(item.departmentID);
      return;
    }
    checkClick(item);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      getFilterCheckList,
    }),
    [],
  );

  if (breadcrumb.length < 1) {
    return (
      <div className="flex-1 overflow-auto">
        {menuList.map((menu) => {
          if (notConversation && menu.idx !== 1 && menu.idx !== 3) {
            return null;
          }
          return <MenuItem menu={menu} key={menu.idx} menuClick={menuClick} />;
        })}
      </div>
    );
  }

  const dataSource = isSearching ? searchList : checkList;

  return (
    <div className="flex flex-1 flex-col">
      <Breadcrumb
        className="choose-box-breadcrumb mx-5.5"
        separator=">"
        items={[
          {
            title: "联系人",
            href: "",
            onClick: breadcrumbClick,
          },
          ...breadcrumb,
        ]}
      />
      <div className="mb-3 flex-1 overflow-y-auto">
        <Spin wrapperClassName="h-full" spinning={orgDataLoading}>
          <Virtuoso
            className="h-full"
            data={dataSource}
            itemContent={(_, item) => (
              <CheckItem
                showCheck
                isChecked={isChecked(item)}
                data={item}
                key={item.userID || item.groupID}
                itemClick={itemClick}
              />
            )}
          />
        </Spin>
      </div>
    </div>
  );
};

const ForwardCommonLeft = memo(forwardRef(CommonLeft));

interface IGroupMemberListProps {
  isSearching?: boolean;
  checkMemberRole?: boolean;
  checkClick: (data: CheckListItem) => void;
  isChecked: (data: CheckListItem) => boolean;
}

interface MemberListHandle {
  searchMember: (keywords: string) => void;
}

const GroupMemberList: ForwardRefRenderFunction<
  MemberListHandle,
  IGroupMemberListProps
> = ({ isSearching, checkMemberRole, checkClick, isChecked }, ref) => {
  const { currentRolevel, currentMemberInGroup } = useCurrentMemberRole();
  const { fetchState, searchMember, getMemberData, resetState } = useGroupMembers({
    notRefresh: true,
  });

  useEffect(() => {
    if (currentMemberInGroup?.groupID) {
      getMemberData(true);
    }
    return () => {
      resetState();
    };
  }, [currentMemberInGroup?.groupID]);

  const endReached = () => {
    if (fetchState.loading || !fetchState.hasMore) {
      return;
    }
    if (!isSearching) {
      getMemberData();
    } else {
      searchMember(REACH_SEARCH_FLAG);
    }
  };

  const isDisabled = (member: GroupMemberItem) => {
    if (member.userID === currentMemberInGroup?.userID) return true;
    if (!checkMemberRole) return false;
    return member.roleLevel >= currentRolevel;
  };

  useImperativeHandle(
    ref,
    () => ({
      searchMember,
    }),
    [],
  );

  const dataSource = isSearching
    ? fetchState.searchMemberList
    : fetchState.groupMemberList;

  return (
    <Virtuoso
      className="h-full overflow-x-hidden"
      data={dataSource}
      endReached={endReached}
      components={{
        Header: () => (fetchState.loading ? <div>loading...</div> : null),
      }}
      itemContent={(_, member) => (
        <CheckItem
          showCheck
          isChecked={isChecked(member)}
          disabled={isDisabled(member)}
          data={member}
          key={member.userID}
          itemClick={checkClick}
        />
      )}
    />
  );
};

const ForwardMemberList = memo(forwardRef(GroupMemberList));
