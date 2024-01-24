import { WorkMomentLogType } from "@/constants";

type SplitResponse = {
  currentPage: number;
  showNumber: number;
};

export type WorkMoments = {
  workMomentID: string;
  userID: string;
  content: {
    metas?: {
      original: string;
      thumb: string;
    }[];
    text: string;
    type: number;
  };
  likeUsers?: Users[];
  comments?: Comments[];
  faceURL: string;
  nickname: string;
  atUsers?: Users[];
  permissionUsers?: Users[];
  createTime: number;
  permission: number;
  type?: WorkMomentLogType;
  uuid?: string;
};

export type Content = {
  // 0图文 1视频
  type: 0 | 1;
  text: string;
  metas: {
    thumb: string;
    original: string;
  }[];
};

export type Users = {
  userID: string;
  nickname: string;
  faceURL?: string;
};

export type Comments = {
  userID: string;
  nickname: string;
  replyUserID: string;
  replyNickname: string;
  commentID: string;
  content: string;
  createTime: number;
  faceURL: string;
  replyFaceURL: string;
};

export type WorkMomentsResponse = {
  workMoments: WorkMoments[];
} & SplitResponse;
