import win_close from "@/assets/images/topSearchBar/win_close.png";
import win_max from "@/assets/images/topSearchBar/win_max.png";
import win_min from "@/assets/images/topSearchBar/win_min.png";
import langueIcon from "@/assets/images/topSearchBar/langue.png";
import { Select } from "antd";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import "./index.scss";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
const LangueSelect = () => {
  const { i18n } = useTranslation();
  const [langue, setLangue] = React.useState(i18n.language || "zh-cn");
  return (
    <div className="control-bar-langue">
      <img src={langueIcon} alt="langue" />
      <Select
        className="align-middle"
        bordered={false}
        value={langue}
        onChange={(val) => {
          setLangue(val);
          i18n.changeLanguage(val);
        }}
        options={[
          { value: "zh-cn", label: "中文" },
          { value: "en", label: "English" },
        ]}
      />
    </div>
  );
};

const WindowControlBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  console.log(location, history);

  return (
    <div className="window-control-bar">
      <div className="control-bar-button">
        <div className="bar-button-minimizeWindow" onClick={() => window.electron?.miniSizeApp()}>
          <img className="bar-btn-img-min" src={win_min} alt="min" />
        </div>
        <div className="bar-button-maxmizeWindow" onClick={() => window.electron?.maxSizeApp()}>
          <img className="bar-btn-img-max" src={win_max} alt="max" />
        </div>
        <div className="bar-button-closeWindow" onClick={() => window.electron?.closeApp()}>
          <img className="bar-btn-img-close" src={win_close} alt="close" />
        </div>
        <div className="control-bar-history">
          <LeftOutlined
            onClick={() => {
              navigate(-1);
            }}
          />
          <RightOutlined
            onClick={() => {
              navigate(1);
            }}
          />
        </div>
      </div>

      <LangueSelect />
    </div>
  );
};

export default WindowControlBar;
