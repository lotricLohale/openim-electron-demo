export declare function getMessage(messageId: string): Promise<string>;
export declare function getMultipleMessage(messageIDStr: string): Promise<string>;
export declare function getSendingMessageList(): Promise<string>;
export declare function getNormalMsgSeq(): Promise<string>;
export declare function updateMessageTimeAndStatus(clientMsgID: string, serverMsgID: string, sendTime: number, status: number): Promise<string>;
export declare function updateMessage(clientMsgId: string, messageStr: string): Promise<string>;
export declare function updateColumnsMessage(clientMsgId: string, messageStr: string): Promise<string>;
export declare function insertMessage(messageStr: string): Promise<string>;
export declare function batchInsertMessageList(messageListStr: string): Promise<string>;
export declare function getMessageListNoTime(sourceID: string, sessionType: number, count: number, isReverse: boolean | undefined, loginUserID: string): Promise<string>;
export declare function getMessageList(sourceID: string, sessionType: number, count: number, startTime: number, isReverse: boolean | undefined, loginUserID: string): Promise<string>;
export declare function messageIfExists(clientMsgID: string): Promise<string>;
export declare function isExistsInErrChatLogBySeq(seq: number): Promise<string>;
export declare function messageIfExistsBySeq(seq: number): Promise<string>;
export declare function getAbnormalMsgSeq(): Promise<string>;
export declare function getAbnormalMsgSeqList(): Promise<string>;
export declare function batchInsertExceptionMsg(messageListStr: string): Promise<string>;
export declare function searchMessageByKeyword(contentTypeStr: string, keywordListStr: string, keywordListMatchType: number, sourceID: string, startTime: number, endTime: number, sessionType: number, offset: number, count: number): Promise<string>;
export declare function searchMessageByContentType(contentTypeStr: string, sourceID: string, startTime: number, endTime: number, sessionType: number, offset: number, count: number): Promise<string>;
export declare function searchMessageByContentTypeAndKeyword(contentTypeStr: string, keywordListStr: string, keywordListMatchType: number, startTime: number, endTime: number): Promise<string>;
export declare function updateMsgSenderNickname(sendID: string, nickname: string, sessionType: number): Promise<string>;
export declare function updateMsgSenderFaceURL(sendID: string, faceURL: string, sessionType: number): Promise<string>;
export declare function updateMsgSenderFaceURLAndSenderNickname(sendID: string, faceURL: string, nickname: string, sessionType: number): Promise<string>;
export declare function getMsgSeqByClientMsgID(clientMsgID: string): Promise<string>;
export declare function getMsgSeqListByGroupID(groupID: string): Promise<string>;
export declare function getMsgSeqListByPeerUserID(userID: string): Promise<string>;
export declare function getMsgSeqListBySelfUserID(userID: string): Promise<string>;
export declare function deleteAllMessage(): Promise<string>;
export declare function getAllUnDeleteMessageSeqList(): Promise<string>;
export declare function updateSingleMessageHasRead(sendID: string, clientMsgIDListStr: string): Promise<string>;
export declare function updateGroupMessageHasRead(clientMsgIDListStr: string, sessionType: number): Promise<string>;
export declare function updateMessageStatusBySourceID(sourceID: string, status: number, sessionType: number, loginUserID: string): Promise<string>;
