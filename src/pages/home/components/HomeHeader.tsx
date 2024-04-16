import { Layout, Modal, Select, Tooltip, Typography } from "antd";
import { FC, memo, useEffect, useMemo, useRef, useState } from "react";
import { useSelector, shallowEqual } from "react-redux";
import { DetailType } from "../../../@types/open_im";
import { getOnline } from "../../../api/admin";
import MyAvatar from "../../../components/MyAvatar";
import { RootState } from "../../../store";
import { events, isSingleCve } from "../../../utils";
import members from "@/assets/images/members.png";
import { useTranslation } from "react-i18next";
import { ConversationItem, SessionType } from "../../../utils/open_im_sdk/types";
import { useLatest, useUpdateEffect } from "ahooks";
import { APPLICATION_TYPE_UPDATE, CHECK_USER_ONLINE, OPEN_GROUP_MODAL } from "../../../constants/events";
import { isNotify } from "../../../utils/im";
import group_icon from "@/assets/images/group_icon.png";
import organizational_logo from "@/assets/images/organizational_logo.png";
import cve_tr_set from "@/assets/images/cve_tr_set.png";
import cve_tr_add from "@/assets/images/cve_tr_add.png";
import cve_tr_file from "@/assets/images/cve_tr_file.png";
import cve_tr_history from "@/assets/images/cve_tr_history.png";
import cve_tr_notify from "@/assets/images/cve_tr_notify.png";
import CveRightDrawer from "../Cve/CveRightDrawer/CveRightDrawer";
import { GroupTypes } from "../../../constants/messageContentType";

const { Header } = Layout;

type HeaderProps = {
  isShowBt?: boolean;
  type: "chat" | "contact";
  title?: string | any;
  curCve?: ConversationItem;
  typing?: boolean;
};

const HomeHeader: FC<HeaderProps> = ({ isShowBt, type, title, curCve, typing }) => {
  const { t } = useTranslation();

  const ConsHeader = () => {
    const [origin, setOrigin] = useState("recv");
    const orzInfo = useSelector((state: RootState) => state.contacts.organizationInfo, shallowEqual).deps;

    useUpdateEffect(() => {
      events.emit(APPLICATION_TYPE_UPDATE, origin);
    }, [origin]);

    let recvLable,
      sentLable = "";
    const selectAble = title === t("NewFriend") || title === t("NewGroups");
    if (title === t("NewFriend")) {
      recvLable = t("NewFriend");
      sentLable = t("MyRequest");
    } else {
      recvLable = t("GroupApplication");
      sentLable = t("MyApplication");
    }

    const onSelect = (value: string) => {
      setOrigin(value);
    };

    const quit = () => {
      Modal.confirm({
        title: t("ExitTheEnterprise"),
        closable: false,
        maskClosable: true,
        centered: true,
        className: "warning_modal",
        onOk: () => {},
      });
    };

    const ContentTitle = () => (
      <div className="organizational_title">
        <div className="left">
          <img src={organizational_logo} width={42} />
          <span>{orzInfo[0]?.name}</span>
        </div>
        {/* <span className="quit" onClick={() => quit()}></span> */}
      </div>
    );

    return (
      <div className="chat_header_box chat_header_cons">
        <div style={{ width: "100%" }}>{title === null ? <ContentTitle /> : title}</div>
        {selectAble && (
          <Select onSelect={onSelect} defaultValue="recv" style={{ width: 120 }}>
            <Select.Option value="recv">{recvLable}</Select.Option>
            <Select.Option value="sent">{sentLable}</Select.Option>
          </Select>
        )}
      </div>
    );
  };
  return (
    <>
      <Header className="chat_header" style={{ borderBottom: isShowBt ? "1px solid rgba(81, 94, 112, 0.1)" : "none" }}>
        {type === "chat" ? <ChatHeader curCve={curCve!} typing={typing!} /> : <ConsHeader />}
      </Header>
    </>
  );
};

HomeHeader.defaultProps = {
  isShowBt: true,
};

export default memo(HomeHeader);

type ChatHeaderProps = {
  curCve: ConversationItem;
  typing: boolean;
};

export enum CveDrawerType {
  Null,
  GroupNotify,
  HistoryMsg,
  FileManage,
  AddAction,
  CveSet,
}

