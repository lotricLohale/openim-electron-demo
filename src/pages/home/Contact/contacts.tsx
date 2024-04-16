import { Layout, Modal } from "antd";
import { useRef, useState } from "react";
import HomeSider from "../components/HomeSider";
import ContactMenuList, { MenuItem } from "./ContactMenuList";
import my_friend from "@/assets/images/my_friend.png";
import my_group from "@/assets/images/group_icon.png";
import nomal_cons from "@/assets/images/nomal_cons.png";
import label_icon from "@/assets/images/label_icon.png";
import department_icon from "@/assets/images/organizational_department.png";
import new_friend from "@/assets/images/new_friend.png";
import new_group from "@/assets/images/new_group.png";
import HomeHeader from "../components/HomeHeader";
import ContactContent from "./ContactContent";
import { useTranslation } from "react-i18next";

const { Content } = Layout;

const showBtmIDList = [1,2,4,5]

const Contacts = () => {
  const { t } = useTranslation();
  const consMenuList = [
    {
      title: t("CommonContacts"),
      icon: nomal_cons,
      bgc: "#FEC757",
      idx: 0,
      suffix: "nc",
    },
    {
      title: t("NewFriend"),
      icon: new_friend,
      bgc: "#428BE5",
      idx: 1,
      suffix: "nf",
    },
    {
      title: t("NewGroups"),
      icon: new_group,
      bgc: "#428BE5",
      idx: 2,
      suffix: "ng",
    },
    {
      title: t("MyFriends"),
      icon: my_friend,
      bgc: "#428BE5",
      idx: 3,
      suffix: "mf",
    },
    {
      title: t("MyGroups"),
      icon: my_group,
      bgc: "#53D39C",
      idx: 4,
      suffix: "mg",
    },
    // {
    //   title: t("Label"),
    //   icon: label_icon,
    //   bgc: "#428BE5",
    //   idx: 5,
    //   suffix: "lb",
    // },
  ];
  const [menu, setMenu] = useState(consMenuList[3]);

  const clickMenuItem = (item: MenuItem) => {
    if (item.idx !== menu.idx) {
      setMenu(item);
    }

  };
  

  return (
    <>
      <HomeSider>
        <ContactMenuList curTab={menu.title} menusClick={clickMenuItem} menus={consMenuList} />
      </HomeSider>
      <Layout>
        {<HomeHeader title={menu.idx < 6 ? menu.title : null} isShowBt={showBtmIDList.includes(menu.idx)} type="contact" />}
        <Content className="total_content">
          <ContactContent menu={menu} />
        </Content>
      </Layout>
    </>
  );
};

export default Contacts;
