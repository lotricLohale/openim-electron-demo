import { message, Popover, Badge, Skeleton } from "antd";
import { FC, forwardRef, ForwardRefRenderFunction, memo, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import LayLoad from "../../../../components/LayLoad";
import MyAvatar from "../../../../components/MyAvatar";
import { diffMemo, formatDate, im, parseMessageType } from "../../../../utils";
import { isNotify } from "../../../../utils/im";
import { ConversationItem, GroupAtType, MessageItem, OptType, SessionType } from "../../../../utils/open_im_sdk/types";
import group_icon from "@/assets/images/group_icon.png";
import noti_icon from "@/assets/images/cve_noti.png";
import { GroupTypes } from "../../../../constants/messageContentType";
import { useSelector, shallowEqual } from "react-redux";
import { RootState } from "../../../../store";

type CveItemProps = {
  cve: ConversationItem;
  onClick: (cve: ConversationItem) => void;
  delCve: (cid: string) => void;
  curCid?: string;
  curUid: string;
};

const CveItem: ForwardRefRenderFunction<HTMLDivElement, CveItemProps> = (props, ref) => {
  const { cve, onClick, curCid, curUid, delCve } = props;
  const [popVis, setPopVis] = useState(false);
  const groupList = useSelector((state: RootState) => state.contacts.groupList, shallowEqual);
  const { t } = useTranslation();

  const parseLatestMsg = (): string => {
    const lmsg = cve.latestMsg;
    if (lmsg === "") return lmsg;

    if (cve.draftText !== "") {
      let text = cve.draftText;
      const pattern = /\<img.*?\">/g;
      const matchArr = text.match(pattern);
      if (matchArr && matchArr.length > 0) {
        matchArr.map((matchRes) => {
          text = text.replaceAll(matchRes, t("Picture"));
        });
      }
      return t("Draft") + " " + text;
    }

    const pmsg: MessageItem = JSON.parse(lmsg);
    let prefix = "";

    if (!isRecv(cve?.recvMsgOpt) && cve.unreadCount > 0) {
      prefix = `[${cve.unreadCount + t("Piece")}] `;
    }

    if (cve.groupAtType !== GroupAtType.AtNormal) {
      switch (cve.groupAtType) {
        case GroupAtType.AtAll:
          prefix = t("AtAll");
          break;
        case GroupAtType.AtMe:
          prefix = t("AtMe");
          break;
        case GroupAtType.AtAllAtMe:
          prefix = t("AtAllAtMe");
          break;
        case GroupAtType.AtGroupNotice:
          prefix = t("AtGroupNotice");
          break;
      }
      prefix = `<span class="cve_msg_prefix">${prefix}</span> `;
    }
    console.log("parseLatestMsg", pmsg);
    if (prefix) {
      return prefix + parseMessageType(pmsg, curUid);
    }
    return parseMessageType(pmsg, curUid);
  };

  const parseLatestTime = (ltime: number): string => {
    const sendArr = formatDate(ltime);
    const dayArr = formatDate(ltime + 86400000);
    const curArr = formatDate(new Date().getTime());
    if (sendArr[3] === curArr[3]) {
      return sendArr[4] as string;
    } else if (dayArr[3] === curArr[3]) {
      return t("Yesterday");
    } else {
      return sendArr[3] as string;
    }
  };

  const updateCvePin = () => {
    const options = {
      conversationID: cve.conversationID,
      isPinned: !cve.isPinned,
    };
    im.pinConversation(options)
      .then((res) => {
        message.success(!cve.isPinned ? t("PinSuc") : t("CancelPinSuc"));
      })
      .catch((err) => {});
  };

  const markAsRead = () => {
    if (cve.userID) {
      isNotify(cve.conversationType)
        ? im.markMessageAsReadByConID({ conversationID: cve.conversationID, msgIDList: [] })
        : im.markC2CMessageAsRead({ userID: cve.userID, msgIDList: [] });
    } else {
      im.markGroupMessageHasRead(cve.groupID);
    }
  };

  const isInGroup = useMemo(() => groupList.find((group) => group.groupID === cve.groupID), [cve.groupID, groupList]);

  const PopContent = () => (
    <div onClick={() => setPopVis(false)} className="menu_list">
      {
        <div className="item" onClick={updateCvePin}>
          {cve.isPinned ? t("CancelPin") : t("Pin")}
        </div>
      }
      {cve.unreadCount > 0 && cve.groupID && isInGroup && (
        <div className="item" onClick={markAsRead}>
          {t("MarkAsRead")}
        </div>
      )}
      <div className="item" onClick={() => delCve(cve.conversationID)}>
        {t("RemoveCve")}
      </div>
    </div>
  );

  const isRecv = (opt: OptType) => opt === OptType.Nomal;

  // const parseLastMessage = isRecv(cve?.recvMsgOpt)
  //   ? parseLatestMsg(cve.latestMsg)
  //   : cve.unreadCount > 0
  //   ? `[${cve.unreadCount + t("Piece")}] ${parseLatestMsg(cve.latestMsg)}`
  //   : parseLatestMsg(cve.latestMsg);

  const parseLastMessage = useMemo(() => parseLatestMsg(), [cve.recvMsgOpt, cve.draftText, cve.groupAtType, cve.latestMsg, cve.unreadCount]);

  return (
    <div ref={ref}>
      <Popover
        visible={popVis}
        onVisibleChange={(v) => setPopVis(v)}
        placement="bottomRight"
        overlayClassName="cve_item_menu"
        key={cve.conversationID}
        content={PopContent}
        title={null}
        trigger="contextMenu"
      >
        <div onClick={() => onClick(cve)} className={`cve_item ${curCid === cve.conversationID || cve.isPinned ? "cve_item_focus" : ""}`}>
          <Badge size="small" dot={!isRecv(cve?.recvMsgOpt) && cve.unreadCount > 0} count={isRecv(cve?.recvMsgOpt) ? cve.unreadCount : null}>
            <MyAvatar size={36} src={isNotify(cve.conversationType) ? noti_icon : cve.faceURL === "" && GroupTypes.includes(cve.conversationType) ? group_icon : cve.faceURL} />
          </Badge>

          <div data-time={parseLatestTime(cve.latestMsgSendTime)} className={`cve_info ${isRecv(cve?.recvMsgOpt) ? "" : "cve_info_opt"}`}>
            <div className="cve_title">{cve.showName}</div>
            <div className={`cve_msg ${isRecv(cve?.recvMsgOpt) ? "" : "cve_msg_opt"}`} dangerouslySetInnerHTML={{ __html: parseLastMessage }}></div>
          </div>
        </div>
      </Popover>
      <div className="space" />
    </div>
  );
};

const diffKey = ["curCid"];
const deepKey = ["conversationID", "showName", "faceURL", "recvMsgOpt", "unreadCount", "latestMsg", "draftText", "isPinned", "groupAtType"];
export default memo(forwardRef(CveItem), (p, n) => {
  const shallowFlag = p.curCid !== p.cve.conversationID && n.curCid !== p.cve.conversationID && p.curUid === n.curUid;
  const deepFlag = diffMemo(p.cve, n.cve, deepKey);
  return shallowFlag && deepFlag;
});
