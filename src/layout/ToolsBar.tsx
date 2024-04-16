import { Badge, Layout, Modal, Popover, Tooltip } from "antd";

import styles from "./layout.module.less";

import cve from "@/assets/images/cve.png";
import cve_select from "@/assets/images/cve_select.png";
import workbench from "@/assets/images/workbench.png";
import workbench_select from "@/assets/images/workbench_select.png";
import cons from "@/assets/images/cons.png";
import cons_select from "@/assets/images/cons_select.png";
import togetherSend from "@/assets/images/together_send.png";
import togetherSend_select from "@/assets/images/together_send_select.png";
import { useResolvedPath, useMatch, useNavigate } from "react-router";
import { Link } from "react-router-dom";
import { FC, useEffect, useRef, useState } from "react";
import { RightOutlined, UserOutlined } from "@ant-design/icons";
import { events, im } from "../utils";
import MyAvatar from "../components/MyAvatar";
import { shallowEqual, useSelector } from "react-redux";
import { RootState } from "../store";
import { useClickAway } from "ahooks";
import { useTranslation } from "react-i18next";
import { FullUserItem } from "../utils/open_im_sdk/types";
import { getApplicationIsReaded } from "../utils/im";
import { APPLICATION_ACCESS_UPDATE } from "../constants/events";

const { Sider } = Layout;

type ToolItem = {
  tip: string;
  icon: string;
  icon_select: string;
  path: string;
  idx: number;
};

const ToolIcon = ({ tool }: { tool: ToolItem }) => {
  let resolved = useResolvedPath(tool.path);
  let match = useMatch({ path: resolved.pathname, end: true });
  const [applications, setApplications] = useState(0);
  const unReadCount = useSelector((state: RootState) => state.contacts.unReadCount, shallowEqual);
  const recvFriendApplicationList = useSelector((state: RootState) => state.contacts.recvFriendApplicationList, shallowEqual);
  const recvGroupApplicationList = useSelector((state: RootState) => state.contacts.recvGroupApplicationList, shallowEqual);

  useEffect(() => {
    events.on(APPLICATION_ACCESS_UPDATE, getUnAccess);
    return () => {
      events.off(APPLICATION_ACCESS_UPDATE, getUnAccess);
    };
  }, []);

  useEffect(() => {
    setTimeout(() => getUnAccess(), 2000);
  }, [recvFriendApplicationList, recvGroupApplicationList]);

  useEffect(() => {
    if (window.electron) {
      window.electron.unReadChange(unReadCount + applications);
    }
  }, [applications, unReadCount]);

  const getUnAccess = async () => {
    let fan = 0;
    let gan = 0;
    for (let i = 0; i < recvFriendApplicationList.length; i++) {
      const fa = recvFriendApplicationList[i];
      if (fa.handleResult === 0 && !(await getApplicationIsReaded(fa))) {
        fan += 1;
      }
    }
    for (let i = 0; i < recvGroupApplicationList.length; i++) {
      const ga = recvGroupApplicationList[i];
      if (ga.handleResult === 0 && !(await getApplicationIsReaded(ga))) {
        gan += 1;
      }
    }
    setApplications(fan + gan);
  };

  return (
    <Link to={tool.path}>
      <Tooltip placement="right" title={tool.tip}>
        <div className={styles.tool_icon}>
          <Badge size="small" offset={[-12, -2]} count={tool.idx === 0 ? unReadCount : tool.idx === 1 ? applications : null}>
            <div className={`${styles.tool_container} ${match ? styles.tool_container_focus : ""}`}>
              <img width="18" height="18" src={match ? tool.icon_select : tool.icon} />
              <div>{tool.tip}</div>
            </div>
          </Badge>
        </div>
      </Tooltip>
    </Link>
  );
};

type ToolsBarProps = {
  userInfo: FullUserItem;
};

