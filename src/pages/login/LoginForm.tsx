import { Button, Form, Input, QRCode, Select, Space } from "antd";
import md5 from "md5";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useLogin, useSendSms } from "@/api/login";
import login_pc from "@/assets/images/login/login_pc.png";
import login_qr from "@/assets/images/login/login_qr.png";
import { getAccount, setAccount, setAreaCode, setIMProfile } from "@/utils/storage";

import { areaCode } from "./areaCode";
import type { FormType } from "./index";

// 0密码 1验证码 2扫码
type LoginType = 0 | 1 | 2;

type LoginFormProps = {
  setFormType: (type: FormType) => void;
};

const LoginForm = ({ setFormType }: LoginFormProps) => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loginType, setLoginType] = useState<LoginType>(0);
  const { mutate: login, isLoading: loginLoading } = useLogin();
  const { mutate: semdSms } = useSendSms();

  const [countdown, setCountdown] = useState(0);
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prevCountdown) => prevCountdown - 1);
        if (countdown === 1) {
          clearTimeout(timer);
          setCountdown(0);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const onFinish = (params: API.Login.LoginParams) => {
    if (loginType === 0) {
      params.password = md5(params.password ?? "");
    }
    setAreaCode(params.areaCode);
    setAccount(params.phoneNumber);
    login(params, {
      onSuccess: (data) => {
        const { chatToken, imToken, userID } = data.data;
        setIMProfile({ chatToken, imToken, userID });
        navigate("/chat");
      },
    });
  };

  const sendSmsHandle = () => {
    semdSms(
      {
        phoneNumber: form.getFieldValue("phoneNumber") as string,
        areaCode: form.getFieldValue("areaCode") as string,
        usedFor: 3,
      },
      {
        onSuccess() {
          setCountdown(60);
        },
      },
    );
  };

  const Point = () => (
    <div
      className="relative h-16 w-16 cursor-pointer rounded-md"
      style={{
        background: "linear-gradient(to bottom left, #DBEAFE 50%, white 50%)",
      }}
      onClick={() => setLoginType(loginType === 2 ? 0 : 2)}
    >
      <img
        src={loginType === 2 ? login_pc : login_qr}
        alt="login"
        className=" absolute left-[25px] top-[15px]"
      />
    </div>
  );

  if (loginType === 2) {
    return (
      <>
        <div className="flex flex-row items-end justify-end">
          <Point />
        </div>

        <div className=" flex flex-col items-center">
          <div className="text-xl font-medium">扫码登录</div>
          <span className=" mt-3 text-sm  text-gray-400">
            请使用OpenIM移动端扫描二维码
          </span>
          <QRCode className="mt-8" value="https://www.openim.online/zh" size={190} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-row items-center justify-between">
        <div className="text-xl font-medium">欢迎使用OpenIM</div>
        {/* <Point /> */}
      </div>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
        className="mt-6"
        initialValues={{
          areaCode: "+86",
          phoneNumber: getAccount() ?? "",
        }}
      >
        <Form.Item label="账号">
          <Space.Compact className="w-full">
            <Form.Item name="areaCode" noStyle>
              <Select options={areaCode} className="!w-28" />
            </Form.Item>
            <Form.Item name="phoneNumber" noStyle>
              <Input allowClear placeholder="请输入您的账号" />
            </Form.Item>
          </Space.Compact>
        </Form.Item>

        <Form.Item label="密码" name="password">
          <Input.Password allowClear placeholder="请输入您的密码" />
        </Form.Item>

        <Form.Item className="mt-24">
          <Button type="primary" htmlType="submit" block loading={loginLoading}>
            登录
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

export default LoginForm;
