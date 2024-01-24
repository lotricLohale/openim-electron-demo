import { useState } from "react";
import { useCopyToClipboard } from "react-use";

import login_bg from "@/assets/images/login/login_bg.png";
import WindowControlBar from "@/components/WindowControlBar";
import { feedbackToast } from "@/utils/common";

import styles from "./index.module.scss";
import LoginForm from "./LoginForm";
import ModifyForm from "./ModifyForm";
import RegisterForm from "./RegisterForm";

export type FormType = 0 | 1 | 2;

export const Login = () => {
  // 0登录 1忘记密码 2注册
  const [formType, setFormType] = useState<FormType>(0);

  const [_, copyToClipboard] = useCopyToClipboard();

  const LeftBar = () => (
    <div className="no-mobile flex min-h-[420]">
      <div className="mr-14 text-center">
        <div className="text-2xl">在线化办公</div>
        <span className="text-sm  text-gray-400">多人协作，打造高效办公方式</span>
        <img src={login_bg} alt="login_bg" />
      </div>
    </div>
  );

  return (
    <div className="relative flex h-full flex-col">
      <div className="app-drag relative h-10 bg-[var(--top-search-bar)]">
        <WindowControlBar />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <LeftBar />
        <div
          className={`${styles.login} h-[450px] w-[350px] rounded-md p-11 sm:mr-14`}
          style={{ boxShadow: "0 0 30px rgba(0,0,0,.1)" }}
        >
          {formType === 0 && <LoginForm setFormType={setFormType} />}
          {formType === 1 && <ModifyForm setFormType={setFormType} />}
          {formType === 2 && <RegisterForm setFormType={setFormType} />}
        </div>
      </div>
      <div
        className="absolute bottom-3 right-3 flex cursor-pointer flex-col items-center text-xs"
        onClick={() => {
          copyToClipboard(`OpenIM tob-enterprise-rtc-3.2.1/SDK v3.2.1-e-v1.0.1`);
          feedbackToast({ msg: "复制成功！" });
        }}
      >
        <div className="text-[var(--sub-text)]">OpenIM tob-enterprise-rtc-3.2.1</div>
        <div className="text-[var(--sub-text)]">SDK v3.2.1-e-v1.0.1</div>
      </div>
    </div>
  );
};
