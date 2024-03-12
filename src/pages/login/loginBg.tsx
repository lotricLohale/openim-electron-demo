import login_bg from "@/assets/images/login/login_bg.png";
import login_bg_icon_1 from "@/assets/images/login/login_bg_icon_1.png";
import login_bg_icon_2 from "@/assets/images/login/login_bg_icon_2.png";
import login_bg_icon_3 from "@/assets/images/login/login_bg_icon_3.png";
import "./index.scss";

const LoginBg = () => {
  return (
    <div className="login-bg-box">
      <img className="login-bg" src={login_bg} alt="login-bg" />
      <div className="login-icon-box">
        <img className="login-icon login-icon-1" src={login_bg_icon_1} alt="login-bg" />
        <img className="login-icon login-icon-2" src={login_bg_icon_2} alt="login-bg" />
        <img className="login-icon login-icon-3" src={login_bg_icon_3} alt="login-bg" />
      </div>
    </div>
  );
};

export default LoginBg;
