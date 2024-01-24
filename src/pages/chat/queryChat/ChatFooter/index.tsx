import {
  useClickAway,
  useDebounceFn,
  useKeyPress,
  useLatest,
  useRequest,
  useThrottleFn,
} from "ahooks";
import { Button, Image, Popover, Spin } from "antd";
import clsx from "clsx";
import {
  forwardRef,
  ForwardRefRenderFunction,
  memo,
  RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useParams } from "react-router-dom";

import cricle_cancel from "@/assets/images/chatFooter/cricle_cancel.png";
import EditableDiv, {
  deleteBeforeAt,
  EditableDivEvent,
  insertAtCursor,
} from "@/components/EditableDiv";
import OIMAvatar from "@/components/OIMAvatar";
import { useCurrentMemberRole } from "@/hooks/useCurrentMemberRole";
import { IMSDK } from "@/layout/MainContentWrap";
import { ExMessageItem, useConversationStore, useMessageStore } from "@/store";
import { base64toFile, getExtraStr } from "@/utils/common";
import { formatMessageByType } from "@/utils/imCommon";
import { GroupMemberItem } from "@/utils/open-im-sdk-wasm/types/entity";

import styles from "./chat-footer.module.scss";
import SendActionBar from "./SendActionBar";
import { useFileMessage } from "./SendActionBar/useFileMessage";
import { useSendMessage } from "./useSendMessage";

