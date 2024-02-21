import { CloseCircleFilled, CloseOutlined, SearchOutlined, DownOutlined } from "@ant-design/icons";
import { Button, Dropdown, Empty, Input, Layout, Modal, Menu, message } from "antd";
import { FC, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { base64toFile, contenteditableDivRange, events, im, isSingleCve, move2end, switchUpload } from "../../../../utils";
import { ADD_DROP_TEXT, AT_STATE_UPDATE, CUR_GROUPMEMBER_CHANGED, FORWARD_AND_MER_MSG, IS_SET_DRAFT, MUTIL_MSG, MUTIL_MSG_CHANGE, REPLAY_MSG } from "../../../../constants/events";
import { faceMap } from "../../../../constants/faceType";
import { useSelector, shallowEqual, useDispatch } from "react-redux";
import { RootState } from "../../../../store";
import { useTranslation } from "react-i18next";
import ContentEditable, { ContentEditableEvent } from "../../../../components/EdtableDiv";
import { useClickAway, useLatest, useWhyDidYouUpdate } from "ahooks";
import { ConversationItem, FriendItem, GroupMemberItem, GroupRole, GroupStatus, MessageItem, MessageType, SessionType } from "../../../../utils/open_im_sdk/types";
import { CustomEmojiType, FaceType } from "../../../../@types/open_im";
import { minioUploadType } from "../../../../api/admin";
import List from "rc-virtual-list";
import { t } from "i18next";
import CardMsgModal from "../../components/Modal/CardMsgModal";
import MyAvatar from "../../../../components/MyAvatar";
import MsgTypeBar from "./MsgTypeBar";
import { GroupTypes, TipsType } from "../../../../constants/messageContentType";
import { throttle } from "throttle-debounce";
import { getCurrentMember, getGroupMemberList, setCurrentMember } from "../../../../store/actions/contacts";

const { Footer } = Layout;

type CveFooterProps = {
  sendMsg: (nMsg: string, type: MessageType) => void;
  curCve: ConversationItem;
};

type AtItem = {
  id: string;
  name: string;
  tag: string;
};

const CveFooter: FC<CveFooterProps> = ({ sendMsg, curCve }) => {
  const inputRef = useRef<any>(null);
  const [msgContent, setMsgContent] = useState<string>("");
  const latestContent = useLatest(msgContent);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const sendFlag = useRef(false);
  // const [flag, setFlag] = useState(false);
  // const latestFlag = useLatest(flag);
  const [replyMsg, setReplyMsg] = useState<MessageItem>();
  const [mutilSelect, setMutilSelect] = useState(false);
  const [crardSeVis, setCrardSeVis] = useState(false);
  const [atListState, setAtListState] = useState({
    visible: false,
    // matchList: [] as GroupMemberItem[],
  });
  const latestAtState = useLatest(atListState);
  const [mutilMsg, setMutilMsg] = useState<MessageItem[]>([]);
  const latestMutilMsg = useLatest(mutilMsg);
  const [atList, setAtList] = useState<AtItem[]>([]);
  const latestAtList = useLatest(atList);
  const blackList = useSelector((state: RootState) => state.contacts.blackList, shallowEqual);
  const groupInfo = useSelector((state: RootState) => state.contacts.groupInfo, shallowEqual) ?? {};
  const groupList = useSelector((state: RootState) => state.contacts.groupList, shallowEqual);
  const selfID = useSelector((state: RootState) => state.user.selfInfo.userID, shallowEqual);
  const currentMember = useSelector((state: RootState) => state.contacts.currentMember, shallowEqual);
  const robots = useSelector((state: RootState) => state.user.appConfig.robots, shallowEqual) || [];
  const { t, i18n } = useTranslation();
  const suffixRef = useRef<any>(null);
  const throttleFlag = useRef(true);
  const [sendMethod, setSendMethod] = useState(localStorage.getItem("IMSendMethod") ?? "enter");
  const latestSendMethod = useLatest(sendMethod);

  const latestCve = useLatest(curCve)

  const dispatch = useDispatch();

  const isInGroup = useMemo(() => groupList.find((group) => group.groupID === curCve.groupID), [curCve.groupID, groupList]);

  useClickAway(
    () => {
      if (atListState.visible) {
        setAtListState({ visible: false });
      }
    },
    () => document.getElementsByClassName("atuser_container")[0]
  );

  useEffect(() => {
    events.on(REPLAY_MSG, replyHandler);
    events.on(MUTIL_MSG, mutilHandler);
    events.on(AT_STATE_UPDATE, atHandler);
    events.on(IS_SET_DRAFT, setDraft);
    events.on(ADD_DROP_TEXT, dropTextHandler);
    events.on(CUR_GROUPMEMBER_CHANGED, memberChangedHandler);
    window.electron && window.electron.addIpcRendererListener("ScreenshotData", screenshotHandler, "screenshotListener");
    return () => {
      events.off(REPLAY_MSG, replyHandler);
      events.off(MUTIL_MSG, mutilHandler);
      events.off(AT_STATE_UPDATE, atHandler);
      events.off(IS_SET_DRAFT, setDraft);
      events.off(ADD_DROP_TEXT, dropTextHandler);
      events.off(CUR_GROUPMEMBER_CHANGED, memberChangedHandler);
      window.electron && window.electron.removeIpcRendererListener("screenshotListener");
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    events.on(MUTIL_MSG_CHANGE, mutilMsgChangeHandler);
    return () => {
      events.off(MUTIL_MSG_CHANGE, mutilMsgChangeHandler);
    };
  }, [mutilMsg]);

  useEffect(() => {
    if (latestAtList.current.length > 0) {
      setAtList([]);
    }
    if (curCve.draftText !== "") {
      parseDrft(curCve.draftText);
    } else {
      setMsgContent("");
    }
    if (latestMutilMsg.current.length > 0) {
      setMutilMsg([]);
    }
    return () => {
      // setDraft(curCve);
      reSet();
    };
  }, [curCve.conversationID]);

  useEffect(() => {
    if (isInGroup) {
      dispatch(getCurrentMember(curCve.groupID, selfID));
    }
  }, [curCve.groupID, groupList]);

  const memberChangedHandler = (member: GroupMemberItem) => {
    if (member.userID === selfID) {
      dispatch(setCurrentMember(member));
    }
  };

  const blobToDataURL = (blob: File, cb: (base64: string) => void) => {
    let reader = new FileReader();
    reader.onload = function (evt) {
      let base64 = evt.target?.result;
      cb(base64 as string);
    };
    reader.readAsDataURL(blob);
  };

  const textInit = async (e: any) => {
    const clp = (e.originalEvent || e).clipboardData;
    // if (clp && clp.items[0].type.indexOf("image") === -1) {
    if (clp && clp.items[0].type.indexOf("text/plain") !== -1) {
      e.preventDefault();
      const text = clp.getData("text/plain") || "";
      const selection = window.getSelection();
      const start = selection?.anchorOffset;
      const end = selection?.focusOffset;
      const selectedText = selection?.toString();
      let content = "";
      if (start! < end!) {
        content = latestContent.current.slice(0, start) + text + latestContent.current.slice(end);
      } else {
        content = latestContent.current.slice(0, end) + text + latestContent.current.slice(start);
      }
      if (selectedText === latestContent.current) {
        content = text;
      }
      setMsgContent(content);
      // document.execCommand("insertText", false, text);
    } else if (clp && clp.items[0].type.indexOf("image") > -1) {
      e.preventDefault();
      const file = clp.items[0].getAsFile();
      blobToDataURL(file, (base64) => {
        let img = `<img class="screenshot_el" src="${base64}" alt="" >`;
        document.execCommand("insertHTML", false, img);
      });
    } else if (clp && clp.items[0]) {
      e.preventDefault();
      const file = clp.items[0].getAsFile();
      Modal.confirm({
        title: "发送文件",
        content: `确认发送文件[${file.name}]给${curCve.showName}?`,
        okText: "确认",
        cancelText: "取消",
        onOk: () => {
          suffixRef.current.copy2Send(file);
        },
      });
    }
  };

  const screenshotHandler = (ev: any, base64: string) => {
    let img = `<img class="screenshot_el" src="${base64}" alt="">`;
    setMsgContent(latestContent.current + img);
    move2end(inputRef.current!.el);
  };

  const reParseEmojiFace = (text: string) => {
    faceMap.map((f) => {
      const idx = text.indexOf(f.context);
      if (idx > -1) {
        const faceStr = `<img class="face_el" alt="${f.context}" style="padding-right:2px" width="24px" src="${f.src}">`;
        text = text.replaceAll(f.context, faceStr);
      }
    });
    return text;
  };

  const reParseAt = () => {
    const atels = [...document.getElementsByClassName("at_el")];
    let tmpAts: any = [];
    atels.map((at) => tmpAts.push({ id: at.attributes.getNamedItem("data_id")?.value, name: at.attributes.getNamedItem("data_name")?.value, tag: at.outerHTML }));
    setAtList(tmpAts);
  };

  const parseDrft = (text: string) => {
    reParseAt();
    setMsgContent(reParseEmojiFace(text));
  };

  const atHandler = (id: string, name: string, needDelete = false) => {
    if (replyMsg) {
      setReplyMsg(undefined);
    }
    if (latestAtList.current.findIndex((au) => au.id === id) === -1) {
      const tag = `<b class="at_el" data_id="${id}" data_name="${name}" contenteditable="false" style="color:#428be5"> @${name}</b>`;
      setAtList([...latestAtList.current, { id, name, tag }]);
      setMsgContent((needDelete ? latestContent.current.slice(0, -1) : latestContent.current) + tag);
      move2end(inputRef.current!.el);
    }
  };

  const mutilHandler = (flag: boolean) => {
    setMutilSelect(flag);
  };

  const mutilMsgChangeHandler = (checked: boolean, msg: MessageItem) => {
    let tms = [...mutilMsg];
    if (checked) {
      tms = [...tms, msg];
    } else {
      const idx = tms.findIndex((t) => t.clientMsgID === msg.clientMsgID);
      tms.splice(idx, 1);
    }
    setMutilMsg(tms);
  };

  const replyHandler = (msg: MessageItem) => {
    setReplyMsg(msg);
  };

  const parseImg = (text: string) => {
    const pattern = /\<img.*?\">/g;
    const patternArr = text.match(pattern);
    if (patternArr && patternArr.length > 0) {
      patternArr.map((img) => {
        text = text.replaceAll(img, "");
      });
    }

    return text;
  };

  const setDraft = (cve: ConversationItem) => {
    if (cve.draftText !== "" || latestContent.current.trim() !== "") {
      let text = latestContent.current;
      text = parseEmojiFace(text);
      // text = parseImg(text).text;
      const option = {
        conversationID: cve.conversationID,
        // draftText: latestAtList.current.length > 0 ? parseAt(text) : text,
        draftText: text,
      };

      im.setConversationDraft(option)
        .then((res) => {})
        .catch((err) => {})
        .finally(() => {
          // setMsgContent("")
        });
    }
  };

  const dropTextHandler = (text: string) => {
    setMsgContent(latestContent.current + text);
  };

  const parseMsg = (msg: MessageItem) => {
    switch (msg.contentType) {
      case MessageType.TEXTMESSAGE:
        return msg.content;
      case MessageType.ATTEXTMESSAGE:
        let mstr = msg.atElem.text;
        const pattern = /@\S+\s/g;
        const arr = mstr.match(pattern);
        const idkey = "atUserID";
        const namekey = "groupNickname";
        const searchList = msg.atElem.atUsersInfo;
        arr?.map((a) => {
          //@ts-ignore
          const member = searchList.find((gm: any) => gm[idkey] === a.slice(1, -1));
          mstr = mstr.replaceAll(a, member ? member[namekey] : a);
        });
        return mstr;
      case MessageType.PICTUREMESSAGE:
        return t("PictureMessage");
      case MessageType.VIDEOMESSAGE:
        return t("VideoMessage");
      case MessageType.VOICEMESSAGE:
        return t("VoiceMessage");
      case MessageType.LOCATIONMESSAGE:
        return t("LocationMessage");
      case MessageType.MERGERMESSAGE:
        return t("MergeMessage");
      case MessageType.FILEMESSAGE:
        return t("FileMessage");
      case MessageType.QUOTEMESSAGE:
        return t("QuoteMessage");
      case MessageType.FACEMESSAGE:
        return t("FaceMessage");
      case MessageType.CARDMESSAGE:
        return t("CardMessage");
      default:
        return t("CustomMessage");
    }
  };

  const quoteMsg = async (text: string) => {
    im.createQuoteMessage({ text, message: JSON.stringify(replyMsg) })
      .then(({ data }) => {
        sendMsg(data, MessageType.QUOTEMESSAGE);
        reSet();
      })
      .catch(() => (sendFlag.current = false));
  };

  const isEmptyWords = (text = latestContent.current) => {
    const emptyWords = ["", "\n", "\n\n"];
    text = parseBr(text);
    return emptyWords.includes(text.trim());
  };

  const ReplyPrefix = useMemo(
    () =>
      replyMsg ? (
        <div className="reply">
          <CloseCircleFilled onClick={() => setReplyMsg(undefined)} />
          <div className="reply_text">
            {t("Reply")} <span>{replyMsg?.senderNickname}:</span> {parseMsg(replyMsg!)}
          </div>
        </div>
      ) : null,
    [replyMsg]
  );

  const switchMessage = async (type: string) => {
    let text = latestContent.current;
    text = parseImg(parseEmojiFace(text));
    await forEachImgMsg();

    const emptyWords = ["", "\n", "\n\n"];
    if (isEmptyWords(text)) {
      sendFlag.current = false;
      return;
    }
    switch (type) {
      case "text":
        sendTextMsg(text);
        break;
      case "at":
        sendAtTextMsg(parseAt(text));
        break;
      case "quote":
        quoteMsg(text);
        break;
      default:
        break;
    }
  };

  const reSet = () => {
    setMsgContent("");
    setReplyMsg(undefined);
    setAtList([]);
    sendFlag.current = false;
    setDraft(curCve);
    setMutilSelect(false);
  };

  const faceClick = useCallback(async (face: typeof faceMap[0] | CustomEmojiType, type: FaceType) => {
    if (type === "emoji") {
      const faceEl = `<img class="face_el" alt="${(face as typeof faceMap[0]).context}" style="padding-right:2px" width="24px" src="${(face as typeof faceMap[0]).src}">`;
      move2end(inputRef.current!.el);
      setMsgContent(latestContent.current + faceEl);
    } else {
      // console.log(face)
      const { data } = await im.createFaceMessage({ index: 1, data: JSON.stringify(face) });
      sendMsg(data, MessageType.FACEMESSAGE);
    }
  }, []);

  const parseAt = (text: string) => {
    latestAtList.current.map((at) => {
      text = text.replaceAll(at.tag, `@${at.id} `);
    });
    return text;
  };

  const parseEmojiFace = (text: string) => {
    const faceEls = [...document.getElementsByClassName("face_el")] as HTMLImageElement[];
    if (faceEls.length > 0) {
      faceEls.map((face) => {
        text = text.replaceAll(face.outerHTML, face.alt);
      });
    }
    return text;
  };

  const forEachImgMsg = () => {
    return new Promise<void>((resolve, reject) => {
      const screenshotEls = [...document.getElementsByClassName("screenshot_el")] as HTMLImageElement[];
      if (screenshotEls.length > 0) {
        screenshotEls[screenshotEls.length - 1].alt = "last";
        screenshotEls.forEach(async (snel) => {
          const item = base64toFile(snel.src);
          const {
            data: { URL },
          } = await switchUpload(item as any, minioUploadType.file, true);
          await suffixRef.current.sendImageMsg(item, URL);
          if (snel.alt === "last") {
            reSet();
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  };

  const parseBr = (mstr: string) => {
    if (mstr.slice(-4) === "<br>") {
      mstr = mstr.slice(0, -4);
    }
    mstr = mstr.replaceAll("<br>", "\n");
    return mstr;
  };

  const sendTextMsg = async (text: string) => {
    im.createTextMessage(text)
      .then(({ data }) => {
        sendMsg(data, MessageType.TEXTMESSAGE);
        reSet();
      })
      .catch((err) => {
        console.log(err);
        sendFlag.current = false;
      });
  };

  const sendAtTextMsg = async (text: string) => {
    const options = {
      text,
      atUserIDList: latestAtList.current.map((user) => user.id),
      atUsersInfo: latestAtList.current.map((user) => ({ atUserID: user.id, groupNickname: user.name })),
      message: "",
    };
    im.createTextAtMessage(options)
      .then(({ data }) => {
        sendMsg(data, MessageType.ATTEXTMESSAGE);
        reSet();
      })
      .catch(() => (sendFlag.current = false));
  };

  const typing = () => {
    if (isSingleCve(curCve)) {
      if (!throttleFlag.current) return;
      throttleFlag.current = false;
      timer.current = setTimeout(() => {
        updateTypeing(curCve.userID, "yes");
        throttleFlag.current = true;
      }, 1000);
    }
  };

  const updateTypeing = (recvID: string, msgTip: string) => {
    im.typingStatusUpdate({ recvID, msgTip });
  };

  const keyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const ctrlEnterRule = e.key === "Enter" && e.ctrlKey;
    const enterRule = e.key === "Enter" && !e.ctrlKey && e.keyCode !== 229;
    
    if (latestSendMethod.current === "ctrlenter" ? enterRule : ctrlEnterRule) {
      e.preventDefault();
      contenteditableDivRange();
      move2end(inputRef.current!.el);
    }
    if (latestSendMethod.current === "ctrlenter" ? ctrlEnterRule : enterRule) {
      e.preventDefault();
      enterSend();
    }
    if (e.code === "Digit2" && e.shiftKey && GroupTypes.includes(curCve.conversationType)) {
      setAtListState({
        visible: true,
        // matchList: groupMemberList,
      });
    }

    if (e.key === "Backspace") {
      // const idx = getInputIdx();
      const idx = latestContent.current.length;
      const lastOneWorld = latestContent.current[idx - 1];
      const lasTwoWorld = latestContent.current[idx - 2];
      if (lastOneWorld === "@" && lasTwoWorld !== "@" && atListState.visible) {
        setAtListState({
          visible: false,
          // matchList: [],
        });
      }
    }
  };


  const robotWaitCheck = () => {
    if(!robots.includes(latestCve.current.userID)){
      return false
    }
    let message: MessageItem | undefined = undefined;
    try {
      message = JSON.parse(latestCve.current.latestMsg);
    } catch (error) {}
    if (!message || TipsType.includes(message.contentType)) {
      return false;
    }

    const isRobotMsg = robots.includes(message.sendID);
    const gapTime = Date.now() - message.sendTime;
    const isTimeout = gapTime >= 60000;
    if (!isRobotMsg && !isTimeout) {
      return true;
    } else {
      return false;
    }
  };

  const enterSend = () => {
    if (robotWaitCheck()){
      message.info('等待回复中...')
      return;
    }
    if (latestContent.current && !sendFlag.current) {
      sendFlag.current = true;
      switchMessage(replyMsg ? "quote" : latestAtList.current.length > 0 ? "at" : "text");
    }
  };

  const getInputIdx = () => window.getSelection()?.getRangeAt(0).startOffset ?? 0;

  const cancelMutil = () => {
    setMutilMsg([]);
    events.emit(MUTIL_MSG, false);
  };

  const selectRec = async () => {
    if (mutilMsg.length === 0) return;

    let title = "";
    if (isSingleCve(curCve)) {
      title = i18n.language === "zh-cn" ? t("With") + curCve.showName + t("ChatRecord") : t("ChatRecord") + t("With") + curCve.showName;
    } else {
      title = i18n.language === "zh-cn" ? t("GroupChat") + curCve.showName + t("ChatRecord") : t("ChatRecord") + t("In") + curCve.showName;
    }
    const sortedMsg = mutilMsg.sort((a, b) => a.sendTime - b.sendTime);

    let tmm: string[] = [];
    const tmpArr = sortedMsg.length > 5 ? sortedMsg.slice(0, 4) : sortedMsg;
    tmpArr.map((m) => tmm.push(`${m.senderNickname}：${parseMsg(m)}`));

    const options = {
      messageList: [...sortedMsg],
      title,
      summaryList: tmm,
    };

    events.emit(FORWARD_AND_MER_MSG, "merge", JSON.stringify(options));
  };

  const close = useCallback(() => {
    setCrardSeVis(false);
  }, []);

  const sendCardMsg = useCallback(async (sf: FriendItem) => {
    const { data } = await im.createCardMessage(JSON.stringify(sf));
    sendMsg(data, MessageType.CARDMESSAGE);
  }, []);

  const choseCard = useCallback(() => {
    setCrardSeVis(true);
  }, []);

  const MutilAction = () => (
    <div className="footer_mutil">
      <CloseOutlined onClick={cancelMutil} />
      <Button onClick={selectRec} type="primary" shape="round">
        {t("MergerAndForward")}
      </Button>
    </div>
  );

  const switchMask = useMemo(() => {
    const now = parseInt(Date.now() / 1000 + "");
    if (blackList.find((black) => black.userID === curCve.userID)) {
      return "对方已被拉入黑名单";
    }
    if (groupInfo?.groupID !== curCve?.groupID) return undefined;

    if (!isInGroup) {
      return "你已不在该群";
    } else if (currentMember) {
      if (groupInfo?.status === GroupStatus.Muted && currentMember.roleLevel === GroupRole.Nomal) {
        return "群主或管理员开启了全体禁言";
      } else if (now < currentMember.muteEndTime) {
        return "你已被禁言";
      }
    }
    return undefined;
  }, [groupInfo?.groupID, groupInfo?.status, currentMember?.userID, currentMember?.muteEndTime, currentMember.roleLevel, curCve?.groupID, curCve?.userID, blackList]);

  const onChange = (e: ContentEditableEvent) => {
    setMsgContent(e.target.value);
    reParseAt();
    typing();
  };

  const clickAtItem = (member: GroupMemberItem) => {
    atHandler(member.userID, member.nickname, true);
    setAtListState({ visible: false });
  };

  const onContextMenu = () => {
    window.electron?.inputContextMenu();
  };

  const menu = (
    <Menu
      onClick={({ key }) => {
        setSendMethod(key);
        localStorage.setItem("IMSendMethod", key);
      }}
      className="send_method_select"
      selectedKeys={[latestSendMethod.current]}
    >
      <Menu.Item key="enter">enter</Menu.Item>
      <Menu.Item key="ctrlenter">ctrl + enter</Menu.Item>
    </Menu>
  );

  return (
    <Footer className="chat_footer">
      {mutilSelect ? (
        <MutilAction />
      ) : (
        <div style={{ position: "relative" }}>
          <MsgTypeBar disabled={switchMask !== undefined} ref={suffixRef} choseCard={choseCard} faceClick={faceClick} sendMsg={sendMsg} />
          <Dropdown
            destroyPopupOnHide
            visible={latestAtState.current.visible}
            overlayClassName="msg_at_drop"
            overlay={<AtList role={currentMember?.roleLevel} clickAtItem={clickAtItem} />}
            placement="top"
            arrow
          >
            <ContentEditable
              className="input_div"
              style={{ paddingTop: replyMsg ? "24px" : "4px" }}
              placeholder={switchMask ? switchMask : `${t("SendTo")} ${curCve.showName.length > 20 ? curCve.showName.slice(0, 7) + "..." : curCve.showName}`}
              ref={inputRef}
              limit={switchMask}
              html={latestContent.current}
              onChange={onChange}
              onKeyDown={keyDown}
              onPaste={textInit}
              onContextMenu={onContextMenu}
            />
          </Dropdown>
          <Dropdown.Button
            buttonsRender={() => {
              return [
                <Button disabled={switchMask !== undefined || isEmptyWords()} onClick={enterSend} type="primary">
                  发送
                </Button>,
                <Button icon={<DownOutlined />} type="primary" />,
              ];
            }}
            trigger={["click"]}
            className="send_btn"
            type="primary"
            size="small"
            overlay={menu}
          ></Dropdown.Button>

          {ReplyPrefix}
        </div>
      )}
      {crardSeVis && <CardMsgModal cb={sendCardMsg} visible={crardSeVis} close={close} />}
    </Footer>
  );
};

// export default memo(
//   CveFooter,
//   (p, n) =>
//     ((p.curCve.userID !== "" && p.curCve.userID === n.curCve.userID) || (p.curCve.groupID !== "" && p.curCve.groupID === n.curCve.groupID)) &&
//     p.curCve.conversationType === n.curCve.conversationType &&
//     p.curCve.showName === n.curCve.showName &&
//     p.curCve.isNotInGroup === n.curCve.isNotInGroup
// );

export default memo(CveFooter, (p, n) => p.curCve.conversationID === n.curCve.conversationID && p.curCve.showName === n.curCve.showName && p.curCve.latestMsg === n.curCve.latestMsg);

const AtList = memo(({ role, clickAtItem }: { role?: GroupRole; clickAtItem: (member: GroupMemberItem) => void }) => {
  const groupMemberList = useSelector((state: RootState) => state.contacts.groupMemberList, shallowEqual);
  const groupMemberState = useSelector((state: RootState) => state.contacts.groupMemberLoading, shallowEqual);
  const [renderList, setRenderList] = useState(groupMemberList);
  const [searchStr, setSearchStr] = useState("");
  const dispatch = useDispatch();
  const searchOffset = useRef({
    loading: false,
    hasMore: true,
  });

  useEffect(() => {
    if (!searchStr) {
      setRenderList([...groupMemberList]);
    }
  }, [groupMemberList]);

  const inputChange = (value: string) => {
    setSearchStr(value);
    if (!value) {
      setRenderList([...groupMemberList]);
      return;
    }
    getSearchMember(value);
  };

  const getSearchMember = (value?: string) => {
    searchOffset.current.loading = true;
    const options = {
      groupID: groupMemberList[0].groupID,
      keywordList: [value ?? searchStr],
      isSearchUserID: false,
      isSearchMemberNickname: true,
      offset: value ? 0 : renderList.length,
      count: 50,
    };
    im.searchGroupMembers(options).then(({ data }) => {
      const prelist = value ? [] : [...renderList];
      const newlist = JSON.parse(data);
      setRenderList([...prelist, ...newlist]);
      searchOffset.current.loading = false;
      searchOffset.current.hasMore = newlist.length === 50;
    });
  };

  const clickMember = (member: GroupMemberItem) => {
    clickAtItem(member);
    // resetState();
  };

  const clickAtAll = () => {
    const item = {
      userID: "AtAllTag",
      nickname: "所有人",
    };
    clickAtItem(item as GroupMemberItem);
  };

  const onScroll = (e: any) => {
    const memberShouldScroll = !groupMemberState.loading && groupMemberState.hasMore;
    const searchShouldScroll = !searchOffset.current.loading && searchOffset.current.hasMore;
    const holdHeight = role && role !== GroupRole.Nomal ? 266 : 296;
    if ((searchStr ? searchShouldScroll : memberShouldScroll) && e.target.scrollHeight - holdHeight < e.target.scrollTop) {
      if (searchStr) {
        getSearchMember();
        return;
      }
      const options = {
        groupID: groupMemberList[0].groupID,
        offset: groupMemberList.length,
        filter: 0,
        count: 50,
      };
      dispatch(getGroupMemberList(options, [...groupMemberList]));
    }
  };

  const throttleScroll = throttle(250, onScroll);

  return (
    <div style={{ boxShadow: "0px 4px 25px rgb(0 0 0 / 16%)" }} className="atuser_container">
      <div className="at_search">
        <Input value={searchStr} onChange={(e) => inputChange(e.target.value)} allowClear placeholder={t("Search")} prefix={<SearchOutlined />} />
      </div>
      {role && role !== GroupRole.Nomal && (
        <div className="atuser_item" onClick={clickAtAll}>
          所有人
        </div>
      )}
      {renderList.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无匹配结果" />
      ) : (
        <List
          height={role && role !== GroupRole.Nomal ? 206 : 236}
          data={renderList}
          itemHeight={32}
          itemKey="userID"
          onScroll={throttleScroll}
          children={(item, idx) => (
            <div onClick={() => clickMember(item)} key={item.userID} className="atuser_item">
              <MyAvatar src={item.faceURL} size={24} />
              <span>{item.nickname}</span>
            </div>
          )}
        />
      )}
    </div>
  );
});