const ChatHeader: FC<ChatHeaderProps> = ({ curCve, typing }) => {
  const { t } = useTranslation();
  const [onlineStatus, setOnlineStatus] = useState<string>(t("Offline"));
  const latestOnline = useLatest(onlineStatus);
  const groupInfo = useSelector((state: RootState) => state.contacts.groupInfo, shallowEqual);
  const groupList = useSelector((state: RootState) => state.contacts.groupList, shallowEqual);
  const robots = useSelector((state: RootState) => state.user.appConfig.robots, shallowEqual) || [];
  const lastCve = useRef<ConversationItem | undefined>(undefined);
  const [drawerType, setDrawerType] = useState({
    type: CveDrawerType.Null,
    visible: false,
  });

  const isRobot = useMemo(() => robots.includes(curCve?.userID ?? ""), [curCve?.userID, robots]);

  useEffect(() => {
    if (curCve?.conversationType !== SessionType.Single) return;
    lastCve.current = curCve;
    updateOnline(curCve!.userID);
    events.on(CHECK_USER_ONLINE, onlineUpdateHandler);
    return () => {
      events.off(CHECK_USER_ONLINE, onlineUpdateHandler);
    };
  }, [curCve?.userID]);

  const onlineUpdateHandler = () => {
    if (latestOnline.current === t("Offline") && curCve?.userID) {
      updateOnline(curCve.userID);
    }
  };

  const updateOnline = (userID: string) => {
    getOnline([userID]).then((res) => {
      const statusItem = res.data[0];
      if (statusItem.userID === curCve?.userID) {
        switchOnline(statusItem.status, statusItem.detailPlatformStatus);
      }
    });
  };

  const switchOnline = (oType: string, details?: DetailType[]) => {
    switch (oType) {
      case "offline":
        setOnlineStatus(t("Offline"));
        break;
      case "online":
        let str = "";
        details?.map((detail) => {
          if (detail.status === "online") {
            str += `${detail.platform}/`;
          }
        });
        setOnlineStatus(`${str.slice(0, -1)} ${t("Online")}`);
        break;
      default:
        break;
    }
  };

  const SingleCveInfo = () => (
    <>
      <span style={{ backgroundColor: onlineStatus === t("Offline") ? "#959595" : "#0ecc63" }} className="icon" />
      <span className="online">{onlineStatus}</span>
    </>
  );

  const GroupCveInfo = () => (
    <>
      <div className="num">
        <img src={members} alt="" />
        <span>{groupInfo?.memberCount}</span>
      </div>
      <div className="num">
        {/* <span className="icon" /> */}
        {/* <span className="online">{`${onlineNo} ${t("OnlineEx")}`}</span> */}
      </div>
    </>
  );

  const NotificationHeader = () => (
    <div className="chat_header_box chat_header_cons">
      <div style={{ width: "100%", fontWeight: 500 }}>{curCve?.showName}</div>
    </div>
  );

  const clickItem = (type: CveDrawerType) => {
    if (type === CveDrawerType.AddAction) {
      inviteToGroup();
      return;
    }
    setDrawerType({
      type,
      visible: true,
    });
  };

  const inviteToGroup = () => {
    if (GroupTypes.includes(curCve.conversationType)) {
      events.emit(OPEN_GROUP_MODAL, "invite", curCve.groupID);
    } else {
      const prevList = [
        {
          userID: curCve.userID,
          uuid: curCve.userID,
          nickname: curCve.showName,
          showName: curCve.showName,
          faceURL: curCve.faceURL,
        },
      ];
      events.emit(OPEN_GROUP_MODAL, "create", null, prevList);
    }
  };

  const isInGroup = useMemo(() => groupList.find((group) => group.groupID === curCve.groupID), [curCve.groupID, groupList]);

  const tools = [
    {
      tip: t("GroupAnnouncement"),
      icon: cve_tr_notify,
      method: clickItem,
      idx: 0,
      type: CveDrawerType.GroupNotify,
      visible: curCve.groupID !== "" && isInGroup,
    },
    {
      tip: t("Search"),
      icon: cve_tr_history,
      method: clickItem,
      idx: 1,
      type: CveDrawerType.HistoryMsg,
      visible: true,
    },
    // {
    //   tip: t("File")+"(开发中~)",
    //   icon: right_file,
    //   icon_se: right_file_se,
    //   method: clickItem,
    //   idx: 2,
    // },
    {
      tip: t("Invite"),
      icon: cve_tr_add,
      method: clickItem,
      idx: 3,
      type: CveDrawerType.AddAction,
      visible: true,
    },
    {
      tip: t("Setting"),
      icon: cve_tr_set,
      method: clickItem,
      idx: 4,
      type: CveDrawerType.CveSet,
      visible: curCve.userID !== "" || isInGroup,
    },
  ];

  const onClose = () => {
    setDrawerType({
      type: CveDrawerType.Null,
      visible: false,
    });
  };

  return isNotify(curCve!.conversationType) ? (
    <NotificationHeader />
  ) : (
    <div className="chat_header_box">
      <div className="chat_header_box_left">
        <MyAvatar nickname={curCve?.showName} size={42} src={curCve?.faceURL === "" && GroupTypes.includes(curCve.conversationType) ? group_icon : curCve?.faceURL} />
        <div className="cur_status">
          <Typography.Text ellipsis>{curCve?.showName}</Typography.Text>
          {!isRobot && (
            <div className="cur_status_update">
              {isSingleCve(curCve!) ? <SingleCveInfo /> : <GroupCveInfo />}
              {typing ? <span className="typing">{t("InInput")}</span> : null}
            </div>
          )}
        </div>
      </div>
      <div className="chat_header_box_right">
        {tools.map((tool) =>
          tool.visible ? (
            <Tooltip key={tool.tip} placement="top" title={tool.tip}>
              <div className="col_icon" onClick={() => tool.method(tool.type)}>
                <img src={tool.icon} />
              </div>
            </Tooltip>
          ) : null
        )}
      </div>
      {drawerType.visible && <CveRightDrawer curTool={drawerType.type} visible={drawerType.visible} curCve={curCve} onClose={onClose} />}
    </div>
  );
};
