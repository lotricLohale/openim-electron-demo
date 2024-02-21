import { Input, Button, Checkbox, Form, Select, Spin, Upload, message } from "antd";
import { LeftOutlined } from "@ant-design/icons";
import { FC, useEffect, useState } from "react";
import { UploadRequestOption } from "rc-upload/lib/interface";
import { useToggle, useInterval } from "ahooks";
import { findEmptyValue, switchLoginError, switchUpload } from "../../../utils/common";
import MyAvatar from "../../../components/MyAvatar";
import CodeBox from "./CodeBox";

import { useTranslation } from "react-i18next";
import { Itype } from "../../../@types/open_im";
import { countryCode } from "../../../utils/areaCode";
import { sendSms, UsedFor } from "../../../api/login";
import { useSelector, shallowEqual } from "react-redux";
import { RootState } from "../../../store";

const { Option } = Select;

export type FormField = {
  areaCode: string;
  phoneNo: string;
  password?: string;
  invitationCode?: string;
  verificationCode?: string;
};

export type InfoField = {
  userID: string;
  nickname: string;
  faceURL: string;
};

type IProps = {
  finish: (values?: FormField | string | InfoField) => void;
  toggle: (type: Itype) => void;
  type: Itype | undefined;
  back: () => void;
  getCodeAgain: () => void;
  loading: boolean;
  formData: any;
};

