import { message, Popover } from "antd";
import { FC, useMemo } from "react";

import ts_msg from "@/assets/images/ts_msg.png";
import re_msg from "@/assets/images/re_msg.png";
import rev_msg from "@/assets/images/rev_msg.png";
import mc_msg from "@/assets/images/mc_msg.png";
import sh_msg from "@/assets/images/sh_msg.png";
import del_msg from "@/assets/images/del_msg.png";
import cp_msg from "@/assets/images/cp_msg.png";
import download_msg from "@/assets/images/download_msg.png";
import add_msg from "@/assets/images/add_msg.png";
import { downloadFileUtil, events, im } from "../../../../../utils";
import CopyToClipboard from "react-copy-to-clipboard";
import { FORWARD_AND_MER_MSG, MUTIL_MSG, REPLAY_MSG, REVOKE_MSG, DELETE_MESSAGE } from "../../../../../constants/events";
import { useTranslation } from "react-i18next";
import { GroupRole, MessageItem, MessageType } from "../../../../../utils/open_im_sdk/types";
import { isFileDownloaded } from "../../../../../utils/im";
import { shallowEqual, useSelector } from "react-redux";
import { RootState } from "../../../../../store";

const canCpTypes = [MessageType.TEXTMESSAGE, MessageType.ATTEXTMESSAGE, MessageType.QUOTEMESSAGE];
const canDownloadTypes = [MessageType.PICTUREMESSAGE, MessageType.VIDEOMESSAGE, MessageType.FILEMESSAGE];
const canAddTypes = [MessageType.PICTUREMESSAGE, MessageType.FACEMESSAGE];
const canNotReplyTypes = [MessageType.MERGERMESSAGE,MessageType.CUSTOMMESSAGE,MessageType.QUOTEMESSAGE]

type MsgMenuProps = {
  visible: boolean;
  msg: MessageItem;
  isSelf: boolean;
  visibleChange: (v: boolean) => void;
};

