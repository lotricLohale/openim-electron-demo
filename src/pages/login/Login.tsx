import { Button, Checkbox, Form, Input, Progress, message } from "antd";
import login_title from "@/assets/images/login/login_title.png";
import googleImg from "@/assets/images/login/google.png";
import twoCheckImg from "@/assets/images/login/twoCheck.png";
import appImg from "@/assets/images/login/app.png";
import qrCodeImg from "@/assets/images/login/qrcode.png";
import portal_top from "@/assets/images/login/portal_top.png";
import successImg from "@/assets/images/login/set_success.png";
import { FormField, InfoField } from "./components/LoginForm";
import { FC, useState } from "react";
import { Itype } from "../../@types/open_im";
import { useHistoryTravel, useLatest } from "ahooks";
import { Route, Routes, useNavigate, useLocation } from "react-router";
import { Trans, useTranslation } from "react-i18next";
import md5 from "md5";
import { getSmsCode, login, phoneLoginCheck, register, reset, sendEmailCode, sendSms, UsedFor, verifyCode, verifyEmailCode } from "../../api/login";
import { im, switchLoginError } from "../../utils";
import { REGISTER_URL, getIMApiUrl, getIMWsUrl } from "../../config";
import { useDispatch } from "react-redux";
import { getSelfInfo, resetUserStore } from "../../store/actions/user";
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
  resetContactStore,
} from "../../store/actions/contacts";
import { initEmoji } from "../../utils/im";
import { useSelector, shallowEqual } from "react-redux";
import { RootState } from "../../store";
import WindowControlBar from "../../components/WindowControlBar";
import { useApiLoading, useDidMountEffect } from "../../hooks/common";
import React from "react";
import { AntPhone } from "../../components/PhoneInput";
import Countdown from "./components/countdown";
import { v4 } from "uuid";
import FormItemText from "./components/formItemText";
import { ResponseData } from "../../types/common";
import LoginBg from "./loginBg";
import { Captcha } from "../../components/src/index";
import ReactCodeInput from "react-code-input";

import "./index.scss";

export type FormType = "init" | "login" | "register" | "qrCode";

const TypeSwitch: FC<{ onChange?: (val: string) => void }> = (props) => {
  const { t } = useTranslation();
  const [loginType, setLoginType] = React.useState("phone");
  useDidMountEffect(() => {
    props.onChange?.(loginType);
  }, [loginType]);
  return (
    <div className={`login-type-switch`} style={{ backgroundColor: "#fff" }}>
      {/* <div className={`${loginType === "phone" ? "type-active" : ""}`} onClick={() => setLoginType("phone")}>
        <span>{t("login.phoneLogin")}</span>
      </div>
      <div className={`${loginType === "qrCode" ? "type-active" : ""}`} onClick={() => setLoginType("qrCode")}>
        <span>{t("login.qrCodeLogin")}</span>
      </div> */}
    </div>
  );
};
export interface LoginProps {
  initLogin?: {
    userID: string;
    token: string;
    dialCode: string;
    callBack: Function;
  };
  modal?: boolean;
}