const LoginForm: FC<IProps> = (props) => {
  const { type, loading, finish, back, toggle } = props;
  const { t } = useTranslation();
  const [btmSts, { set: setBtm }] = useToggle();
  const [backSts, { set: setBack }] = useToggle();
  const [checkSts, { toggle: toggleCheck }] = useToggle(true);
  const [sInfo, setSInfo] = useState<InfoField>({
    userID: "userID",
    nickname: "",
    faceURL: `ic_avatar_0${Math.ceil(Math.random() * 6)}`,
  });
  const [passwordForm] = Form.useForm();
  const [loginForm] = Form.useForm();
  const [time, setTime] = useState(60);
  const [interval, setInterval] = useState<number | null>(null);
  const appConfig = useSelector((state: RootState) => state.user.appConfig, shallowEqual);

  useInterval(() => {
    setTime(time! - 1);
    if (time === 1) setInterval(null);
  }, interval as number);

  useEffect(() => {
    const btmShow = ["login", "register", "loginWithCode"];
    const backShow = ["register", "vericode", "modifySend", "modifycode"];
    setBtm(btmShow.includes(type!));
    setBack(backShow.includes(type!));
  }, [type]);

  const phoneRules = [
    {
      message: t("PhoneRule"),
      // pattern: /^(?:(?:\+|00)86)?1\d{10}$/,
      validateTrigger: "onFinish",
    },
  ];

  const pwdRules = [
    {
      message: t("PassWordRule"),
      min: 6,
      max: 20,
      validateTrigger: "onFinish",
    },
  ];

  const rePwdRules = [
    {
      message: t("PassWordRule"),
      min: 6,
      max: 20,
      validateTrigger: "onFinish",
    },
    (ctx: any) => ({
      validator(_: any, value: string) {
        if (!value || ctx.getFieldValue("password") === value) {
          return Promise.resolve();
        }
        return Promise.reject(new Error(t("PassWordRepeat")));
      },
    }),
  ];

  const initialValues = {
    areaCode: localStorage.getItem("IMareaCode") ?? "86",
    phoneNo: type === "login" ? localStorage.getItem("IMaccount") ?? "" : "",
  };

  const comfirmEnter = (value: any) => {
    if (checkSts) {
      finish(value);
    } else {
      message.warn(t("CheckAgreement"));
    }
  };

  const switchBtnText = () => {
    switch (type) {
      case "login":
      case "loginWithCode":
        return t("Login");
      case "register":
        return t("Register");
      case "modifySend":
        return t("GetVerifyCode");
    }
  };

  const getCodeForLogin = () => {
    const { areaCode, phoneNo } = loginForm.getFieldsValue();

    if (interval || !areaCode || !phoneNo) {
      return;
    }

    sendSms(phoneNo, areaCode, UsedFor.Login)
      .then(() => {
        message.success(t("SendSuccessTip"));
        setTime(60);
        setInterval(1000);
      })
      .catch((error) => {
        message.error(switchLoginError(error.errCode) ?? error.errMsg ?? t("AccessFailed"));
      });
  };

  const loginAndRegisterForm = (
    <>
      <div className="form_title">{type === "modifySend" ? t("MissPwd") : t("LoginFormTitle")}</div>
      <Form form={loginForm} onFinish={comfirmEnter} layout="vertical" initialValues={initialValues}>
        <Form.Item className="no_mb" label={t("PhoneNumber")}>
          <Input.Group compact>
            <Form.Item name="areaCode">
              <Select onSearch={() => {}} showSearch bordered={false}>
                {countryCode.map((country) => (
                  <Option key={country.phone_code} value={country.phone_code}>{`+${country.phone_code}`}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="phoneNo" rules={phoneRules}>
              <Input bordered={false} placeholder={t("PhoneNumberTip")} />
            </Form.Item>
          </Input.Group>
        </Form.Item>
        {type === "login" ? (
          <Form.Item name="password" label={t("Password")} rules={pwdRules}>
            <Input.Password style={{ width: "100%" }} bordered={false} placeholder={t("PasswordTip")} allowClear />
          </Form.Item>
        ) : null}
        {type === "register" ? (
          <Form.Item name="invitationCode" label={t("InviteCode")}>
            <Input
              style={{ width: "100%" }}
              bordered={false}
              placeholder={t("InviteCodeTip", { tip: !appConfig.needInvitationCodeRegister ? "(可选)" : "(必填)" })}
              allowClear
            />
          </Form.Item>
        ) : null}
        {type === "loginWithCode" ? (
          <Form.Item name="verificationCode" label={t("Code")}>
            <Input
              style={{ width: "100%" }}
              bordered={false}
              placeholder={t("VerificationCodeTip")}
              allowClear
              suffix={
                <span onClick={getCodeForLogin} style={{ cursor: !interval ? "pointer" : "not-allowed" }} className="get_code_tip">
                  {!interval ? "获取验证码" : `${time}s`}
                </span>
              }
            />
          </Form.Item>
        ) : null}
        <div
          onClick={() => {
            toggle(type === "login" ? "loginWithCode" : "login");
          }}
          className="togge_login_tip"
        >
          {t(type === "loginWithCode" ? "LoginWithPwd" : "LoginWithCode")}
        </div>
        <Form.Item>
          <Button loading={loading} htmlType="submit" type="primary">
            {switchBtnText()}
          </Button>
        </Form.Item>
      </Form>
    </>
  );

  const help = <span style={{ fontSize: "12px", color: "#428be5" }}>{t("PasswolrdNotice")}</span>;

  const setPwd = (
    <>
      <div className="form_title">
        {type === "setPwd" ? t("SetAccountTitle") : t("ModifyPwdTitle")}
        <div className="sub_title">{t("SetAccountSubTitle")}</div>
      </div>
      <Form
        form={passwordForm}
        onFinish={(v) => {
          finish(v);
          passwordForm.resetFields();
        }}
        layout="vertical"
      >
        <Form.Item name="password" label={t("Password")} rules={pwdRules} extra={help}>
          <Input.Password style={{ width: "100%" }} bordered={false} placeholder={t("PasswordTip")} />
        </Form.Item>

        <Form.Item name="rePassword" label={t("ComfirmPassword")} rules={rePwdRules} dependencies={["password"]}>
          <Input.Password style={{ width: "100%" }} bordered={false} placeholder={t("PasswordTip")} />
        </Form.Item>

        <Form.Item style={{ margin: "48px 0 0 0" }}>
          <Button loading={loading} htmlType="submit" type="primary">
            {t("NextStep")}
          </Button>
        </Form.Item>
      </Form>
    </>
  );

  const cusromUpload = async (data: UploadRequestOption) => {
    switchUpload(data).then((res) => setSInfo({ ...sInfo, faceURL: res.data.URL }));
  };

  const setInfo = (
    <>
      <div className="form_title">
        {t("LoginFormTitle")}
        <div className="sub_title">{t("SetInfoSubTitle")}</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <Upload accept="image/*" name="avatar" action={""} customRequest={(data) => cusromUpload(data)} showUploadList={false}>
          <MyAvatar size={72} src={sInfo.faceURL} />
          <div
            style={{
              fontSize: "12px",
              color: "#777",
              marginTop: "8px",
              display: sInfo.faceURL === "" ? "block" : "none",
            }}
          >
            {t("SetAvatar")}
          </div>
        </Upload>
      </div>
      <div className="name_input">
        <div className="name_lable">{t("SetName")}</div>
        <Input
          allowClear={true}
          bordered={false}
          placeholder={t("SetNameNotice")}
          onChange={(v) =>
            setSInfo({
              ...sInfo,
              nickname: v.target.value,
            })
          }
        />
      </div>
      <Button
        loading={loading}
        style={{ marginTop: "48px" }}
        type="primary"
        onClick={() => {
          if (findEmptyValue(sInfo)) {
            finish(sInfo);
          }
        }}
      >
        {t("RegistrationCompleted")}
      </Button>
    </>
  );

  const loadingEl = (
    <div className="loading_spin">
      <Spin size="large" />
    </div>
  );

  const backIcon = (
    <div
      style={{
        position: "absolute",
        top: "14px",
        fontSize: "12px",
        color: "#777",
        cursor: "pointer",
      }}
      onClick={back}
    >
      <LeftOutlined />
      {t("Back")}
    </div>
  );

  const bottomAccess = (
    <div>
      <Checkbox checked={checkSts} defaultChecked={checkSts} onChange={() => toggleCheck()}>
        {t("LoginNotice")}
        <span className="primary">{` ${t("UserAgreement")} `}</span>
        {t("And")}
        <span className="primary">{` ${t("PrivacyAgreement")} `}</span>
      </Checkbox>
      {type === "login" || type === "loginWithCode" ? (
        <div className="access_bottom">
          <span onClick={() => finish("modifySend")}>{t("MissPwd")}</span>
          <span onClick={() => finish("register")}>{t("RegisterNow")}</span>
        </div>
      ) : null}
    </div>
  );

  const getForm = () => {
    switch (type) {
      case "login":
      case "loginWithCode":
      case "register":
      case "modifySend":
        return loginAndRegisterForm;
      case "vericode":
      case "modifycode":
        return <CodeBox {...props} />;
      case "setPwd":
      case "modify":
        return setPwd;
      case "setInfo":
        return setInfo;
      default:
        return loadingEl;
    }
  };

  return (
    <div className="login_form">
      {backSts && backIcon}
      {getForm()}
      {btmSts && bottomAccess}
    </div>
  );
};

export default LoginForm;