const MsgMenu: FC<MsgMenuProps> = ({ visible, msg, isSelf, visibleChange, children }) => {
  const currentMember = useSelector((state: RootState) => state.contacts.currentMember, shallowEqual);
  const selfID = useSelector((state: RootState) => state.user.selfInfo.userID, shallowEqual);
  const { t } = useTranslation();
  // const canHiddenTypes = [t("Copy"), t("Translate"), t("Reply"), t("Forward")];
  const canHiddenTypes = [t("Copy"), t("Translate")];
  const privateMenus = [t("Copy"), t("Revoke")];

  const result = window.electron && isFileDownloaded(msg.clientMsgID);

  const forwardMsg = () => {
    events.emit(FORWARD_AND_MER_MSG, "forward", JSON.stringify(msg));
  };

  const mutilMsg = () => {
    events.emit(MUTIL_MSG, true);
  };

  const replayMsg = () => {
    events.emit(REPLAY_MSG, msg);
  };

  const revMsg = () => {
    im.newRevokeMessage(JSON.stringify(msg))
      .then((res) => events.emit(REVOKE_MSG, msg.clientMsgID))
      .catch((err) => message.error(t("RevokeMessageFailed")));
  };

  const delRemoteRecord = () => {
    im.deleteMessageFromLocalAndSvr(JSON.stringify(msg))
      .then((res) => {
        events.emit(DELETE_MESSAGE, msg.clientMsgID);
      })
      .catch((err) => message.error(t("DeleteMessageFailed")));
  };

  const downloadFile = () => {
    if (msg.downloadProgress !== undefined && msg.downloadProgress !== 100) return;
    const result = window.electron && isFileDownloaded(msg.clientMsgID);

    if (result) {
      window.electron.showInFinder(result);
      return;
    }
    let downloadUrl = "";
    let fileName = "";
    switch (msg.contentType) {
      case MessageType.PICTUREMESSAGE:
        downloadUrl = msg.pictureElem.sourcePicture.url;
        break;
      case MessageType.VIDEOMESSAGE:
        downloadUrl = msg.videoElem.videoUrl;
        break;
      case MessageType.FILEMESSAGE:
        downloadUrl = msg.fileElem.sourceUrl;
        fileName = msg.fileElem.fileName;
        break;
      default:
        break;
    }
    if (!fileName) {
      const idx = downloadUrl.lastIndexOf("/");
      fileName = downloadUrl.slice(idx + 1);
    }
    downloadFileUtil(downloadUrl, fileName, msg.clientMsgID);
  };

  const addMsg = () => {
    const userEmoji = JSON.parse(localStorage.getItem("userEmoji")!);
    const emojiObj = userEmoji.filter((item: any) => {
      return item.userID === String(selfID);
    });
    const otherUserEmoji = userEmoji.filter((item: any) => {
      return item.userID !== String(selfID);
    });
    if (msg.contentType === MessageType.PICTUREMESSAGE) {
      emojiObj[0].emoji = [
        {
          url: msg.pictureElem.sourcePicture.url,
          width: msg.pictureElem.sourcePicture.width,
          height: msg.pictureElem.sourcePicture.height,
        },
        ...emojiObj[0].emoji,
      ];
    } else {
      emojiObj[0].emoji = [JSON.parse(msg.faceElem.data), ...emojiObj[0].emoji];
    }

    const allUserEmoji = [
      {
        userID: String(selfID),
        emoji: emojiObj[0].emoji,
      },
      ...otherUserEmoji,
    ];
    localStorage.setItem("userEmoji", JSON.stringify(allUserEmoji));
    message.success(t("AddMsgSuccess"));
  };

  const menus = [
    // {
    //   title: t("Translate"),
    //   icon: ts_msg,
    //   method: () => {},
    //   hidden: false,
    // },
    {
      title: t("AddMsg"),
      icon: add_msg,
      method: addMsg,
      hidden: false,
    },
    {
      title: t("Forward"),
      icon: sh_msg,
      method: forwardMsg,
      hidden: false,
    },
    {
      title: t("Copy"),
      icon: cp_msg,
      method: () => {},
      hidden: false,
    },
    {
      title: t("Multiple"),
      icon: mc_msg,
      method: mutilMsg,
      hidden: false,
    },
    {
      title: t("Reply"),
      icon: re_msg,
      method: replayMsg,
      hidden: false,
    },
    {
      title: t("Revoke"),
      icon: rev_msg,
      method: revMsg,
      hidden: true,
    },
    {
      title: t("Delete"),
      icon: del_msg,
      method: delRemoteRecord,
      hidden: false,
    },
    {
      title: result ? t("Check") : t("Download"),
      icon: download_msg,
      method: downloadFile,
      hidden: false,
    },
  ];

  const switchMenu = (menu: typeof menus[0]) => {
    if (msg.attachedInfoElem.isPrivateChat) {
      menu.hidden = privateMenus.includes(menu.title) ? false : true;
    } else {
      if (!canCpTypes.includes(msg.contentType) && canHiddenTypes.includes(menu.title)) {
        menu.hidden = true;
      }

      if (menu.title === t("Reply") && canNotReplyTypes.includes(msg.contentType)){
        menu.hidden = true;
      }

      if (menu.title === t("Download") && !canDownloadTypes.includes(msg.contentType)) {
        menu.hidden = true;
      }

      if (menu.title === t("Revoke")) {
        const interval = (new Date().getTime() - msg.sendTime) / 60000;
        const selfFlag = isSelf && interval < 1440;
        if (msg.groupID) {
          if (selfFlag || (msg.groupID === currentMember?.groupID && currentMember?.roleLevel !== GroupRole.Nomal)) {
            menu.hidden = false;
          }
        } else {
          if (selfFlag) {
            menu.hidden = false;
          }
        }
      }

      if (menu.title === t("AddMsg") && !canAddTypes.includes(msg.contentType)) {
        menu.hidden = true;
      }
    }

    const getCopyText = () => {
      if (msg.contentType === MessageType.ATTEXTMESSAGE) {
        return msg.atElem.text;
      }
      if (msg.contentType === MessageType.QUOTEMESSAGE) {
        return msg.quoteElem.text;
      }
      return msg.content;
    };

    return menu.hidden ? null : menu.title === t("Copy") ? (
      <CopyToClipboard key={menu.title} onCopy={() => message.success("复制成功！")} text={getCopyText()}>
        <div onClick={menu.method} className="msg_menu_iem">
          <img src={menu.icon} />
          <span>{menu.title}</span>
        </div>
      </CopyToClipboard>
    ) : (
      <div key={menu.title} onClick={menu.method} className="msg_menu_iem">
        <img src={menu.icon} style={{ width: "12px", height: "12px" }} alt="" />
        <span>{menu.title}</span>
      </div>
    );
  };

  const PopContent = useMemo(() => {
    return <div onClick={() => visibleChange(false)}>{menus.map((m) => switchMenu(m))}</div>;
  }, [msg.sessionType, visible]);

  return (
    <>
      <Popover onVisibleChange={(v) => visibleChange(v)} overlayClassName="msg_item_menu" content={PopContent} title={null} trigger="contextMenu" visible={visible}>
        <div>{children}</div>
      </Popover>
    </>
  );
};

export default MsgMenu;