const ChatFooter = () => {
  const [html, setHtml] = useState("");
  const [atPanelState, setAtPanelState] = useState({
    visible: false,
    originStr: "",
  });
  const latestPanelState = useLatest(atPanelState);
  const latestHtml = useLatest(html);
  const { conversationID } = useParams();

  const editableDivRef = useRef<{ el: RefObject<HTMLDivElement> }>(null);
  const atPanelRef = useRef<AtSearchPanelHandle>(null);
  const quoteMessage = useConversationStore((state) => state.quoteMessage);
  const latestQuoteMessage = useLatest(quoteMessage);
  const updateQuoteMessage = useConversationStore((state) => state.updateQuoteMessage);

  const { createFileMessage } = useFileMessage();
  const { sendMessage } = useSendMessage();

  const drft = useRef("");

  useEffect(() => {
    window.editRevoke = (clientMsgID: string) => {
      const item = useConversationStore.getState().revokeMap[clientMsgID];
      updateQuoteMessage(item.quoteMessage);
      setHtml(item.text);
      drft.current = item.text;
      editableDivRef.current?.el.current?.focus();
    };
  }, []);

  useEffect(() => {
    window.editRevoke = (clientMsgID: string) => {
      const item = useConversationStore.getState().revokeMap[clientMsgID];
      updateQuoteMessage(item.quoteMessage);
      setHtml(item.text);
      editableDivRef.current?.el.current?.focus();
    };
  }, []);

  useEffect(() => {
    if (quoteMessage) {
      editableDivRef.current?.el.current?.focus();
    }
  }, [quoteMessage]);

  useEffect(() => {
    const oldDraftText = useConversationStore.getState().currentConversation?.draftText;
    editableDivRef.current?.el.current?.focus();
    checkSavedDraft(oldDraftText);
    return () => {
      checkDraftSave(drft.current, oldDraftText);
    };
  }, [conversationID]);

  const checkSavedDraft = (draftText?: string) => {
    setHtml(draftText ?? "");
    drft.current = draftText ?? "";
  };

  const checkDraftSave = (html: string, oldDraftText?: string) => {
    let cleanText = html;
    const atEls = getAtList();

    if (atEls.length > 0) {
      atEls.map((el) => (cleanText = cleanText.replace(el.tag, `@${el.userID} `)));
      const pattern = /@\S+\s/g;
      const arr = cleanText.match(pattern);
      arr?.map((item) => {
        const member = atEls.find((el) => el.userID === item.slice(1, -1));
        if (member) {
          const reg = new RegExp(item, "g");
          cleanText = cleanText.replace(
            reg,
            `<b class="at-el" contenteditable="false" data-id="${member.userID}" data-name="${member.nickname}">@${member.nickname} </b>`,
          );
        }
      });
    } else {
      cleanText = getCleanText(html);
    }
    if (!conversationID) return;
    if ((cleanText && cleanText !== oldDraftText) || (!cleanText && oldDraftText)) {
      IMSDK.setConversationDraft({
        conversationID,
        draftText: cleanText,
      });
    }
  };

  const updateTyping = () => {
    const currentUserID = useConversationStore.getState().currentConversation?.userID;
    if (!currentUserID) return;
    IMSDK.typingStatusUpdate({
      recvID: currentUserID,
      msgTip: "yes",
    });
  };

  const { run: throttleTyping } = useThrottleFn(updateTyping, { wait: 1500 });

  const { run: debounceSearch } = useDebounceFn(
    (keyword: string) => {
      if (!latestPanelState.current.visible) return;
      const originStr = latestPanelState.current.originStr;
      const searKeyword = getExtraStr(originStr, keyword);
      if (!searKeyword) return;
      atPanelRef.current?.searchMember(searKeyword);
    },
    { wait: 500 },
  );

  const closeAtPanel = () => {
    setAtPanelState({
      visible: false,
      originStr: "",
    });
  };

  const onChange = (e: EditableDivEvent) => {
    setHtml(e.target.value);
    drft.current = e.target.value;
    debounceSearch(e.target.value);
    throttleTyping();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.keyCode === 90) {
      e.preventDefault();
      return;
    }

    if (
      (e.key === "ArrowUp" || e.key === "ArrowDown") &&
      latestPanelState.current.visible
    ) {
      e.preventDefault();
    }

    if (
      (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
      latestPanelState.current.visible
    ) {
      closeAtPanel();
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (latestPanelState.current.visible) return;

      enterToSend();
    }

    if (
      e.code === "Digit2" &&
      e.shiftKey &&
      useConversationStore.getState().currentConversation?.groupID &&
      !latestPanelState.current.visible
    ) {
      setTimeout(() => atPanelRef.current?.searchMember(""), 200);
      setAtPanelState({
        visible: true,
        originStr: latestHtml.current,
      });
    }

    if (e.key === "Backspace") {
      const idx = latestHtml.current.length;
      const lastOneWorld = latestHtml.current[idx - 1];
      const lasTwoWorld = latestHtml.current[idx - 2];
      if (
        lastOneWorld === "@" &&
        lasTwoWorld !== "@" &&
        latestPanelState.current.visible
      ) {
        closeAtPanel();
      }
    }
  };

  const getImageEl = () => {
    const imageEls = [...document.querySelectorAll(".image-el")] as HTMLImageElement[];
    imageEls.map(async (el) => {
      const file = base64toFile(el.src);
      const message = await createFileMessage(file);
      sendMessage({
        message,
      });
    });
  };

  const getAtList = () => {
    const editableDiv = document.getElementById("editable-div");
    if (!editableDiv) return [];

    const atels = Array.from(editableDiv.querySelectorAll(".at-el"));
    return atels.map((at) => ({
      userID: at.attributes.getNamedItem("data-id")!.value,
      nickname: at.attributes.getNamedItem("data-name")!.value,
      tag: at.outerHTML,
    }));
  };

  const replaceEmoji2Str = (text: string) => {
    const editableDiv = document.getElementById("editable-div");
    if (!editableDiv) return text;

    const emojiEls: HTMLImageElement[] = Array.from(
      editableDiv.querySelectorAll(".emoji-inline"),
    );
    emojiEls.map((face) => {
      // @ts-ignore
      const escapedOut = face.outerHTML.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      text = text.replace(new RegExp(escapedOut, "g"), face.alt);
    });
    return text;
  };

  const getCleanText = (html: string) => {
    html = replaceEmoji2Str(html);
    const regWithoutHtml = /(<([^>]+)>)/gi;
    return html.replace(regWithoutHtml, "");
  };

  const getTextMessage = async (cleanText: string) => {
    const atEls = getAtList();

    if (
      useConversationStore.getState().currentConversation?.groupID &&
      atEls.length > 0
    ) {
      let formatAtText = latestHtml.current;
      atEls.map(
        (el) => (formatAtText = formatAtText.replace(el.tag, `@${el.userID} `)),
      );
      return (
        await IMSDK.createTextAtMessage<ExMessageItem>({
          text: getCleanText(formatAtText),
          atUserIDList: atEls.map((at) => at.userID),
          atUsersInfo: atEls.map((at) => ({
            atUserID: at.userID,
            groupNickname: at.nickname,
          })),
          message: latestQuoteMessage.current,
        })
      ).data;
    }
    if (latestQuoteMessage.current) {
      return (
        await IMSDK.createQuoteMessage<ExMessageItem>({
          text: cleanText,
          message: JSON.stringify(latestQuoteMessage.current),
        })
      ).data;
    }

    return (await IMSDK.createTextMessage<ExMessageItem>(cleanText)).data;
  };

  const enterToSend = async () => {
    const cleanText = getCleanText(latestHtml.current);
    getImageEl();
    const message = await getTextMessage(cleanText);
    setHtml("");
    drft.current = "";
    if (!cleanText) return;

    sendMessage({ message });
    if (latestQuoteMessage.current) {
      updateQuoteMessage();
    }
  };

  const atHandler = (atUser: GroupMemberItem) => {
    const el = document.createElement("b");
    el.setAttribute("class", "at-el");
    el.setAttribute("contenteditable", "false");
    el.setAttribute("data-id", atUser.userID);
    el.setAttribute("data-name", atUser.nickname);
    el.innerText = `@${atUser.nickname} `;

    deleteBeforeAt();
    insertAtCursor([el]);
    if (latestPanelState.current.visible) {
      setTimeout(() => {
        closeAtPanel();
        insertAtCursor([document.createTextNode("")]);
        updateHtml();
      }, 200);
    }
  };

  const updateHtml = useCallback(() => {
    // @ts-ignore
    editableDivRef.current?.emitChange();
  }, []);

  return (
    <footer className="relative max-h-[30vh] min-h-[25vh] rotate-180 bg-white py-px">
      <div className="absolute bottom-0 left-0 right-0 top-0 z-10 flex rotate-180 flex-col border-t border-t-[var(--gap-text)]">
        <SendActionBar
          updateHtml={updateHtml}
          sendMessage={sendMessage}
          createFileMessage={createFileMessage}
        />
        <Popover
          overlayClassName="conversation-popover"
          placement="topLeft"
          title={null}
          arrow={false}
          open={atPanelState.visible}
          destroyTooltipOnHide
          content={
            <ForwardAtSearchPanel
              ref={atPanelRef}
              closePanel={closeAtPanel}
              atHandler={atHandler}
            />
          }
        >
          <div className="relative flex flex-1 flex-col overflow-y-auto">
            {quoteMessage && (
              <div className="mx-5.5 mt-3 flex w-fit items-start rounded-md bg-[var(--chat-bubble)] px-2.5 py-2">
                <img
                  className="mt-px cursor-pointer"
                  width={13}
                  src={cricle_cancel}
                  alt="cancel"
                  onClick={() => updateQuoteMessage()}
                />
                <div
                  className="ml-1.5 line-clamp-1 text-xs text-[var(--sub-text)]"
                  title=""
                >{`回复${quoteMessage.senderNickname}：${formatMessageByType(
                  quoteMessage,
                )}`}</div>
              </div>
            )}
            <EditableDiv
              ref={editableDivRef as any}
              id="editable-div"
              className="flex-1"
              html={html}
              onChange={onChange}
              onKeyDown={onKeyDown}
            />
            <div className="flex items-center justify-end pb-6 pr-6">
              <span className="mr-2.5 text-xs text-[var(--sub-text)]">
                Enter发送/Shift+Enter换行
              </span>
              <Button className="px-6 py-1" type="primary" onClick={enterToSend}>
                发送
              </Button>
            </div>
          </div>
        </Popover>
        <SnapPreviewGroup />
      </div>
      {/* <div className={styles.sider_resize}></div>
      <div className={styles.sider_bar}></div> */}
    </footer>
  );
};