const Login: FC<LoginProps> = (props) => {
  const { initLogin, modal } = props;

  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    no: "",
    code: "",
    pwd: "",
    areaCode: "86",
    invitationCode: "",
  });
  const { value: type, setValue: setType } = useHistoryTravel<string>("checkLogin");
  const appConfig = useSelector((state: RootState) => state.user.appConfig, shallowEqual);
  const dataRef = React.useRef<{ [name: string]: any }>({});
  const CaptchaRef = React.useRef<any>();
  const checkFucRef = React.useRef<any>();
  const reStartRef = React.useRef<Function>();
  const lastType = useLatest(type);
  const loginType = React.useMemo(() => {
    return location.href.split("?loginType=")[1];
  }, []);
  const finish = async (values?: FormField | string | InfoField) => {
    const lType = typeof values === "string" ? values : lastType.current;
    switch (lType) {
      case "checkLogin":
        const checkSubmit = { phoneNumber: (values as FormField).phone };
        const checkInfo = await phoneLoginCheck(checkSubmit);
        if (checkInfo.errCode !== 0) return;
        dataRef.current = { ...dataRef.current, ...checkSubmit, ...checkInfo.data, ...(values as FormField) };
        lastType.current = "initGetCode";
        finish(checkInfo.data.AccountStatus === "non_existent" ? "registerInitGetCode" : "initGetCode");
        navigate(`/login/${checkInfo.data.AccountStatus === "non_existent" ? "register" : "login"}`, { replace: true });
        break;
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
            !loginType && localStorage.setItem(`IMaccount`, formData.no);
            !loginType && localStorage.setItem(`accountProfile-${res.data.userID}`, res.data.chatToken);
            imLogin(res.data.userID, res.data.imToken);
          })
          .catch((err) => handleError(err));
        break;
      case "registerNoEmail":
      case "registerHasEmail":
        const checkAreaCode = `+${dataRef.current.phoneData.country.dialCode}`;
        const registerParams: any = {
          password: md5(dataRef.current.password),
          platform: 3,
          operationID: v4(),
          DeviceName: "pc",
          verificationCode: dataRef.current.verificationCode,
          phoneNumber: dataRef.current.phoneNumber.split(checkAreaCode)[1],
          areaCode: dataRef.current.areaCode,
          nickname: dataRef.current.nickname,
          tip: dataRef.current.tip,
        };
        if (lType === "registerHasEmail") {
          registerParams.email = dataRef.current.email;
          registerParams.emailCode = dataRef.current.emailCode;
        }
        const registerData: any = await register(registerParams);
        if (registerData.errCode !== 0) return;
        !loginType && localStorage.setItem(`IMaccount`, dataRef.current.phoneNumber);
        !loginType && localStorage.setItem(`accountProfile-${registerData.data.userID}`, registerData.data.chatToken);
        imLogin(registerData.data.userID, registerData.data.imToken);
        break;
      case "modify":
        reset(formData.no, formData.areaCode, formData.code, md5((values as FormField).password as string))
          .then(() => {
            message.info(t("ModifyPwdSucTip"));
            toggle("login");
          })
          .catch((err) => handleError(err));

        break;
      // 获取验证码
      case "getCode":
      case "registerGetCode":
      case "registerInitGetCode":
      case "initGetCode":
        const areaCode = `+${dataRef.current.phoneData.country.dialCode}`;
        const subData = {
          phoneNumber: dataRef.current.phoneNumber.split(areaCode)[1],
          areaCode: areaCode,
          usedFor: lType === "registerGetCode" || lType === "registerInitGetCode" ? 1 : 3,
          platform: 3,
          operationID: v4(),
        };
        let codeData = await getSmsCode(subData);
        // 判断是否需要滑块
        if (codeData.errCode === 10001) {
          // 传入滑块校验方法
          checkFucRef.current = async (url: string, data: any) => {
            const cData = await getSmsCode({ ...subData, captchaType: data.captchaType, token: data.token, pointJson: data.pointJson });
            if (cData.errCode !== 0) return;
            message.success(t("register.sendCodeSuccess"));
            reStartRef.current?.();
            return cData;
          };
          CaptchaRef.current?.verify();
          return;
        }
        if (lType === "initGetCode" || codeData.errCode !== 0) return;
        message.success(t("register.sendCodeSuccess"));
        break;
      // 邮箱验证码
      case "getEmailCode":
      case "initEmailCode":
        const { email } = dataRef.current;
        const emailCodeData: ResponseData = await sendEmailCode({
          NewEmail: email,
        });
        if (type === "initEmailCode" || emailCodeData.errCode !== 0) return;
        message.success(t("register.sendCodeSuccess"));
        break;
    }
  };

  const imLogin = async (userID: string, token: string, dialCode?: string) => {
    if (!!loginType) {
      let accountList: any = localStorage.getItem("qieqie_localAccountList");
      if (accountList) {
        accountList = JSON.parse(accountList);
      } else {
        accountList = {};
      }
      accountList[userID] = {
        dialCode: dataRef.current.phoneData.country.dialCode,
        userID,
        token,
      };
      localStorage.setItem("qieqie_localAccountList", JSON.stringify(accountList));
      window.electron?.accountLoginClose();
      return;
    }
    localStorage.setItem(`IMareaCode`, dialCode ?? dataRef.current.phoneData.country.dialCode);
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
        restStore();
        initEmoji(userID);
        getStore(userID);
        localStorage.setItem(`improfile-${userID}`, token);
        localStorage.setItem(`IMuserID`, userID);
        window.electron?.setStoreKey("IMUserID", userID);
        window.electron?.setStoreKey("IMProfile", token);
        let accountList: any = localStorage.getItem("qieqie_localAccountList");
        if (accountList) {
          accountList = JSON.parse(accountList) || {};
          accountList[userID] = {
            dialCode: dataRef.current.phoneData.country.dialCode,
            userID,
            token,
          };
          localStorage.setItem("qieqie_localAccountList", JSON.stringify(accountList));
        }
        navigate("/", { replace: true });
        window.electron.setLoginMain();
      })
      .catch((err) => {
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
  React.useEffect(() => {
    if (initLogin || modal || loginType) {
      if (initLogin) {
        initLogin.callBack();
        imLogin(initLogin.userID, initLogin.token, initLogin.dialCode);
      }
      return;
    }
    window.electron?.setLoginInit();
    navigate("/login", { replace: true });
    setTimeout(() => {
      window.electron?.focusHomePage();
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initLogin]);
  if (initLogin) return null;
  const LoginForm = () => {
    const [form] = Form.useForm();
    const { loading, apiLoading } = useApiLoading();
    const [loginType, setLoginType] = useState("phone");
    const [showProtocol, setShowProtocol] = useState(false);
    return (
      <>
        <TypeSwitch onChange={(val) => setLoginType(val)} />
        <div className="rtc-diy-form" style={{ display: loginType === "phone" ? undefined : "none" }}>
          <Form
            form={form}
            layout="vertical"
            autoComplete="off"
            onFinish={(val) => apiLoading(finish)(val)}
            initialValues={{
              protocol: true,
            }}
          >
            <Form.Item
              shouldUpdate
              label={t("login.phone")}
              name={"phone"}
              // rules={[
              //   {
              //     validator: (_, value) => {
              //       return `+${phoneData?.country.dialCode} ${phoneData?.country.format}`.length === phoneData?.inputValue.length
              //         ? Promise.resolve()
              //         : Promise.reject(new Error(t("login.phoneError") as string));
              //     },
              //   },
              // ]}
            >
              <div>
                <AntPhone
                  placeholder={t("login.phonePlaceholder")}
                  onChange={(data) => {
                    lastType.current = "checkLogin";
                    dataRef.current["phoneData"] = data;
                    form.setFieldsValue({ phone: data.phone });
                    form.validateFields(["phone"]);
                  }}
                />
              </div>
            </Form.Item>
            <Form.Item
              name="protocol"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, value) => {
                    return value ? Promise.resolve() : Promise.reject(new Error(t("login.protocolCheck") as string));
                  },
                },
              ]}
            >
              <Checkbox
                onClick={(e) => {
                  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                  (e.target as any)?.checked && setShowProtocol(true);
                }}
                className="rtc-check-protocol"
              >
                <Trans
                  t={t}
                  i18nKey="login.protocolTips"
                  components={{
                    service: (
                      <span
                        className="protocol-click"
                        onClick={(e) => {
                          window.electron.openExternal("https://www.qieqieapp.com/tos-cn.html");
                          e.preventDefault();
                        }}
                      ></span>
                    ),
                    privacy: (
                      <span
                        className="protocol-click"
                        onClick={(e) => {
                          window.electron.openExternal("https://www.qieqieapp.com/privacy-cn.html");
                          e.preventDefault();
                        }}
                      ></span>
                    ),
                  }}
                />
              </Checkbox>
            </Form.Item>
            <Form.Item shouldUpdate className="absolute bottom-0 mb-0 w-full">
              {() => {
                return (
                  <Button
                    size="large"
                    className="rtc-form-btn"
                    htmlType="submit"
                    disabled={!form.isFieldsTouched(["phone"]) || !!form.getFieldsError().filter(({ errors }) => errors.length).length}
                    loading={loading}
                    block
                  >
                    {t("login.registerLogin")}
                  </Button>
                );
              }}
            </Form.Item>
          </Form>
        </div>
        <div className="rtc-diy-qrCode" style={{ display: loginType === "qrCode" ? undefined : "none" }}>
          <p>{t("login.qrCodeLoginTips")}</p>
          <img src={qrCodeImg} alt="qrCode" />
        </div>
        <div className={`login-protocol-model login-protocol-model-${showProtocol}`}>
          <div className="protocol-model-content">
            <img src={portal_top} alt="" />
            <div className="protocol-model-content-title">{t("login.protocolTitle")}</div>
            <div className="protocol-model-content-context">
              <Trans
                t={t}
                i18nKey="login.protocolTipsInfo"
                components={{
                  service: (
                    <span
                      className="protocol-click"
                      onClick={(e) => {
                        window.electron.openExternal("https://www.qieqieapp.com/tos-cn.html");
                        e.preventDefault();
                      }}
                    ></span>
                  ),
                  privacy: (
                    <span
                      className="protocol-click"
                      onClick={(e) => {
                        window.electron.openExternal("https://www.qieqieapp.com/privacy-cn.html");
                        e.preventDefault();
                      }}
                    ></span>
                  ),
                }}
              />
            </div>
            <Button
              size="large"
              className="rtc-form-btn"
              onClick={() => {
                setShowProtocol(false);
                form.setFieldsValue({ protocol: true });
              }}
              block
              style={{ marginBottom: "16px" }}
            >
              {t("login.agree")}
            </Button>
            <Button
              size="large"
              onClick={() => {
                setShowProtocol(false);
                form.setFieldsValue({ protocol: false });
                form.validateFields();
              }}
              className="rtc-form-btn rtc-form-btn-default"
              block
            >
              {t("login.reject")}
            </Button>
          </div>
        </div>
      </>
    );
  };
  const InitLogin = () => {
    return (
      <>
        <LoginBg />
        <div className="login-main-box login-main-div">
          <div className="login-box-main">
            <div className="login-box-main-title">
              <img src={login_title} alt="title" />
            </div>
            <div className="login-box-main-welcome"> {t("login.tips")}</div>
            <div className="login-box-main-form">
              <LoginForm />
            </div>
            {!loginType && (
              <Button
                size="large"
                className="login-box-download"
                block
                onClick={() => {
                  window.electron.openExternal("https://qieqieapp.com");
                }}
                icon={<img style={{ marginRight: "8px" }} src={appImg} alt="download" />}
              >
                {t("login.appDownloadTips")}
              </Button>
            )}
          </div>
        </div>
      </>
    );
  };
  const Login = () => {
    const [form] = Form.useForm();
    const { loading, apiLoading } = useApiLoading();
    const codeFinish = async (values: ResponseData) => {
      const { code } = form.getFieldsValue();
      const checkAreaCode = `+${dataRef.current.phoneData.country.dialCode}`;
      const subData = {
        phoneNumber: dataRef.current.phoneNumber.split(checkAreaCode)[1],
        areaCode: checkAreaCode,
        verificationCode: code,
        usedFor: 3,
        platform: 3,
        operationID: v4(),
      };
      const checkData: ResponseData = await verifyCode(subData);
      if (checkData?.errCode !== 0) return;
      dataRef.current = { ...subData, ...dataRef.current };
      navigate("/login/loginPwd", { replace: true });
    };
    lastType.current = "getCode";
    return (
      <div className="login-login login-main-div">
        <div className="login-login-title">{t("login.login")}</div>
        <Progress type="line" size="small" percent={33} width={274} style={{ height: "3px" }} strokeColor="#0E1013" trailColor="#F3F4F5" showInfo={false} />
        <div className="login-login-tips">{t("register.sendCode")}</div>
        <div className="login-login-value">{dataRef.current.phoneNumber || "-"}</div>
        <div className="rtc-diy-form">
          <Form form={form} layout="vertical" onFinish={(val) => apiLoading(codeFinish)(val)} autoComplete="off">
            <Form.Item
              name="code"
              required={false}
              label={t("register.codeLabel")}
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <ReactCodeInput className="qieqie_code_input" type="number" name={"code"} fields={6} inputMode={"numeric"} />
            </Form.Item>
            <Form.Item>
              <Countdown initCountDown={true} reStartRef={reStartRef} onClick={() => finish("getCode")}>
                {t("register.sendCodeAgain")}
              </Countdown>
            </Form.Item>
            <Form.Item style={{ marginTop: "150px" }} shouldUpdate>
              {() => {
                return (
                  <Button
                    size="large"
                    className="rtc-form-btn"
                    htmlType="submit"
                    block
                    disabled={loading || !form.isFieldsTouched(true) || !!form.getFieldsError().filter(({ errors }) => errors.length).length}
                    loading={loading}
                  >
                    {t("register.next")}
                  </Button>
                );
              }}
            </Form.Item>
          </Form>
        </div>
      </div>
    );
  };
  const LoginPwd = () => {
    const [form] = Form.useForm();
    const [loginType, setLoginType] = React.useState(dataRef.current.IsSetGoogleKey ? "google" : "password");
    const { loading, apiLoading } = useApiLoading();
    const operate = async (type: string, val: any) => {
      switch (type) {
        case "password":
          const { password } = form.getFieldsValue();
          const pwdAreaCode = `+${dataRef.current.phoneData.country.dialCode}`;
          const params = {
            operationID: v4(),
            phoneNumber: dataRef.current.phoneNumber.split(pwdAreaCode)[1],
            areaCode: pwdAreaCode,
            verificationCode: dataRef.current.verificationCode,
            password: md5(password),
          };
          !loginType && localStorage.setItem(`IMaccount`, dataRef.current.phoneNumber.split(pwdAreaCode)[1]);
          const resData: ResponseData = await login(params);
          imLogin(resData.data.userID, resData.data.imToken);
          !loginType && localStorage.setItem(`accountProfile-${resData.data.userID}`, resData.data.chatToken);
          break;
      }
    };
    const TypeNode = React.useMemo(() => {
      if (loginType === "password")
        return (
          <>
            <img className="pwd-img" src={twoCheckImg} alt="twoCheck" />
            <div className="pwd-tips">{t("login.stepCheck")}</div>
            <div className="pwd-tips-info">
              <Trans
                t={t}
                i18nKey="login.stepCheckTips"
                components={{
                  br: <br />,
                }}
              />
            </div>
            <div className="rtc-diy-form">
              <Form
                form={form}
                layout="vertical"
                onFinish={(val) => {
                  apiLoading(operate)("password", val);
                }}
                autoComplete="off"
              >
                <Form.Item
                  name="password"
                  required={false}
                  rules={[
                    {
                      required: true,
                      message: t("login.pwdLabel") as string,
                    },
                  ]}
                >
                  <Input.Password size="large" placeholder={t("login.pwdLabel")} />
                </Form.Item>
                <Form.Item style={{ marginTop: "60px" }} shouldUpdate>
                  {() => {
                    return (
                      <Button
                        size="large"
                        className="rtc-form-btn"
                        htmlType="submit"
                        block
                        loading={loading}
                        disabled={!form.isFieldsTouched(true) || !!form.getFieldsError().filter(({ errors }) => errors.length).length}
                      >
                        {t("login.login")}
                      </Button>
                    );
                  }}
                </Form.Item>
                {dataRef.current.IsSetGoogleKey && (
                  <Form.Item shouldUpdate>
                    <Button
                      size="large"
                      className="rtc-form-btn rtc-form-btn-default"
                      block
                      onClick={() => {
                        setLoginType(loginType === "password" ? "google" : "password");
                      }}
                    >
                      {t("login.googleLogin")}
                    </Button>
                  </Form.Item>
                )}
              </Form>
            </div>
          </>
        );
      return (
        <>
          <img className="google-img" src={googleImg} alt="google" />
          <div className="google-tips">
            <Trans
              t={t}
              i18nKey="login.googleLoginTips"
              components={{
                br: <br />,
              }}
            />
          </div>
          <div className="rtc-diy-form">
            <Form form={form} layout="vertical" onFinish={(val) => apiLoading(finish)(val)} autoComplete="off">
              <Form.Item
                name="password"
                required={false}
                rules={[
                  {
                    required: true,
                    message: t("login.googleLabel") as string,
                  },
                ]}
              >
                <Input size="large" placeholder={t("login.googleLabel")} />
              </Form.Item>
              <Form.Item style={{ marginTop: "204px" }} shouldUpdate>
                <Button
                  size="large"
                  className="rtc-form-btn rtc-form-btn-default"
                  block
                  onClick={() => {
                    setLoginType(loginType === "password" ? "google" : "password");
                  }}
                >
                  {t("login.pwdLoginBtn")}
                </Button>
              </Form.Item>
            </Form>
          </div>
        </>
      );
    }, [loginType, form, apiLoading, loading]);
    return (
      <div className="login-login-pwd login-main-div">
        <div className="pwd-title">{t("login.login")}</div>
        {TypeNode}
      </div>
    );
  };
  const Register = () => {
    const [stepPercent, setStepPercent] = React.useState(33);
    const location = useLocation();
    const codeFinish = async (values: ResponseData) => {
      const { code } = values;
      const checkAreaCode = `+${dataRef.current.phoneData.country.dialCode}`;
      const subData = {
        phoneNumber: dataRef.current.phoneNumber.split(checkAreaCode)[1],
        areaCode: checkAreaCode,
        verificationCode: code,
        usedFor: 1,
        platform: 3,
        operationID: v4(),
      };
      const checkData: ResponseData = await verifyCode(subData);
      if (checkData.errCode !== 0) return;
      dataRef.current = { ...subData, ...dataRef.current };
      navigate("/login/register/twoStep", { replace: true });
    };
    const stepTitle = React.useMemo(() => {
      const pathTitle: { [name: string]: string } = {
        "/login/register": t("register.register"),
        "/login/register/twoStep": t("register.registerTwo"),
        "/login/register/threeStep": t("register.registerThree"),
        "/login/register/setEmailStep": t("register.registerThree1"),
      };
      return pathTitle[location.pathname] || t("register.register");
    }, [location.pathname]);
    lastType.current = "register";
    React.useEffect(() => {
      switch (location.pathname) {
        case "/login/register/twoStep":
          setStepPercent(66);
          break;
        case "/login/register":
          setStepPercent(33);
          break;
        default:
          setStepPercent(100);
      }
    }, [location.pathname]);
    const OneStep = () => {
      const [form] = Form.useForm();
      const { loading, apiLoading } = useApiLoading();
      return (
        <>
          <div className="login-login-tips">{t("register.sendCode")}</div>
          <div className="login-login-value">{dataRef.current.phoneNumber}</div>
          <div className="rtc-diy-form">
            <Form form={form} layout="vertical" onFinish={apiLoading(codeFinish)} autoComplete="off">
              <Form.Item
                name="code"
                required={false}
                label={t("register.codeLabel")}
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <ReactCodeInput className="qieqie_code_input" type="number" name={"code"} fields={6} inputMode={"numeric"} />
              </Form.Item>
              <Form.Item>
                <Countdown initCountDown={true} reStartRef={reStartRef} onClick={() => finish("registerGetCode")}>
                  {t("register.sendCodeAgain")}
                </Countdown>
              </Form.Item>
              <Form.Item style={{ marginTop: "150px" }} shouldUpdate>
                {() => {
                  return (
                    <Button
                      size="large"
                      className="rtc-form-btn"
                      htmlType="submit"
                      block
                      loading={loading}
                      disabled={loading || !form.isFieldsTouched(true) || !!form.getFieldsError().filter(({ errors }) => errors.length).length}
                    >
                      {t("register.next")}
                    </Button>
                  );
                }}
              </Form.Item>
            </Form>
          </div>
        </>
      );
    };
    const TwoStep = () => {
      const [form] = Form.useForm();
      return (
        <>
          <div style={{ marginTop: "24px" }} className="login-login-value">
            {t("register.passwordLoginTips")}QieQie
          </div>
          <div className="rtc-diy-form rtc-register-form">
            <Form
              form={form}
              layout="vertical"
              onFinish={() => {
                const { password, userName, question } = form.getFieldsValue();
                dataRef.current = { ...dataRef.current, password, nickname: userName, tip: question || "" };
                navigate("/login/register/threeStep", { replace: true });
              }}
              autoComplete="off"
              className="rtc-diy-form relative"
            >
              <Form.Item
                name="userName"
                style={{ marginBottom: "24px" }}
                required={false}
                label={t("register.userName")}
                rules={[
                  {
                    required: true,
                    message: t("register.userNameLabel") as string,
                  },
                  {
                    max: 20,
                    message: t("register.userNameRule") as string,
                  },
                ]}
              >
                <Input placeholder={t("register.userNameRule") as string} />
              </Form.Item>
              <Form.Item
                name="password"
                required={false}
                className="mb-[12px]"
                label={t("register.password")}
                tooltip={t("register.passwordRuleTips")}
                rules={[
                  {
                    required: true,
                    message: t("register.passwordLabel") as string,
                  },
                  {
                    min: 6,
                    message: t("register.passwordRule") as string,
                  },
                  {
                    max: 20,
                    message: t("register.passwordRule") as string,
                  },
                ]}
              >
                <Input.Password placeholder={t("register.passwordLabel") as string} />
              </Form.Item>
              <Form.Item
                style={{ marginBottom: "24px" }}
                name="passwordAgain"
                dependencies={["password"]}
                required={false}
                rules={[
                  {
                    required: true,
                    message: t("register.passwordAgainLabel") as string,
                  },
                  {
                    validator: (_, value) => {
                      const { password } = form.getFieldsValue();
                      if (!value || password === value) {
                        return Promise.resolve();
                      }
                      if (value.length < 6 || value.length > 20) {
                        return Promise.reject(new Error(t("register.passwordRule") as string));
                      }
                      return Promise.reject(new Error(t("register.passwordNotMatch") as string));
                    },
                  },
                ]}
              >
                <Input.Password placeholder={t("register.passwordAgainLabel") as string} />
              </Form.Item>
              <Form.Item label={t("register.passwordTipsLabel")} name="question" required={false}>
                <Input placeholder={t("register.passwordTips") as string} />
              </Form.Item>
              <Form.Item style={{ marginTop: "80px" }} shouldUpdate>
                {() => {
                  return (
                    <Button
                      size="large"
                      className="rtc-form-btn"
                      htmlType="submit"
                      block
                      disabled={
                        !form.isFieldTouched("password") ||
                        !form.isFieldTouched("passwordAgain") ||
                        !form.isFieldTouched("userName") ||
                        !!form.getFieldsError().filter(({ errors }) => errors.length).length
                      }
                    >
                      {t("register.next")}
                    </Button>
                  );
                }}
              </Form.Item>
            </Form>
          </div>
        </>
      );
    };
    const ThreeStep = () => {
      const [form] = Form.useForm();
      return (
        <div className="rtc-diy-form" style={{ marginTop: "70px" }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={() => {
              const { email } = form.getFieldsValue();
              dataRef.current["email"] = email;
              finish("initEmailCode");
              navigate("/login/register/setEmailStep", { replace: true });
            }}
            autoComplete="off"
          >
            <Form.Item>
              <FormItemText>{t("register.emailTips")}</FormItemText>
            </Form.Item>
            <Form.Item
              name="email"
              required={false}
              rules={[
                {
                  required: true,
                  message: t("register.emailLabel") as string,
                },
                {
                  type: "email",
                  message: t("register.emailCheck") as string,
                },
              ]}
            >
              <Input placeholder={t("register.emailLabel") as string} />
            </Form.Item>
            <Form.Item style={{ marginTop: "70px" }} shouldUpdate>
              {() => {
                return (
                  <Button
                    size="large"
                    className="rtc-form-btn"
                    htmlType="submit"
                    block
                    disabled={!form.isFieldsTouched(true) || !!form.getFieldsError().filter(({ errors }) => errors.length).length}
                  >
                    {t("register.emailBtn")}
                  </Button>
                );
              }}
            </Form.Item>
            <Form.Item shouldUpdate className="w-full">
              <Button size="large" className="rtc-form-btn rtc-form-btn-default" block onClick={() => finish("registerNoEmail")}>
                {t("register.skipBtn")}
              </Button>
            </Form.Item>
          </Form>
        </div>
      );
    };
    const SetEmailStep = () => {
      const [form] = Form.useForm();
      const { loading, apiLoading } = useApiLoading();
      const checkEmailCode = async () => {
        const { code } = form.getFieldsValue();
        const verifyEmailData: ResponseData = await verifyEmailCode({
          Code: code,
          Type: "ChangeEmail",
          Email: dataRef.current.email,
        });
        if (verifyEmailData.errCode !== 0) return;
        dataRef.current["emailCode"] = code;
        navigate("/login/register/final", { replace: true });
      };
      return (
        <>
          <div className="login-login-tips">{t("register.sendCode")}</div>
          <div className="login-login-value">{dataRef.current.email}</div>
          <div className="rtc-diy-form">
            <Form
              form={form}
              layout="vertical"
              onFinish={() => {
                apiLoading(checkEmailCode)();
              }}
              autoComplete="off"
            >
              <Form.Item
                name="code"
                required={false}
                label={t("register.codeLabel")}
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <ReactCodeInput className="qieqie_code_input" type="number" name={"code"} fields={6} inputMode={"numeric"} />
              </Form.Item>
              <Form.Item>
                <Countdown initCountDown={true} reStartRef={reStartRef} onClick={() => finish("getEmailCode")}>
                  {t("register.sendCodeAgain")}
                </Countdown>
              </Form.Item>
              <Form.Item style={{ marginTop: "150px" }} shouldUpdate>
                {() => {
                  return (
                    <Button
                      size="large"
                      className="rtc-form-btn"
                      htmlType="submit"
                      block
                      loading={loading}
                      disabled={loading || !form.isFieldsTouched(true) || !!form.getFieldsError().filter(({ errors }) => errors.length).length}
                    >
                      {t("Confirm")}
                    </Button>
                  );
                }}
              </Form.Item>
            </Form>
          </div>
        </>
      );
    };
    const FinalStep = () => {
      const [form] = Form.useForm();
      const { loading, apiLoading } = useApiLoading();
      return (
        <div className="register-final">
          <img className="final-img" src={successImg} alt="register" />
          <div className="final-tips">{t("register.emailSetSuccess")}</div>
          <div className="final-value">
            {t("register.emailNewLabel")}
            {dataRef.current.email}
          </div>
          <Form form={form} onFinish={() => apiLoading(finish)("registerHasEmail")} layout="vertical" autoComplete="off" className="rtc-diy-form">
            <Form.Item shouldUpdate>
              <Button size="large" className="rtc-form-btn" htmlType="submit" loading={loading} disabled={loading} block>
                {t("finish")}
              </Button>
            </Form.Item>
          </Form>
        </div>
      );
    };
    return (
      <div className="login-login login-main-div">
        {location.pathname !== "/login/register/final" && (
          <>
            <div className="login-login-title">
              {location.pathname === "/login/register/twoStep" && <div className="account-info-tips">{t("register.userInfoTips")}</div>}
              {stepTitle}
            </div>
            <Progress type="line" size="small" percent={stepPercent} width={274} style={{ height: "3px" }} strokeColor="#0E1013" trailColor="#F3F4F5" showInfo={false} />
          </>
        )}
        <Routes>
          <Route index element={<OneStep />} />
          <Route path="twoStep" element={<TwoStep />} />
          <Route path="threeStep" element={<ThreeStep />} />
          <Route path="setEmailStep" element={<SetEmailStep />} />
          <Route path="final" element={<FinalStep />} />
        </Routes>
      </div>
    );
  };

  return (
    <div className="login-main">
      <WindowControlBar onlyClose={Boolean(loginType)} />
      <Captcha
        checkFuc={checkFucRef}
        getUrl={`${REGISTER_URL}/account/get_block_puzzle`}
        onSuccess={(data) => console.log(data)}
        checkUrl={`${REGISTER_URL}/account/get_block_puzzle`}
        type="auto"
        ref={CaptchaRef}
      ></Captcha>
      <Routes>
        <Route index element={<InitLogin />} />
        <Route path="login" element={<Login />} />
        <Route path="loginPwd" element={<LoginPwd />} />
        <Route path="register/*" element={<Register />} />
      </Routes>
    </div>
  );
};

export default Login;