const ToolsBar: FC<ToolsBarProps> = ({ userInfo }) => {
  const [showPop, setShowPop] = useState(false);
  const selfID = useSelector((state: RootState) => state.user.selfInfo.userID, shallowEqual);
  const navigate = useNavigate();
  const popRef = useRef<HTMLDivElement>(null);
  const avaRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useClickAway(() => {
    if (showPop) setShowPop(false);
  }, [popRef, avaRef]);

  const clickMenu = (idx: number) => {
    setShowPop(false);
    switch (idx) {
      case 0:
        window.userClick(userInfo.userID);
        break;
      case 1:
        navigate("/profile", {
          state: {
            type: "set",
          },
        });
        break;
      case 2:
        navigate("/profile", {
          state: {
            type: "about",
          },
        });
        break;
      case 3:
        Modal.confirm({
          title: t("LogOut"),
          content: t("LogOutTip"),
          onOk: logout,
        });
        break;
      default:
        break;
    }
  };

  const tools: ToolItem[] = [
    {
      tip: t("Message"),
      icon: cve,
      icon_select: cve_select,
      path: "/",
      idx: 0,
    },
    {
      tip: t("Contact"),
      icon: cons,
      icon_select: cons_select,
      path: "/contacts",
      idx: 1,
    },
    // {
    //   tip: t("Workbench"),
    //   icon: workbench,
    //   icon_select: workbench_select,
    //   path: "/workbench",
    //   idx: 2,
    // },
    // {
    //   tip: t("TogetherSend"),
    //   icon: togetherSend,
    //   icon_select: togetherSend_select,
    //   path: "/togetherSend",
    //   idx: 3,
    // },
  ];

  const logout = async () => {
    await im.logout();
    window.electron?.removeStoreKey("IMUserID");
    window.electron?.removeStoreKey("IMProfile");
    localStorage.removeItem(`improfile-${selfID}`);
    navigate("/login");
  };

  const popMenus = [
    {
      title: t("MyInformation"),
      idx: 0,
    },
    {
      title: t("AccountSettings"),
      idx: 1,
    },
    // {
    //   title: t("AboutUs"),
    //   idx: 2,
    // },
    {
      title: t("LogOut"),
      idx: 3,
    },
  ];

  const popContent = (
    <div ref={popRef} className={styles.tool_self_menu}>
      {popMenus.map((menu) => {
        return (
          <div onClick={() => clickMenu(menu.idx)} key={menu.idx} className={styles.tool_self_item}>
            <div>{menu.title}</div>
            <RightOutlined style={{ color: "#b1b2b4", fontSize: "12px" }} />
          </div>
        );
      })}
    </div>
  );

  const popTitle = (
    <div className={styles.tool_self_title}>
      <MyAvatar className={styles.tool_self_icon} shape="square" nickname={userInfo.nickname} size={34} icon={<UserOutlined />} src={userInfo.faceURL} />
      <Tooltip placement="right" title={userInfo.nickname}>
        <div className={styles.nick_name}>{userInfo.nickname}</div>
      </Tooltip>
    </div>
  );

  return (
    <Sider width="60" theme="light" className={styles.tool_bar}>
      <div className={styles.tools}>
        <Popover overlayClassName={styles.nomal_pop} trigger="click" placement="right" arrowPointAtCenter={true} content={popContent} title={popTitle} visible={showPop}>
          <div ref={avaRef} onClick={() => setShowPop(true)}>
            <MyAvatar className={styles.left_avatar} nickname={userInfo.nickname} src={userInfo.faceURL} size={36} />
          </div>
        </Popover>
        {tools.map((t, idx) => (
          <ToolIcon tool={t} key={idx} />
        ))}
      </div>
      {/* {draggableCardVisible && <UserCard close={closeDragCard} info={userInfo} type="self" draggableCardVisible={draggableCardVisible} />} */}
      {/* {<UserCard close={closeDragCard} info={userInfo} type="self" draggableCardVisible={draggableCardVisible} />} */}
    </Sider>
  );
};

export default ToolsBar;
