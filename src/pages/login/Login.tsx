import { message } from "antd";
import login_bg from "@/assets/images/login_bg.png";
import LoginForm, { FormField, InfoField } from "./components/LoginForm";
import { useState } from "react";
import { Itype } from "../../@types/open_im";
import { useHistoryTravel, useLatest, useInterval } from "ahooks";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import md5 from "md5";
import { login as loginApi, modify, register, reset, sendSms, UsedFor, verifyCode } from "../../api/login";
import { im, switchLoginError } from "../../utils";
import { getIMApiUrl, getIMWsUrl } from "../../config";
import { useDispatch } from "react-redux";
import { getAppGlobalConfig, getSelfInfo, resetUserStore } from "../../store/actions/user";
import { getCveList, resetCveStore } from "../../store/actions/cve";
import {
  getBlackList,
  getRecvFriendApplicationList,
  getFriendList,
  getRecvGroupApplicationList,
  getGroupList,
  getUnReadCount,
  getSentFriendApplicationList,
  getSentGroupApplicationList,
  getOriginIDList,
  getOrganizationInfo,
  resetContactStore,
} from "../../store/actions/contacts";
import IMConfigModal from "./components/IMConfigModal";
import TopBar from "../../components/TopBar";
import { InitConfig } from "../../utils/open_im_sdk/types";
import { initEmoji } from "../../utils/im";
import { useSelector, shallowEqual } from "react-redux";
import { RootState } from "../../store";

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    no: "",
    code: "",
    pwd: "",
    areaCode: "86",
    invitationCode: "",
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { value: type, setValue: setType, back } = useHistoryTravel<Itype>("login");
  const appConfig = useSelector((state: RootState) => state.user.appConfig, shallowEqual);
  const lastType = useLatest(type);

  const finish = (values?: FormField | string | InfoField) => {
    switch (lastType.current) {
      case "login":
      case "loginWithCode":
        if (!values) return;
        if (values === "register" || values === "modifySend") {
          toggle(values);
        } else {
          if (!(values as FormField).phoneNo || (!(values as FormField).password && !(values as FormField).verificationCode)) return false;
          toggle("success");
          login(values as FormField);
        }
        break;
      case "register":
      case "modifySend":
        const isModify = lastType.current === "modifySend";
        if (!isModify && appConfig.needInvitationCodeRegister && !(values as FormField).invitationCode) {
          message.warning("请输入邀请码！");
          return;
        }
        sendSms((values as FormField)?.phoneNo as string, (values as FormField)?.areaCode, isModify ? UsedFor.Modify : UsedFor.Register, (values as FormField).invitationCode)
          .then((res: any) => {
            setFormData({
              no: (values as FormField)?.phoneNo,
              pwd: "",
              code: "",
              areaCode: (values as FormField)?.areaCode,
              invitationCode: (values as FormField).invitationCode ?? "",
            });
            toggle(isModify ? "modifycode" : "vericode");
          })
          .catch((err) => handleError(err));
        break;
      case "modifycode":
      case "vericode":
        const isRegister = lastType.current === "vericode";
        verifyCode(formData.no, formData.areaCode, values as string, isRegister ? UsedFor.Register : UsedFor.Modify)
          .then((res: any) => {
            setFormData({
              ...formData,
              no: formData.no,
              pwd: "",
              code: values as string,
            });
            toggle(isRegister ? "setPwd" : "modify");
          })
          .catch((err) => handleError(err));
        break;
      case "setPwd":
        setFormData({
          ...formData,
          pwd: (values as FormField).password as string,
        });
        toggle("setInfo");
        break;
      case "setInfo":
        toggle("success");
        const data = values as InfoField;
        // setIMInfo(values as InfoField);
        const options = {
          phoneNumber: formData.no,
          areaCode: formData.areaCode,
          verificationCode: formData.code,
          password: md5(formData.pwd),
          faceURL: data.faceURL,
          nickname: data.nickname,
          invitationCode: formData.invitationCode,
        };
        register(options)
          .then((res: any) => {
            localStorage.setItem(`IMaccount`, formData.no);
            localStorage.setItem(`accountProfile-${res.data.userID}`, res.data.chatToken);
            imLogin(res.data.userID, res.data.imToken);
          })
          .catch((err) => handleError(err));
        break;
      case "modify":
        reset(formData.no, formData.areaCode, formData.code, md5((values as FormField).password as string))
          .then(() => {
            message.info(t("ModifyPwdSucTip"));
            toggle("login");
          })
          .catch((err) => handleError(err));

        break;
      default:
        break;
    }
  };

  const getCodeAgain = async () => {
    const isModify = type === "modifycode";
    const result: any = await sendSms(formData.no, formData.areaCode, isModify ? UsedFor.Modify : UsedFor.Register);
    if (result.errCode === 0) {
      message.success(t("SendSuccessTip"));
    } else {
      handleError(result);
    }
  };

  // const setIMInfo = (values: InfoField) => {
  //   values.userID = num;
  //   im.setSelfInfo(values)
  //     .then((res) => {
  //       dispatch(setSelfInfo(values));
  //       navigate("/", { replace: true });
  //     })
  //     .catch((err) => {
  //       toggle("setInfo");
  //       message.error(t("SetInfoFailed"));
  //     });
  // };

  const login = (data: FormField) => {
    localStorage.setItem(`IMaccount`, data.phoneNo);
    loginApi(data.phoneNo, data.areaCode, data.password ? md5(data.password) : undefined, data.verificationCode)
      .then((res) => {
        imLogin(res.data.userID, res.data.imToken);
        localStorage.setItem(`accountProfile-${res.data.userID}`, res.data.chatToken);
      })
      .catch((err) => {
        handleError(err);
      });
  };

  const imLogin = async (userID: string, token: string) => {
    localStorage.setItem(`IMareaCode`, formData.areaCode);
    restStore();
    initEmoji(userID);

    let platformID = window.electron ? window.electron.platform : 5;
    const config: any = {
      userID,
      token,
      apiAddress: getIMApiUrl(),
      wsAddress: getIMWsUrl(),
      platformID,
    };
    im.login(config)
      .then((res) => {
        getStore(userID);
        if (lastType.current === "success") {
          localStorage.setItem(`improfile-${userID}`, token);
          localStorage.setItem(`IMuserID`, userID);
          window.electron?.setStoreKey("IMUserID", userID);
          window.electron?.setStoreKey("IMProfile", token);
          navigate("/", { replace: true });
        }
      })
      .catch((err) => {
        console.log(err);
        handleError(err);
      });
  };

  const restStore = () => {
    dispatch(resetContactStore());
    dispatch(resetUserStore());
    dispatch(resetCveStore());
  };

  const getStore = (userID: string) => {
    dispatch(getSelfInfo());
    dispatch(getCveList());
    dispatch(getFriendList());
    dispatch(getRecvFriendApplicationList());
    dispatch(getSentFriendApplicationList());
    dispatch(getGroupList());
    dispatch(getRecvGroupApplicationList());
    dispatch(getSentGroupApplicationList());
    dispatch(getUnReadCount());
    dispatch(getBlackList());
  };

  const handleError = (error: any) => {
    if (lastType.current === "success") {
      toggle("login");
    }
    message.error(switchLoginError(error.errCode) ?? error.errMsg ?? t("AccessFailed"));
  };

  const toggle = (mtype: Itype) => {
    setType(mtype);
  };

  const closeModal = () => {
    setIsModalVisible(false);
  };

  return (
    <div className="login_container">
      <TopBar />
      <div className="login_wapper">
        <div className="center_container">
          <div className="left_container">
            <div onDoubleClick={() => setIsModalVisible(true)} className="title">
              {t("LoginTitle")}
            </div>
            <span className="sub_title">{t("LoginSubTitle")}</span>
            <img src={login_bg} />
          </div>
          <LoginForm loading={loading} formData={formData} type={lastType.current} finish={finish} getCodeAgain={getCodeAgain} back={back} toggle={toggle} />
        </div>
        {isModalVisible && <IMConfigModal visible={isModalVisible} close={closeModal} />}
      </div>
      <div className="login_bottom"></div>
    </div>
  );
};

export default Login;
