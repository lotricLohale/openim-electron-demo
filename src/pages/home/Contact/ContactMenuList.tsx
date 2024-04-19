import { Badge, List } from "antd";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { shallowEqual, useSelector } from "react-redux";
import { RootState } from "../../../store";
import department_icon from "@/assets/images/organizational_department.png";
import organizational_logo from "@/assets/images/organizational_logo.png";
import { events, im } from "../../../utils";
import { DepartmentItem } from "../../../utils/open_im_sdk/types";
import { getApplicationIsReaded } from "../../../utils/im";
import { APPLICATION_ACCESS_UPDATE } from "../../../constants/events";

type ConsMenuItemProps = {
  menu: MenuItem;
  onClick: (menu: MenuItem) => void;
  curTab: string;
};

const ConsMenuItem: FC<ConsMenuItemProps> = ({ menu, onClick, curTab }) => {
  const [fps, setFps] = useState(0);
  const [gps, setGps] = useState(0);
  const recvFriendApplicationList = useSelector((state: RootState) => state.contacts.recvFriendApplicationList, shallowEqual);
  const recvGroupApplicationList = useSelector((state: RootState) => state.contacts.recvGroupApplicationList, shallowEqual);

  useEffect(() => {
    events.on(APPLICATION_ACCESS_UPDATE, getUnAccess);
    return () => {
      events.off(APPLICATION_ACCESS_UPDATE, getUnAccess);
    };
  }, []);

  useEffect(() => {
    getUnAccess();
  }, [recvFriendApplicationList, recvGroupApplicationList]);

  const getUnAccess = async () => {
    let fan = 0;
    let gan = 0;
    for (let i = 0; i < recvFriendApplicationList.length; i++) {
      const fa = recvFriendApplicationList[i];
      if (fa.handleResult === 0 && !(await getApplicationIsReaded(fa))) {
        fan += 1;
      }
    }
    for (let i = 0; i < recvGroupApplicationList.length; i++) {
      const ga = recvGroupApplicationList[i];
      if (ga.handleResult === 0 && !(await getApplicationIsReaded(ga))) {
        gan += 1;
      }
    }
    setFps(fan);
    setGps(gan);
  };

  const setCount = (idx: number) => {
    switch (idx) {
      case 1:
        return fps;
      case 2:
        return gps;
      default:
        return 0;
    }
  };

  return (
    <div onClick={() => onClick(menu)} key={menu.idx} className={`cve_item ${menu.title === curTab ? "cve_item_focus" : ""}`}>
      <div className="con_icon">
        <Badge size="small" count={setCount(menu.idx)}>
          <img src={menu.icon} alt="" />
        </Badge>
      </div>
      <div className="con_info">
        <span>{menu.title}</span>
      </div>
    </div>
  );
};

export type MenuItem = {
  title: string;
  icon: string;
  bgc: string;
  id?: string;
  idx: number;
  suffix: string;
};

type ContactListProps = {
  menus: MenuItem[];
  menusClick: (menu: MenuItem) => void;
  curTab: string;
};

const ContactMenuList: FC<ContactListProps> = ({ menus, menusClick, curTab }) => {
  return (
    <div className="cve_list">
      <List className="other" itemLayout="horizontal" dataSource={menus} split={false} renderItem={(item) => <ConsMenuItem curTab={curTab} onClick={menusClick} menu={item} />} />
      <OrzMenuList startIdx={6} renderItem={(item) => <ConsMenuItem curTab={curTab} onClick={menusClick} menu={item} />} />
    </div>
  );
};

export default ContactMenuList;

type OrzMenuListProps = {
  startIdx: number;
  className?: string;
  renderItem: (item: MenuItem) => JSX.Element;
};

export const OrzMenuList: FC<OrzMenuListProps> = ({ startIdx, className, renderItem }) => {
  const selfOrzInfo = useSelector((state: RootState) => state.contacts.organizationInfo, shallowEqual).deps;
  const [orzMenu, setOrzMenu] = useState<MenuItem[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    if (selfOrzInfo.length > 1) {
      let tmpArr = [
        {
          title: t("OrganizationalStructure"),
          icon: department_icon,
          bgc: "",
          id: "Organizational",
          idx: startIdx,
          suffix: selfOrzInfo[0].departmentID,
        },
      ];
      selfOrzInfo.slice(1).forEach((orz, idx) => {
        tmpArr.push({
          title: orz.name,
          icon: department_icon,
          bgc: "",
          id: "OrganizationalSub",
          idx: startIdx + 1 + idx,
          suffix: orz.departmentID,
        });
      });
      setOrzMenu(tmpArr);
    }
  }, [selfOrzInfo]);

  return selfOrzInfo.length > 0 ? (
    <div className={className}>
      <div className="organizational">
        <img src={organizational_logo} width={42} />
        <span className="title">{selfOrzInfo[0].name}</span>
      </div>
      <div className="organizational_box">
        <List itemLayout="horizontal" dataSource={orzMenu} split={false} renderItem={renderItem} />
      </div>
    </div>
  ) : null;
};