export default memo(ChatFooter);

interface AtSearchPanelHandle {
  searchMember: (keyword: string) => Promise<void>;
}

interface IAtSearchPanelProps {
  closePanel: () => void;
  atHandler: (atUser: GroupMemberItem) => void;
}

const AT_ALL_KEY = "AtAllTag";

const atAllItem = { nickname: "所有人", userID: AT_ALL_KEY } as GroupMemberItem;

const AtSearchPanel: ForwardRefRenderFunction<
  AtSearchPanelHandle,
  IAtSearchPanelProps
> = ({ closePanel, atHandler }, ref) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [activeUserID, setActiveUserID] = useState("");
  const [searchData, setSearchData] = useState<GroupMemberItem[]>([]);
  const { isAdmin, isOwner } = useCurrentMemberRole();

  const canAtAll = isAdmin || isOwner;

  const { runAsync, loading } = useRequest(
    IMSDK.searchGroupMembers<GroupMemberItem[]>,
    {
      manual: true,
    },
  );

  useEffect(() => {
    if (listRef.current) {
      const activeItem = listRef.current.querySelector(
        `.at-panel-item-${activeUserID}`,
      ) as HTMLDivElement;
      if (activeItem) {
        const scrollTop = activeItem.offsetTop - listRef.current.offsetTop - 2 * 26;
        listRef.current.scrollTop = scrollTop;
      }
    }
  }, [activeUserID]);

  const searchMember = async (keyword: string) => {
    try {
      const { data } = await runAsync({
        groupID: useConversationStore.getState().currentConversation?.groupID ?? "",
        offset: 0,
        count: 20,
        keywordList: [keyword],
        isSearchMemberNickname: true,
        isSearchUserID: false,
      });
      setSearchData([...data]);
      setActiveUserID(canAtAll && !keyword ? AT_ALL_KEY : data[0]?.userID);
    } catch (error) {
      setSearchData([]);
    }
  };

  useKeyPress("uparrow", () => {
    const idx = searchData.findIndex((item) => item.userID === activeUserID);
    if (canAtAll && idx === 0) {
      setActiveUserID(AT_ALL_KEY);
      return;
    }
    if (idx < 1) return;
    setActiveUserID(searchData[idx - 1].userID);
  });

  useKeyPress("downarrow", () => {
    if (activeUserID === AT_ALL_KEY) {
      setActiveUserID(searchData[0].userID);
      return;
    }
    const idx = searchData.findIndex((item) => item.userID === activeUserID);
    if (idx < 0 || idx > searchData.length - 2) return;
    setActiveUserID(searchData[idx + 1].userID);
  });

  useKeyPress("enter", () => {
    if (activeUserID === AT_ALL_KEY) {
      atHandler(atAllItem);
      return;
    }
    const idx = searchData.findIndex((item) => item.userID === activeUserID);
    atHandler(searchData[idx]);
  });

  useKeyPress("esc", () => {
    closePanel();
  });

  useClickAway(() => {
    closePanel();
  }, wrapRef.current);

  useImperativeHandle(
    ref,
    () => ({
      searchMember,
    }),
    [],
  );

  return (
    <div ref={wrapRef} className="mx-1 flex h-[168px] min-w-[268px] flex-col py-1">
      {canAtAll && (
        <div>
          <AtPanelItem
            item={atAllItem}
            active={activeUserID === AT_ALL_KEY}
            atHandler={atHandler}
          />
        </div>
      )}
      <div className="mx-2">群成员</div>
      <Spin wrapperClassName="flex-1 overflow-hidden" spinning={loading}>
        <div className="h-full overflow-auto" ref={listRef}>
          {searchData.map((item) => (
            <AtPanelItem
              key={item.userID}
              item={item}
              active={activeUserID === item.userID}
              atHandler={atHandler}
            />
          ))}
        </div>
      </Spin>
    </div>
  );
};

