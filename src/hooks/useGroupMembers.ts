import { useLatest } from "ahooks";
import { useCallback, useEffect, useRef, useState } from "react";

import { IMSDK } from "@/layout/MainContentWrap";
import { useConversationStore } from "@/store";
import { feedbackToast } from "@/utils/common";
import { CbEvents } from "@/utils/open-im-sdk-wasm/constant";
import { GroupMemberItem, WSEvent } from "@/utils/open-im-sdk-wasm/types/entity";

export const REACH_SEARCH_FLAG = "LAST_FLAG";

export interface FetchStateType {
  offset: number;
  searchOffset: number;
  count: number;
  loading: boolean;
  hasMore: boolean;
  groupMemberList: GroupMemberItem[];
  searchMemberList: GroupMemberItem[];
}

interface UseGroupMembersProps {
  groupID?: string;
  notRefresh?: boolean;
}

export default function useGroupMembers(props?: UseGroupMembersProps) {
  const { groupID, notRefresh } = props ?? {};
  const [fetchState, setFetchState] = useState<FetchStateType>({
    offset: 0,
    searchOffset: 0,
    count: 20,
    loading: false,
    hasMore: true,
    groupMemberList: [],
    searchMemberList: [],
  });
  const latestFetchState = useLatest(fetchState);
  const lastKeyword = useRef("");

  useEffect(() => {
    const currentConversationGroupID =
      useConversationStore.getState().currentConversation?.groupID;
    if (!groupID && !currentConversationGroupID) return;
    const groupMemberInfoChangedHandler = ({
      data: member,
    }: WSEvent<GroupMemberItem>) => {
      if (member.groupID === latestFetchState.current.groupMemberList[0]?.groupID) {
        const idx = latestFetchState.current.groupMemberList.findIndex(
          (item) => item.userID === member.userID,
        );
        const newMembers = [...latestFetchState.current.groupMemberList];
        newMembers[idx] = { ...member };
        setFetchState((state) => ({
          ...state,
          groupMemberList: newMembers,
        }));
      }
    };

    const groupMemberCountHandler = ({ data }: WSEvent<GroupMemberItem>) => {
      if (notRefresh) {
        return;
      }
      if (
        data.groupID ===
        (groupID || latestFetchState.current.groupMemberList[0]?.groupID)
      ) {
        getMemberData(true);
      }
    };

    const setIMListener = () => {
      IMSDK.on(CbEvents.OnGroupMemberInfoChanged, groupMemberInfoChangedHandler);
      IMSDK.on(CbEvents.OnGroupMemberAdded, groupMemberCountHandler);
      IMSDK.on(CbEvents.OnGroupMemberDeleted, groupMemberCountHandler);
      IMSDK.on(CbEvents.OnJoinedGroupAdded, groupMemberCountHandler);
    };

    const disposeIMListener = () => {
      IMSDK.off(CbEvents.OnGroupMemberInfoChanged, groupMemberInfoChangedHandler);
      IMSDK.off(CbEvents.OnGroupMemberAdded, groupMemberCountHandler);
      IMSDK.off(CbEvents.OnGroupMemberDeleted, groupMemberCountHandler);
      IMSDK.off(CbEvents.OnJoinedGroupAdded, groupMemberCountHandler);
    };
    setIMListener();
    return () => {
      disposeIMListener();
    };
  }, [groupID]);

  const searchMember = useCallback(
    async (keyword: string) => {
      const isReach = keyword === REACH_SEARCH_FLAG;
      if (
        latestFetchState.current.loading ||
        (!latestFetchState.current.hasMore && isReach)
      )
        return;
      setFetchState((state) => ({
        ...state,
        loading: true,
      }));
      const currentConversationGroupID =
        useConversationStore.getState().currentConversation?.groupID;
      try {
        const { data } = await IMSDK.searchGroupMembers<GroupMemberItem[]>({
          groupID: groupID ?? currentConversationGroupID ?? "",
          offset: isReach ? latestFetchState.current.searchOffset : 0,
          count: 20,
          keywordList: [keyword === REACH_SEARCH_FLAG ? lastKeyword.current : keyword],
          isSearchMemberNickname: true,
          isSearchUserID: true,
        });

        lastKeyword.current = keyword;
        setFetchState((state) => ({
          ...state,
          searchMemberList: [...(isReach ? state.searchMemberList : []), ...data],
          hasMore: data.length === state.count,
          searchOffset: state.searchOffset + 20,
        }));
      } catch (error) {
        feedbackToast({
          msg: "getMemberFailed",
          error,
        });
      }

      setFetchState((state) => ({
        ...state,
        loading: false,
      }));
    },
    [groupID],
  );

  const getMemberData = useCallback(
    async (refresh = false) => {
      const sourceID =
        groupID ?? useConversationStore.getState().currentConversation?.groupID ?? "";
      if (!sourceID) return;

      if (
        (latestFetchState.current.loading || !latestFetchState.current.hasMore) &&
        !refresh
      )
        return;

      setFetchState((state) => ({
        ...state,
        loading: true,
      }));
      try {
        const { data } = await IMSDK.getGroupMemberList<GroupMemberItem[]>({
          groupID: sourceID,
          offset: refresh ? 0 : latestFetchState.current.offset,
          count: 20,
          filter: 0,
        });
        setFetchState((state) => ({
          ...state,
          groupMemberList: [...(refresh ? [] : state.groupMemberList), ...data],
          hasMore: data.length === state.count,
          offset: state.offset + 20,
          loading: false,
        }));
      } catch (error) {
        feedbackToast({
          msg: "getMemberFailed",
          error,
        });
        setFetchState((state) => ({
          ...state,
          loading: false,
        }));
      }
    },
    [groupID],
  );

  const resetState = () => {
    setFetchState({
      offset: 0,
      searchOffset: 0,
      count: 20,
      loading: false,
      hasMore: true,
      groupMemberList: [],
      searchMemberList: [],
    });
  };

  return {
    fetchState,
    getMemberData,
    searchMember,
    resetState,
  };
}
