import Emitter from "../utils/emitter";
import {
  AccessFriendParams,
  AccessGroupParams,
  AddFriendParams,
  AdvancedMsgParams,
  AdvancedQuoteMsgParams,
  AtMsgParams,
  ChangeGroupMemberMuteParams,
  ChangeGroupMuteParams,
  CreateGroupParams,
  CreateMeetingParams,
  CustomMsgParams,
  CustomSignalParams,
  FaceMessageParams,
  FileMsgFullParams,
  FileMsgParams,
  FindMessageParams,
  GetAdvancedHistoryMsgParams,
  GetGroupMemberByTimeParams,
  GetGroupMemberParams,
  GetHistoryMsgParams,
  GetOneConversationParams,
  GetOneCveParams,
  GroupInfoParams,
  GroupMsgReadParams,
  ImageMsgParams,
  InsertGroupMsgParams,
  InsertSingleMsgParams,
  InviteGroupParams,
  isRecvParams,
  JoinGroupParams,
  JoinMeetingParams,
  LocationMsgParams,
  LoginParam,
  MarkC2CParams,
  MarkNotiParams,
  MeetingOperateStreamParams,
  MemberExParams,
  MemberNameParams,
  MergerMsgParams,
  PartialUserItem,
  PinCveParams,
  QuoteMsgParams,
  RemarkFriendParams,
  RtcActionParams,
  SearchFriendParams,
  SearchGroupMemberParams,
  SearchGroupParams,
  SearchLocalParams,
  SendMsgParams,
  setBurnDurationParams,
  SetDraftParams,
  SetGroupRoleParams,
  SetGroupVerificationParams,
  SetMemberAuthParams,
  setPrvParams,
  SoundMsgParams,
  SouondMsgFullParams,
  SplitParams,
  TransferGroupParams,
  TypingUpdateParams,
  UpdateMeetingParams,
  VideoMsgFullParams,
  VideoMsgParams,
} from "../types/params";
import { RtcInvite, WsResponse } from "../types/entity";
import { OptType } from "../types/enum";
declare class SDK extends Emitter {
  private wasmInitializedPromise;
  private goExitPromise;
  private goExisted;
  constructor(url?: string);
  emit(event: CbEvents, data: WSEvent): this;
  on(event: CbEvents, fn: Cbfn): this;
  off(event: CbEvents, fn: Cbfn): this | undefined;
  _invoker(functionName: string, func: (...args: any[]) => Promise<any>, args: any[], processor?: (data: string) => string): Promise<WsResponse>;
  login: (params: LoginParam, operationID?: string) => Promise<any>;
  logout: (operationID?: string) => Promise<WsResponse>;
  getAllConversationList: (operationID?: string) => Promise<WsResponse>;
  getOneConversation: (params: GetOneConversationParams, operationID?: string) => Promise<WsResponse>;
  getAdvancedHistoryMessageList: (params: GetAdvancedHistoryMsgParams, operationID?: string) => Promise<WsResponse>;
  getHistoryMessageList: (params: GetHistoryMsgParams, operationID?: string) => Promise<WsResponse>;
  getGroupsInfo: (params: string[], operationID?: string) => Promise<WsResponse>;
  deleteConversationFromLocalAndSvr: (conversationID: string, operationID?: string) => Promise<WsResponse>;
  markC2CMessageAsRead: (params: MarkC2CParams, operationID?: string) => Promise<WsResponse>;
  markMessageAsReadByConID: (params: MarkNotiParams, operationID?: string) => Promise<WsResponse>;
  markNotifyMessageHasRead: (conversationID: string, operationID?: string) => Promise<WsResponse>;
  getGroupMemberList: (params: GetGroupMemberParams, operationID?: string) => Promise<WsResponse>;
  createTextMessage: (text: string, operationID?: string) => Promise<WsResponse>;
  createImageMessage: (params: ImageMsgParams, operationID?: string) => Promise<WsResponse>;
  createCustomMessage: (params: CustomMsgParams, operationID?: string) => Promise<WsResponse>;
  createQuoteMessage: (params: QuoteMsgParams, operationID?: string) => Promise<WsResponse>;
  createAdvancedQuoteMessage(params: AdvancedQuoteMsgParams, operationID?: string): Promise<WsResponse>;
  createAdvancedTextMessage: (params: AdvancedMsgParams, operationID?: string) => Promise<WsResponse>;
  sendMessage: (params: SendMsgParams, operationID?: string) => Promise<WsResponse>;
  sendMessageNotOss: (params: SendMsgParams, operationID?: string) => Promise<WsResponse>;
  sendMessageByBuffer: (params: SendMsgParams, operationID?: string) => Promise<WsResponse>;
  exportDB(operationID?: string): Promise<WsResponse>;
  getHistoryMessageListReverse: (params: GetHistoryMsgParams, operationID?: string) => Promise<WsResponse>;
  revokeMessage: (params: string, operationID?: string) => Promise<WsResponse>;
  setOneConversationPrivateChat: (params: setPrvParams, operationID?: string) => Promise<WsResponse>;
  setOneConversationBurnDuration: (params: setBurnDurationParams, operationID?: string) => Promise<WsResponse>;
  getLoginStatus: (operationID?: string) => Promise<WsResponse>;
  getLoginUser: (operationID?: string) => Promise<WsResponse>;
  getSelfUserInfo: (operationID?: string) => Promise<WsResponse>;
  getUsersInfo: (data: string[], operationID?: string) => Promise<WsResponse>;
  setSelfInfo: (data: PartialUserItem, operationID?: string) => Promise<WsResponse>;
  createTextAtMessage: (data: AtMsgParams, operationID?: string) => Promise<WsResponse>;
  createSoundMessage: (data: SoundMsgParams, operationID?: string) => Promise<WsResponse>;
  createVideoMessage: (data: VideoMsgParams, operationID?: string) => Promise<WsResponse>;
  createFileMessage: (data: FileMsgParams, operationID?: string) => Promise<WsResponse>;
  createFileMessageFromFullPath: (data: FileMsgFullParams, operationID?: string) => Promise<WsResponse>;
  createImageMessageFromFullPath: (data: string, operationID?: string) => Promise<WsResponse>;
  createSoundMessageFromFullPath: (data: SouondMsgFullParams, operationID?: string) => Promise<WsResponse>;
  createVideoMessageFromFullPath: (data: VideoMsgFullParams, operationID?: string) => Promise<WsResponse>;
  createMergerMessage: (data: MergerMsgParams, operationID?: string) => Promise<WsResponse>;
  createForwardMessage: (data: string, operationID?: string) => Promise<WsResponse>;
  createFaceMessage: (data: FaceMessageParams, operationID?: string) => Promise<WsResponse>;
  createLocationMessage: (data: LocationMsgParams, operationID?: string) => Promise<WsResponse>;
  createCardMessage: (data: string, operationID?: string) => Promise<WsResponse>;
  deleteMessageFromLocalStorage: (data: string, operationID?: string) => Promise<WsResponse>;
  deleteMessageFromLocalAndSvr: (data: string, operationID?: string) => Promise<WsResponse>;
  deleteAllConversationFromLocal: (operationID?: string) => Promise<WsResponse>;
  deleteAllMsgFromLocal: (operationID?: string) => Promise<WsResponse>;
  deleteAllMsgFromLocalAndSvr: (operationID?: string) => Promise<WsResponse>;
  markGroupMessageHasRead: (data: string, operationID?: string) => Promise<WsResponse>;
  markGroupMessageAsRead: (data: GroupMsgReadParams, operationID?: string) => Promise<WsResponse>;
  insertSingleMessageToLocalStorage: (data: InsertSingleMsgParams, operationID?: string) => Promise<WsResponse>;
  insertGroupMessageToLocalStorage: (data: InsertGroupMsgParams, operationID?: string) => Promise<WsResponse>;
  typingStatusUpdate: (data: TypingUpdateParams, operationID?: string) => Promise<WsResponse>;
  clearC2CHistoryMessage: (data: string, operationID?: string) => Promise<WsResponse>;
  clearC2CHistoryMessageFromLocalAndSvr: (data: string, operationID?: string) => Promise<WsResponse>;
  clearGroupHistoryMessage: (data: string, operationID?: string) => Promise<WsResponse>;
  clearGroupHistoryMessageFromLocalAndSvr: (data: string, operationID?: string) => Promise<WsResponse>;
  getConversationListSplit: (data: SplitParams, operationID?: string) => Promise<WsResponse>;
  getConversationIDBySessionType: (data: GetOneCveParams, operationID?: string) => Promise<WsResponse>;
  getMultipleConversation: (data: string[], operationID?: string) => Promise<WsResponse>;
  deleteConversation: (data: string, operationID?: string) => Promise<WsResponse>;
  setConversationDraft: (data: SetDraftParams, operationID?: string) => Promise<WsResponse>;
  pinConversation: (data: PinCveParams, operationID?: string) => Promise<WsResponse>;
  getTotalUnreadMsgCount: (operationID?: string) => Promise<WsResponse>;
  getConversationRecvMessageOpt: (data: string[], operationID?: string) => Promise<WsResponse>;
  setConversationRecvMessageOpt: (data: isRecvParams, operationID?: string) => Promise<WsResponse>;
  searchLocalMessages: (data: SearchLocalParams, operationID?: string) => Promise<WsResponse>;
  addFriend: (data: AddFriendParams, operationID?: string) => Promise<WsResponse>;
  searchFriends: (data: SearchFriendParams, operationID?: string) => Promise<WsResponse>;
  getDesignatedFriendsInfo: (data: string[], operationID?: string) => Promise<WsResponse>;
  getRecvFriendApplicationList: (operationID?: string) => Promise<WsResponse>;
  getSendFriendApplicationList: (operationID?: string) => Promise<WsResponse>;
  getFriendList: (operationID?: string) => Promise<WsResponse>;
  setFriendRemark: (data: RemarkFriendParams, operationID?: string) => Promise<WsResponse>;
  checkFriend: (data: string[], operationID?: string) => Promise<WsResponse>;
  acceptFriendApplication: (data: AccessFriendParams, operationID?: string) => Promise<WsResponse>;
  refuseFriendApplication: (data: AccessFriendParams, operationID?: string) => Promise<WsResponse>;
  deleteFriend: (data: string, operationID?: string) => Promise<WsResponse>;
  addBlack: (data: string, operationID?: string) => Promise<WsResponse>;
  removeBlack: (data: string, operationID?: string) => Promise<WsResponse>;
  getBlackList: (operationID?: string) => Promise<WsResponse>;
  inviteUserToGroup: (data: InviteGroupParams, operationID?: string) => Promise<WsResponse>;
  kickGroupMember: (data: InviteGroupParams, operationID?: string) => Promise<WsResponse>;
  getGroupMembersInfo: (data: Omit<InviteGroupParams, "reason">, operationID?: string) => Promise<WsResponse>;
  getGroupMemberListByJoinTimeFilter: (data: GetGroupMemberByTimeParams, operationID?: string) => Promise<WsResponse>;
  searchGroupMembers: (data: SearchGroupMemberParams, operationID?: string) => Promise<WsResponse>;
  setGroupApplyMemberFriend: (data: SetMemberAuthParams, operationID?: string) => Promise<WsResponse>;
  setGroupLookMemberInfo: (data: SetMemberAuthParams, operationID?: string) => Promise<WsResponse>;
  getJoinedGroupList: (operationID?: string) => Promise<WsResponse>;
  createGroup: (data: CreateGroupParams, operationID?: string) => Promise<WsResponse>;
  setGroupInfo: (data: GroupInfoParams, operationID?: string) => Promise<WsResponse>;
  setGroupMemberNickname: (data: MemberNameParams, operationID?: string) => Promise<WsResponse>;
  setGroupMemberInfo: (data: MemberExParams, operationID?: string) => Promise<WsResponse>;
  joinGroup: (data: JoinGroupParams, operationID?: string) => Promise<WsResponse>;
  searchGroups: (data: SearchGroupParams, operationID?: string) => Promise<WsResponse>;
  quitGroup: (data: string, operationID?: string) => Promise<WsResponse>;
  dismissGroup: (data: string, operationID?: string) => Promise<WsResponse>;
  changeGroupMute: (data: ChangeGroupMuteParams, operationID?: string) => Promise<WsResponse>;
  changeGroupMemberMute: (data: ChangeGroupMemberMuteParams, operationID?: string) => Promise<WsResponse>;
  transferGroupOwner: (data: TransferGroupParams, operationID?: string) => Promise<WsResponse>;
  getSendGroupApplicationList: (operationID?: string) => Promise<WsResponse>;
  getRecvGroupApplicationList: (operationID?: string) => Promise<WsResponse>;
  acceptGroupApplication: (data: AccessGroupParams, operationID?: string) => Promise<WsResponse>;
  refuseGroupApplication: (data: AccessGroupParams, operationID?: string) => Promise<WsResponse>;
  signalingInvite: (data: RtcInvite, operationID?: string) => Promise<WsResponse>;
  signalingInviteInGroup: (data: RtcInvite, operationID?: string) => Promise<WsResponse>;
  signalingAccept: (data: RtcActionParams, operationID?: string) => Promise<WsResponse>;
  signalingReject: (data: RtcActionParams, operationID?: string) => Promise<WsResponse>;
  signalingCancel: (data: RtcActionParams, operationID?: string) => Promise<WsResponse>;
  signalingHungUp: (data: RtcActionParams, operationID?: string) => Promise<WsResponse>;
  resetConversationGroupAtType: (data: string, operationID?: string) => Promise<WsResponse>;
  setGroupMemberRoleLevel: (data: SetGroupRoleParams, operationID?: string) => Promise<WsResponse>;
  setGroupVerification: (data: SetGroupVerificationParams, operationID?: string) => Promise<WsResponse>;
  setGlobalRecvMessageOpt: (
    data: {
      opt: OptType;
    },
    operationID?: string
  ) => Promise<WsResponse>;
  newRevokeMessage: (data: string, operationID?: string) => Promise<WsResponse>;
  findMessageList: (data: FindMessageParams, operationID?: string) => Promise<WsResponse>;
  wakeUp: (operationID?: string) => Promise<WsResponse>;
  signalingGetRoomByGroupID: (groupID: string, operationID?: string) => Promise<WsResponse>;
  signalingGetTokenByRoomID: (roomID: string, operationID?: string) => Promise<WsResponse>;
  signalingSendCustomSignal: (data: CustomSignalParams, operationID?: string) => Promise<WsResponse>;
  signalingCreateMeeting: (data: CreateMeetingParams, operationID?: string) => Promise<WsResponse>;
  signalingJoinMeeting: (data: JoinMeetingParams, operationID?: string) => Promise<WsResponse>;
  signalingUpdateMeetingInfo: (data: UpdateMeetingParams, operationID?: string) => Promise<WsResponse>;
  signalingCloseRoom: (roomID: string, operationID?: string) => Promise<WsResponse>;
  signalingGetMeetings: (operationID?: string) => Promise<WsResponse>;
  signalingOperateStream: (data: MeetingOperateStreamParams, operationID?: string) => Promise<WsResponse>;
}
export declare function getSDK(url?: string): SDK;
export {};
