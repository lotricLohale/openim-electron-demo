import { Layout } from "antd";
import { cloneElement, Dispatch, FC, MutableRefObject, SetStateAction, useEffect } from "react";
import { throttle } from "throttle-debounce";

const { Sider } = Layout;

type HomeSiderProps = {};

const HomeSider: FC<HomeSiderProps> = ({ children }) => {
  return (
    <aside className="home_sider">
      <div className="sider_content">
        {
          //@ts-ignore
          cloneElement(children, { marginTop: 58 })
        }
      </div>
      <div className="sider_resize"></div>
      <div className="sider_bar"></div>
    </aside>
  );
};

export default HomeSider;