import { LeftOutlined } from "@ant-design/icons";
import { App, Button, Form, Input, InputRef, Select, Space } from "antd";
import md5 from "md5";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BusinessAllowType, useRegister, useSendSms, useVerifyCode } from "@/api/login";
import { useUserStore } from "@/store";
import { setAccount, setAreaCode, setIMProfile } from "@/utils/storage";

import { areaCode } from "./areaCode";
import type { FormType } from "./index";

type RegisterFormProps = {
  setFormType: (type: FormType) => void;
};

type FormFields = {
  phoneNumber: string;
  areaCode: string;
  verifyCode: string;
  invitationCode: string;
  nickname: string;
  password: string;
  password2: string;
};

const RegisterForm = ({ setFormType }: RegisterFormProps) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormFields>();
  const navigate = useNavigate();
  const { mutate: sendSms } = useSendSms();
  const { mutate: verifyCode } = useVerifyCode();
  const { mutate: register } = useRegister();

  // 0手机号 1验证码 2填信息
  const [registerForm, setRegisterForm] = useState(0);

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<InputRef[]>([]);
  const handleInputChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;
    const newCode = [...code];

    if (value.length === 1) {
      newCode[index] = value;
      setCode(newCode);

      if (index < code.length - 1) {
        inputRefs.current[index + 1].focus();
      }
    } else if (value.length === 0) {
      const newCode = [...code];
      newCode[index] = "";
      setCode(newCode);
    }

    const isFilled = newCode.every((input) => input.length > 0);
    if (isFilled) {
      form.submit();
    }
  };
  const handleInputKeyUp = (index: number, event: React.KeyboardEvent) => {
    const keyPressed = event.keyCode || event.which;

    if (keyPressed === 8 && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = "";
      setCode(newCode);
      inputRefs.current[index - 1].focus();
    }

    if (keyPressed === 8 || keyPressed === 46) {
      const newCode = [...code];
      newCode[index] = "";
      setCode(newCode);
    }
  };

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

  const onFinish = (fields: FormFields) => {
    if (registerForm === 0) {
      const pattern = /^1\d{10}$/;
      if (!pattern.test(fields.phoneNumber)) {
        return message.error("请输入合法手机号！");
      }
      sendSms(
        {
          usedFor: 1,
          ...fields,
        },
        {
          onSuccess() {
            setCountdown(60);
            setRegisterForm(1);
            setTimeout(() => inputRefs.current[0].focus());
          },
        },
      );
    }
    if (registerForm === 1) {
      verifyCode(
        {
          ...fields,
          usedFor: 1,
          verifyCode: code.join(""),
        },
        {
          onSuccess() {
            setRegisterForm(2);
          },
        },
      );
    }
    if (registerForm === 2) {
      setAreaCode(fields.areaCode);
      setAccount(fields.phoneNumber);
      register(
        {
          verifyCode: code.join(""),
          autoLogin: true,
          user: {
            nickname: fields.nickname,
            faceURL: "",
            areaCode: fields.areaCode,
            phoneNumber: fields.phoneNumber,
            password: md5(fields.password),
          },
        },
        {
          onSuccess(res) {
            message.success("注册成功");
            const { chatToken, imToken, userID } = res.data;
            setIMProfile({ chatToken, imToken, userID });
            navigate("/chat");
          },
        },
      );
    }
  };

  const sendSmsHandle = () => {
    sendSms(
      {
        phoneNumber: form.getFieldValue("phoneNumber") as string,
        areaCode: form.getFieldValue("areaCode") as string,
        invitationCode: form.getFieldValue("invitationCode") as string,
        usedFor: 1,
      },
      {
        onSuccess() {
          setCountdown(60);
        },
      },
    );
  };

  const back = () => {
    setFormType(0);
    form.resetFields();
  };

  return (
    <div className="flex flex-col justify-between">
      <div className="cursor-pointer text-sm text-gray-400" onClick={back}>
        <LeftOutlined rev={undefined} />
        <span className="ml-1">返回</span>
      </div>
      <div className="mt-4 text-2xl font-medium">
        {registerForm === 0 && <span>新用户注册</span>}
        {registerForm === 1 && <span>验证手机号</span>}
        {registerForm === 2 && <span>设置信息</span>}
      </div>
      <div className="mt-4 tracking-wider text-gray-400" hidden={registerForm !== 1}>
        <span>请输入发送至</span>
        <span className=" text-blue-600">
          {form.getFieldValue("areaCode")} {form.getFieldValue("phoneNumber")}
        </span>
        <span>的 6 位验证码，有效期 10 分钟</span>
      </div>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
        className="mt-4"
        initialValues={{ areaCode: "+86" }}
      >
        <Form.Item label="手机号" hidden={registerForm !== 0}>
          <Space.Compact className="w-full">
            <Form.Item name="areaCode" noStyle>
              <Select options={areaCode} className="!w-28" />
            </Form.Item>
            <Form.Item name="phoneNumber" noStyle>
              <Input allowClear placeholder="请输入您的手机号" />
            </Form.Item>
          </Space.Compact>
        </Form.Item>

        <Form.Item label="" hidden={registerForm !== 1} className="mb-14 mt-8">
          <div className="flex flex-row items-center justify-center">
            {code.map((digit, index) => (
              <Input
                key={index}
                ref={(input: InputRef) => (inputRefs.current[index] = input)}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e)}
                onKeyUp={(e) => handleInputKeyUp(index, e)}
                className="mr-1 h-11 w-11 text-center text-2xl"
              />
            ))}
          </div>
          <div className="mt-4 text-gray-400">
            {countdown > 0 ? (
              <>
                <span className=" text-blue-500">{countdown}s </span>
                <span>后重新获取验证码</span>
              </>
            ) : (
              <>
                <span onClick={sendSmsHandle} className="cursor-pointer text-blue-500">
                  重新获取
                </span>
                <span>验证码</span>
              </>
            )}
          </div>
        </Form.Item>

        <Form.Item label="昵称" name="nickname" hidden={registerForm !== 2}>
          <Input allowClear placeholder="请输入您的昵称" />
        </Form.Item>

        {registerForm === 2 && (
          <Form.Item
            label="密码"
            name="password"
            rules={[
              {
                required: true,
                pattern: /^(?=.*[0-9])(?=.*[a-zA-Z])([a-zA-Z0-9]{6,20})$/,
                message: "请输入6-20位字母+数字组合！",
              },
            ]}
          >
            <Input.Password allowClear placeholder="请输入您的密码" />
          </Form.Item>
        )}

        {registerForm === 2 && (
          <Form.Item
            label="确认密码"
            name="password2"
            rules={[
              {
                required: true,
                message: "请再次确认您的密码",
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
            className="mb-8"
          >
            <Input.Password allowClear placeholder="请再次确认您的密码" />
          </Form.Item>
        )}

        <Form.Item>
          <Button type="primary" htmlType="submit" block>
            {registerForm === 2 ? "完成" : "下一步"}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default RegisterForm;
