import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "react-query";

import { USER_URL } from "@/config";
import { WorkMoments, WorkMomentsResponse } from "@/types/moment";
import createAxiosInstance from "@/utils/request";

const request = createAxiosInstance(USER_URL, false);

// 发布朋友圈
export const usePublishMoments = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (params: API.Moments.PublishMomentsParams) =>
      request.post("/office/work_moment/add", {
        ...params,
      }),
    { onSuccess: () => queryClient.invalidateQueries("SelfMoments") },
  );
};

// 获取自己的朋友圈
export const useSelfMoments = ({
  onSuccess,
}: {
  onSuccess?: (data: WorkMoments[]) => void;
}) => {
  return useInfiniteQuery<{ data: WorkMomentsResponse }>(
    ["SelfMoments"],
    ({ pageParam = 1 }) =>
      request.post("/office/work_moment/find/recv", {
        pagination: {
          pageNumber: pageParam as number,
          showNumber: 10,
        },
      }),
    {
      getNextPageParam: (lastPage, pages) => {
        if (lastPage.data.workMoments?.length < 10) return undefined;
        return pages.length + 1;
      },
      onSuccess: (data) => {
        const moments =
          data?.pages.flatMap((page) => page.data?.workMoments ?? []) ?? [];
        onSuccess?.(moments);
      },
    },
  );
};

// 获取用户的朋友圈
export const useUserMoments = ({
  userID,
  onSuccess,
}: {
  userID?: string;
  onSuccess?: (data: WorkMoments[]) => void;
}) => {
  return useInfiniteQuery<{ data: WorkMomentsResponse }>(
    [userID],
    ({ pageParam = 1 }) =>
      request.post("/office/work_moment/find/send", {
        userID,
        pagination: {
          pageNumber: pageParam as number,
          showNumber: 10,
        },
      }),
    {
      getNextPageParam: (lastPage, pages) => {
        if (lastPage.data.workMoments?.length < 10) return undefined;
        return pages.length + 1;
      },
      onSuccess: (data) => {
        const moments =
          data?.pages.flatMap((page) => page.data?.workMoments ?? []) ?? [];
        onSuccess?.(moments);
      },
      enabled: Boolean(userID),
    },
  );
};

// 获取单条朋友圈
export const useMoment = (workMomentID: string) => {
  return useQuery(
    ["Moment"],
    () =>
      request.post<{ workMoment: WorkMoments }>("/office/work_moment/get", {
        workMomentID,
      }),
    {
      enabled: workMomentID !== "",
    },
  );
};

// 删除朋友圈
export const useDeleteMoments = () => {
  return useMutation((workMomentID: string) =>
    request.post("/office/work_moment/del", {
      workMomentID,
    }),
  );
};

// 评论
export const useCreateComment = () => {
  return useMutation((params: API.Moments.CreateCommentParams) =>
    request.post("/office/work_moment/comment/add", {
      ...params,
    }),
  );
};

// 删除评论
export const useDeleteComment = () => {
  return useMutation((params: API.Moments.DeleteCommentParams) =>
    request.post("/office/work_moment/comment/del", {
      ...params,
    }),
  );
};

// 点赞
export const useLikeMoments = () => {
  return useMutation((params: { workMomentID: string; like: boolean }) =>
    request.post("/office/work_moment/like", {
      ...params,
    }),
  );
};

// 查询未读数
export const getMomentsUnreadCount = () =>
  request.post("/office/work_moment/unread/count", {});

// 查询消息列表
export const useLogs = () => {
  return useInfiniteQuery<{ data: WorkMomentsResponse }>(
    ["logs"],
    ({ pageParam = 1 }) =>
      request.post("/office/work_moment/logs", {
        pagination: {
          pageNumber: pageParam as number,
          showNumber: 10,
        },
      }),
    {
      getNextPageParam: (lastPage, pages) => {
        if (lastPage.data.workMoments?.length ?? 0 < 20) return undefined;
        return pages.length + 1;
      },
    },
  );
};

// 查询消息列表
export enum MomentsClearType {
  Count = 1,
  List = 2,
  All = 3,
}
export const useClearUnread = () => {
  return useMutation((type: MomentsClearType) =>
    request.post("/office/work_moment/unread/clear", {
      type,
    }),
  );
};
