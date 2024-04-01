import { DeleteOutlined, LeftOutlined, SearchOutlined } from "@ant-design/icons";
import { Drawer, Input, message, Modal } from "antd";
import { FC, memo, Ref, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { diffMemo, events, im, isSingleCve } from "../../../../utils";
import SingleDrawer from "./SingleDrawer";
import GroupDrawer from "./GroupDrawer/GroupDrawer";
import EditDrawer from "./GroupDrawer/EditDrawer";
import MemberDrawer, { MemberDrawerHandle } from "./GroupDrawer/MemberDrawer";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../../store";
import GroupManage from "./GroupDrawer/GroupManage";
import { GroupNotice } from "./GroupDrawer/GroupNotice";
import { useTranslation } from "react-i18next";
import { setCurCve } from "../../../../store/actions/cve";
import { ConversationItem, GroupItem, GroupMemberItem, GroupRole, OptType } from "../../../../utils/open_im_sdk/types";
import { SearchMessageDrawer } from "./SearchMessageDrawer";
import member_drawer_search from "../../../../assets/images/member_drawer_search.png";
import member_drawer_add from "../../../../assets/images/member_drawer_add.png";
import member_drawer_close from "../../../../assets/images/member_drawer_close.png";
import { DELETE_MESSAGE, OPEN_GROUP_MODAL } from "../../../../constants/events";
import { CveDrawerType } from "../../components/HomeHeader";
import { debounce, throttle } from "throttle-debounce";
import { CbEvents } from "../../../../utils/open_im_sdk";
import { useLatest } from "ahooks";
import MemberPermisson from "./GroupDrawer/MemberPermisson";
import ReadLimitTimeSetting from "./ReadLimitTimeSetting";

type CveRightDrawerProps = {
  curCve: ConversationItem;
  visible: boolean;
  curTool: CveDrawerType;
  onClose: () => void;
};

export type DrawerType = "set" | "edit_group_info" | "member_list" | "group_manage" | "group_notice_list" | "search_message" | "member_permisson" | "read_limit_setting";

const CveRightDrawer: FC<CveRightDrawerProps> = ({ curCve, visible, curTool, onClose }) => {
  const [type, setType] = useState<DrawerType>("set");
  const selfID = useSelector((state: RootState) => state.user.selfInfo.userID, shallowEqual);
  const groupInfo = useSelector((state: RootState) => state.contacts.groupInfo, shallowEqual);
  const currentMember = useSelector((state: RootState) => state.contacts.currentMember, shallowEqual);
  // const [role, setRole] = useState<GroupRole>(GroupRole.Nomal);
  const { t } = useTranslation();
  const memberDrawerRef = useRef<MemberDrawerHandle>(null);

  useEffect(() => {
    switch (curTool) {
      case CveDrawerType.GroupNotify:
        setType("group_notice_list");
        break;
      case CveDrawerType.HistoryMsg:
        setType("search_message");
        break;
      case CveDrawerType.CveSet:
        setType("set");
        break;
      default:
    }
  }, [curTool]);

  // useEffect(() => {
  //   if (currentMember.groupID) {
  //     getPermission();
  //   }
  // }, [currentMember.groupID,groupInfo.groupID]);

  // const getPermission = async () => {
  //   if (currentMember && currentMember.groupID === groupInfo.groupID) {
  //     setRole(currentMember.roleLevel);
  //   }
  // };

  const changeType = useCallback((tp: DrawerType) => {
    setType(tp);
  }, []);

  const updatePin = useCallback(() => {
    const options = {
      conversationID: curCve.conversationID,
      isPinned: !curCve.isPinned,
    };
    im.pinConversation(options)
      .then((res) => {
        message.success(!curCve.isPinned ? t("PinSuc") : t("CancelPinSuc"));
      })
      .catch((err) => {});
  }, [curCve.conversationID, curCve.isPinned]);

  const updateOpt = useCallback(
    (v: boolean, isMute?: boolean) => {
      let flag = 0;
      if (v) {
        flag = isMute ? OptType.Mute : OptType.WithoutNotify;
      } else {
        flag = OptType.Nomal;
      }
      const options = {
        conversationIDList: [curCve.conversationID],
        opt: flag,
      };
      im.setConversationRecvMessageOpt(options);
    },
    [curCve.conversationID]
  );

  const switchContent = () => {
    switch (type) {
      case "set":
        return isSingleCve(curCve) ? (
          <SingleDrawer curCve={curCve} updatePin={updatePin} updateOpt={updateOpt} changeType={changeType} />
        ) : (
          <GroupDrawer groupInfo={groupInfo} curCve={curCve} currentMember={currentMember} role={currentMember.roleLevel} updatePin={updatePin} changeType={changeType} updateOpt={updateOpt} />
        );
      case "edit_group_info":
        return <EditDrawer />;
      case "member_list":
        return <MemberDrawer ref={memberDrawerRef} role={currentMember.roleLevel} />;
      // case "group_manage":
      // return <GroupManage gid={curCve.groupID} groupMembers={groupMembers} adminList={adminList} />;
      case "group_notice_list":
        return <GroupNotice role={currentMember.roleLevel} />;
      case "search_message":
        return <SearchMessageDrawer curCve={curCve} />;
      case "member_permisson":
        return <MemberPermisson/>
      case "read_limit_setting":
        return <ReadLimitTimeSetting conversationID={curCve.conversationID} limitTime={curCve.burnDuration?curCve.burnDuration:30 } />
      default:
        break;
    }
  };

  const backTitle = (tp: DrawerType, title: string) => (
    <div>
      <LeftOutlined onClick={() => setType(tp)} />
      <span style={{ marginLeft: "12px" }}>{title}</span>
    </div>
  );

  const SwitchTitle = useMemo(() => {
    switch (type) {
      case "set":
        return <div>{t("Setting")}</div>;
      case "edit_group_info":
        return backTitle("set", t("EditGroupInfo"));
      case "member_list":
        return <SearchTitle setType={setType} memberDrawerRef={memberDrawerRef} />;
      case "group_manage":
        return backTitle("set", t("GroupManage"));
      case "group_notice_list":
        return <div>{t("GroupAnnouncement")}</div>;
      case "search_message":
        return <div className="search_del">{t("ChatsRecord")}</div>;
      case "member_permisson":
        return backTitle("set",t("MemberPermis"))
      case "read_limit_setting":
        return backTitle("set",t("Setting"))
      default:
        break;
    }
  }, [type, memberDrawerRef]);

  const closeableList = ["set", "search_message", "group_notice_list", "member_list","member_permisson"];

  return (
    <Drawer
      className={`right_set_drawer ${type === "set" ? "right_set_drawer_scroll" : ""}`}
      width={420}
      // mask={false}
      maskClosable
      maskStyle={{ backgroundColor: "transparent" }}
      title={SwitchTitle}
      placement="right"
      onClose={() => {
        setType("set");
        onClose();
      }}
      closable={closeableList.includes(type)}
      closeIcon={<img src={member_drawer_close} />}
      visible={visible}
      getContainer={document.getElementById("chat_main") ?? false}
    >
      {switchContent()}
    </Drawer>
  );
};

const deepKey = ["conversationID", "showName", "faceURL", "recvMsgOpt", "isPinned", "isPrivateChat","burnDuration"];
export default memo(CveRightDrawer, (p, n) => {
  const shallowFlag = p.curTool === n.curTool;
  const deepFlag = diffMemo(p.curCve, n.curCve, deepKey);
  return shallowFlag && deepFlag;
});

type SearchTitleProps = {
  memberDrawerRef: React.RefObject<MemberDrawerHandle>;
  setType: (type: DrawerType) => void;
};

const SearchTitle: FC<SearchTitleProps> = memo(({ memberDrawerRef, setType }) => {
  const groupInfo = useSelector((state: RootState) => state.contacts.groupInfo, shallowEqual);
  const [searchState, setSearchState] = useState({
    content: "",
    status: false,
  });
  const { t } = useTranslation();

  useEffect(() => {
    im.on(CbEvents.ONGROUPMEMBERINFOCHANGED, memberInfoChangeHandler);
    im.on(CbEvents.ONGROUPMEMBERDELETED, memberInfoChangeHandler);
    im.on(CbEvents.ONGROUPMEMBERADDED, memberInfoChangeHandler);
    return () => {
      im.off(CbEvents.ONGROUPMEMBERINFOCHANGED, memberInfoChangeHandler);
      im.off(CbEvents.ONGROUPMEMBERDELETED, memberInfoChangeHandler);
      im.off(CbEvents.ONGROUPMEMBERADDED, memberInfoChangeHandler);
    };
  }, []);

  const memberInfoChangeHandler = ({ data }: any) => {
    const memberInfo: GroupMemberItem = JSON.parse(data);
    if (memberInfo.groupID === groupInfo.groupID) {
      setTimeout(() => {
        memberDrawerRef.current?.updateRrnerList();
      });
    }
  };

  const switch2Search = (status: boolean) => {
    if (!status) {
      memberDrawerRef.current?.updateRrnerList();
    }
    setSearchState({
      content: "",
      status,
    });
  };

  const search = (text: string) => {
    // const tmpArr = groupMembers.filter((gm) => gm.nickname.indexOf(text) > -1);
    const options = {
      groupID: groupInfo.groupID,
      keywordList: [text],
      isSearchUserID: false,
      isSearchMemberNickname: true,
      offset: 0,
      count: 50
    };
    im.searchGroupMembers(options).then(({ data }) => {
      memberDrawerRef.current?.updateRrnerList(JSON.parse(data));
    });
  };

  const throttleSearch = throttle(500, search);

  const onInputChanged = (e: any) => {
    if (e.target.value === "") {
      memberDrawerRef.current?.updateRrnerList();
    } else {
      throttleSearch(e.target.value);
    }
  };

  const inviteToGroup = () => {
    events.emit(OPEN_GROUP_MODAL, "invite", groupInfo.groupID);
  };

  return (
    <div className="search_drawer_title">
      <div>
        <LeftOutlined onClick={() => setType("set")} />
        <span style={{ marginLeft: "12px" }}>{t("GroupMembers")}</span>
      </div>
      <div className="right_action">
        {searchState.status ? (
          <>
            <Input onChange={onInputChanged} bordered={false} prefix={<SearchOutlined />} />
            <span onClick={() => switch2Search(false)} className="cancel">
              取消
            </span>
          </>
        ) : (
          <>
            <img onClick={inviteToGroup} src={member_drawer_add} alt="" />
            <img onClick={() => switch2Search(true)} src={member_drawer_search} alt="" />
          </>
        )}
        {/* <img src={member_drawer_close} alt="" /> */}
      </div>
    </div>
  );
});