const ForwardAtSearchPanel = forwardRef(AtSearchPanel);

const AtPanelItem = ({
  item,
  active,
  atHandler,
}: {
  item: GroupMemberItem;
  active?: boolean;
  atHandler: (atUser: GroupMemberItem) => void;
}) => {
  return (
    <div
      className={clsx(
        "flex items-center rounded-md px-2 py-2 hover:bg-[var(--primary-active)]",
        {
          "bg-[var(--primary-active)]": active,
        },
        `at-panel-item-${item.userID}`,
      )}
      onClick={() => atHandler(item)}
      onMouseDown={deleteBeforeAt}
    >
      <OIMAvatar
        size={26}
        text={item.userID === AT_ALL_KEY ? "@" : item.nickname}
        src={item.faceURL}
      />
      <div className="ml-2">{item.nickname}</div>
    </div>
  );
};

const SnapPreviewGroup = memo(() => {
  const [snapState, setSnapState] = useState({
    visible: false,
    idx: 0,
    list: [] as string[],
  });

  useEffect(() => {
    const showAlbum = (result: string) => {
      const screenshotEls = [
        ...document.getElementsByClassName("image-el"),
      ] as HTMLImageElement[];
      const list = screenshotEls.map((el) => el.src);
      setSnapState({
        visible: true,
        idx: list.findIndex((item) => item === result),
        list,
      });
    };

    window.screenshotPreview = showAlbum;
  }, []);

  return (
    <div style={{ display: "none" }}>
      <Image.PreviewGroup
        preview={{
          current: snapState.idx,
          visible: snapState.visible,
          onVisibleChange: (vis) =>
            setSnapState((state) => ({ ...state, visible: vis })),
        }}
      >
        {snapState.visible &&
          snapState.list.map((img, idx) => <Image key={idx} src={img} />)}
      </Image.PreviewGroup>
    </div>
  );
});
