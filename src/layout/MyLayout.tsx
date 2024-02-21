import { Layout } from "antd";
import { FC } from "react";
import { Outlet } from "react-router";
import { shallowEqual, useSelector } from "react-redux";
import { RootState } from "../store";
import ToolsBar from "./ToolsBar";
import TopBar from "../components/TopBar";

type LayoutProps = {

};

const Mylayout: FC<LayoutProps> = (props) => {
  const selectValue = (state: RootState) => state.user.selfInfo;
  const userInfo = useSelector(selectValue, shallowEqual);
  return (
    <Layout style={{ height: "100vh", maxHeight: "100vh" }}>
      <TopBar />
      <Layout id="chat_main">
        <ToolsBar userInfo={userInfo} />
        <Outlet />
      </Layout>
    </Layout>
  );
};

export default Mylayout;
