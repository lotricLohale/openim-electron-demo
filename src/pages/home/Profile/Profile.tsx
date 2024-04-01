import { shallowEqual } from "@babel/types";
import { Button, Checkbox, Empty, Layout, message, Modal, Radio, RadioChangeEvent } from "antd";
import moment from "moment";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import MyAvatar from "../../../components/MyAvatar";
import { ANTD_LOCALCHANGE, UPDATE_GLOBAL_LOADING } from "../../../constants/events";
import { RootState } from "../../../store";
import { events, im } from "../../../utils";
import logo from "@/assets/images/logo256x256.png";
import { CheckboxValueType } from "antd/lib/checkbox/Group";
import { OptType } from "../../../utils/open_im_sdk/types";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import { updateSelfInfo } from "../../../api/login";
import { BusinessUserInfo } from "../../../store/types/user";
import { getSelfInfo, setSelfInfo } from "../../../store/actions/user";

const { Header, Sider, Content } = Layout;

const PersonalSetting = () => {
  const { i18n, t } = useTranslation();
  const [closeAction, setCloseAction] = useState<boolean | undefined>(undefined);
  const selfInfo = useSelector((state: RootState) => state.user.selfInfo, shallowEqual);

  const dispatch = useDispatch();

  useEffect(() => {
    if (window.electron) {
      setCloseAction(window.electron.getAppCloseAction());
    }
  }, []);

  const onLanguageChange = (e: RadioChangeEvent) => {
    i18n.changeLanguage(e.target.value);
    moment.locale(e.target.value);
    events.emit(ANTD_LOCALCHANGE, e.target.value);
    localStorage.setItem("IMLanguage", e.target.value);
  };

  const onAllowAddChange = (e: RadioChangeEvent) => {
    updateBusinessSelfInfo({ userID: selfInfo.userID, allowAddFriend: e.target.value });
  };

  const onCloseActionChange = (e: RadioChangeEvent) => {
    window.electron.setAppCloseAction(e.target.value);
    setCloseAction((v) => !v);
  };

  const onBeeChange = (e: CheckboxChangeEvent) => {
    updateBusinessSelfInfo({ userID: selfInfo.userID, allowBeep: e.target.checked ? 1 : 2 });
  };

  const onOptChange = async (e: CheckboxChangeEvent) => {
    console.log(`checked = ${e.target.checked}`);
    try {
      await im.setSelfInfo({
        globalRecvMsgOpt: e.target.checked ? OptType.WithoutNotify : OptType.Nomal,
      });
      message.success("设置成功！");
    } catch (error) {
      message.error("操作失败！");
    }
  };

  const updateBusinessSelfInfo = async (data: Partial<BusinessUserInfo>) => {
    try {
      await updateSelfInfo(data);
      dispatch(setSelfInfo({ ...selfInfo, ...data }));
      message.success("设置成功！");
    } catch (error) {
      message.error("操作失败！");
    }
  };

  return (
    <div className="personal_setting">
      <div>个人设置</div>
      <div className="personal_setting_item">
        <div className="title">{t("SelectLanguage")}</div>
        <Radio.Group onChange={onLanguageChange} value={i18n.language}>
          <Radio value="zh-cn">简体中文</Radio>
          <Radio value="en">English</Radio>
        </Radio.Group>
      </div>
      <div className="personal_setting_item">
        <div className="title">{t("AllowAddFriend")}</div>
        <Radio.Group onChange={onAllowAddChange} value={selfInfo.allowAddFriend}>
          <Radio value={1}>{t("Yes")}</Radio>
          <Radio value={2}>{t("No")}</Radio>
        </Radio.Group>
      </div>
      <div className="personal_setting_item">
        <div className="title">{"消息提示"}</div>
        <div>
          <Checkbox checked={selfInfo.allowBeep === 1} onChange={onBeeChange}>
            消息提示音
          </Checkbox>
          {/* <Checkbox checked={selfInfo.globalRecvMsgOpt !== 0} onChange={onOptChange}>
            勿扰模式
          </Checkbox> */}
        </div>
      </div>
      {window.electron && (
        <div className="personal_setting_item">
          <div className="title">{t("CloseAction")}</div>
          <Radio.Group onChange={onCloseActionChange} value={closeAction}>
            <Radio value={true}>{t("QuitApp")}</Radio>
            <Radio value={false}>{t("MiniSizeApp")}</Radio>
          </Radio.Group>
        </div>
      )}
    </div>
  );
};

const Blacklist = () => {
  const { t } = useTranslation();
  const blackList = useSelector((state: RootState) => state.contacts.blackList, shallowEqual);
  const rmBl = (id: string) => {
    im.removeBlack(id).then((res) => message.success(t("RemoveMembersSuc")));
  };

  return (
    <div className="profile_content_bl">
      {blackList.length > 0 ? (
        blackList.map((bl) => (
          <div key={bl.userID} className="profile_content_bl_item">
            <div className="item_left">
              <MyAvatar src={bl.faceURL} size={36} />
              <div className="nick">{bl.nickname}</div>
            </div>
            <Button onClick={() => rmBl(bl.userID!)} type="link">
              {t("Remove")}
            </Button>
          </div>
        ))
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("NoData")} />
      )}
    </div>
  );
};

const VersionDesc = () => {
  return (
    <div className="version_box">
      <div className="container">
        <img src={logo} alt="" />
        {window.electron && <div>{`应用版本v${window.electron?.getVersion() ?? ""}`}</div>}
        <div>SDK版本v2.3.3</div>
      </div>
    </div>
  );
};

const Profile = () => {
  const type = (useLocation().state as any).type ?? "about";
  const [curMenu, setCurMenu] = useState("");
  const { t } = useTranslation();

  const delLocalRecord = () => {
    im.deleteAllMsgFromLocal()
      .then((res) => message.success(t("DeleteMessageSuc")))
      .catch((err) => message.error(t("DeleteMessageFailed")));
  };

  const delRemoteRecord = () => {
    events.emit(UPDATE_GLOBAL_LOADING, true);
    im.deleteAllMsgFromLocalAndSvr()
      .then((res) => {
        events.emit(UPDATE_GLOBAL_LOADING, false);
        message.success(t("DeleteMessageSuc"));
      })
      .catch((err) => {
        events.emit(UPDATE_GLOBAL_LOADING, false);
        message.error(t("DeleteMessageFailed"));
      });
  };

  const aboutMenus = [
    {
      title: t("CheckVersion"),
      idx: 0,
    },
    {
      title: t("NewFunctions"),
      idx: 1,
    },
    {
      title: t("ServceAggrement"),
      idx: 2,
    },
    {
      title: `OpenIM${t("PrivacyAgreement")}`,
      idx: 3,
    },
    {
      title: t("Copyright"),
      idx: 4,
    },
  ];

  const setMenus = [
    {
      title: t("PersonalSettings"),
      type: "personalSetting",
      idx: 0,
    },
    {
      title: t("Blacklist"),
      type: "blacklist",
      idx: 1,
    },
    {
      title: t("ClearChat"),
      type: "clearChat",
      idx: 2,
    },
    {
      title: t("VersionDesc"),
      type: "VersionDesc",
      idx: 3,
    },
  ];

  const clickMenu = (idx: number) => {
    setCurMenu(setMenus[idx].type);
    if (idx === 2) {
      Modal.confirm({
        title: t("DeleteMessage"),
        content: t("DeleteAllMessageConfirm"),
        cancelText: t("Cancel"),
        okText: t("Delete"),
        okButtonProps: {
          danger: true,
          type: "primary",
        },
        closable: false,
        className: "warning_modal",
        onOk: () => delRemoteRecord(),
      });
    }
  };

  const switchContent = () => {
    switch (curMenu) {
      case "blacklist":
        return <Blacklist />;
      case "personalSetting":
        return <PersonalSetting />;
      case "VersionDesc":
        return <VersionDesc />;
      default:
        return <div>...</div>;
    }
  };
  return (
    <Layout className="profile">
      <Header className="profile_header">{type === "about" ? t("AboutUs") : t("AccountSettings")}</Header>
      <Layout>
        <Sider width="350" className="profile_sider" theme="light">
          <div className="profile_sider_menu">
            {setMenus.map((mu) => (
              <div key={mu.idx} onClick={() => clickMenu(mu.idx)} className={`profile_sider_menu_item ${mu.type === curMenu ? "profile_sider_menu_item_active" : ""}`}>
                {mu.title}
              </div>
            ))}
          </div>
        </Sider>
        <Content className="profile_content">{switchContent()}</Content>
      </Layout>
    </Layout>
  );
};

export default Profile;
