import { Badge, Divider } from "antd";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import department_icon from "@/assets/images/contact/department_icon.png";
import group_notifications from "@/assets/images/contact/group_notifications.png";
import my_friends from "@/assets/images/contact/my_friends.png";
import my_groups from "@/assets/images/contact/my_groups.png";
import new_friends from "@/assets/images/contact/new_friends.png";
import DepartmentIcon from "@/components/DepartmentIcon";
import FlexibleSider from "@/components/FlexibleSider";
import OIMAvatar from "@/components/OIMAvatar";
import { useContactStore, useUserStore } from "@/store";

const Links = [
  {
    label: "新的好友",
    icon: new_friends,
    path: "/contact/newFriends",
  },
  {
    label: "群通知",
    icon: group_notifications,
    path: "/contact/groupNotifications",
  },
  {
    label: "我的好友",
    icon: my_friends,
    path: "/contact",
  },
  {
    label: "我的群组",
    icon: my_groups,
    path: "/contact/myGroups",
  },
];

const ContactSider = () => {
  const [selectIndex, setSelectIndex] = useState(2);
  const organizationInfo = useUserStore((state) => state.organizationInfo);
  const departments = useUserStore((state) => state.selfInfo.members ?? []).map(
    (item) => item.department,
  );
  const unHandleFriendApplicationCount = useContactStore(
    (state) => state.unHandleFriendApplicationCount,
  );
  const unHandleGroupApplicationCount = useContactStore(
    (state) => state.unHandleGroupApplicationCount,
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (location.hash.includes("/contact/newFriends")) {
      setSelectIndex(0);
    }
    if (location.hash.includes("/contact/groupNotifications")) {
      setSelectIndex(1);
    }
    if (location.hash.includes("/contact/myGroups")) {
      setSelectIndex(3);
    }
  }, []);

  const getBadge = (index: number) => {
    if (index === 0) {
      return unHandleFriendApplicationCount;
    }
    if (index === 1) {
      return unHandleGroupApplicationCount;
    }
    return 0;
  };

  const showOrganization = (departmentID = "0") => {
    setSelectIndex(-1);
    navigate(`/contact/organization/${departmentID}`);
  };

  return (
    <FlexibleSider needHidden={true}>
      <div className="h-full bg-white">
        <div className="pb-3 pl-5.5 pt-5.5 text-base font-extrabold">通讯录</div>
        <ul>
          {Links.map((item, index) => {
            return (
              <li
                key={item.path}
                className={clsx(
                  "mx-2 flex cursor-pointer items-center rounded-md p-3 text-sm hover:bg-[var(--primary-active)]",
                  {
                    "bg-[#f3f8fe]": index === selectIndex,
                  },
                )}
                onClick={() => {
                  setSelectIndex(index);
                  navigate(String(item.path));
                }}
              >
                <Badge size="small" count={getBadge(index)}>
                  <img
                    alt={item.label}
                    src={item.icon}
                    className="mr-3 h-10.5 w-10.5 rounded-md"
                  />
                </Badge>
                <div className="text-sm">{item.label}</div>
              </li>
            );
          })}
        </ul>
        <ul>
          <li className="mx-5 my-3 border-t border-[var(--gap-text)]" />
          <li className="mx-2 flex items-center rounded-md p-3 text-sm">
            <OIMAvatar src={organizationInfo.logoURL} isdepartment />
            <div className="ml-3 truncate">{organizationInfo.name}</div>
          </li>
          <li
            onClick={() => showOrganization()}
            className="mx-2 flex cursor-pointer items-center rounded-md p-3 text-sm hover:bg-[var(--primary-active)]"
          >
            <div className="flex h-[42px] min-w-[42px] items-center justify-center">
              <img width={9} src={department_icon} alt="" />
            </div>
            <div className="ml-3 truncate">组织架构</div>
          </li>
          {departments.map((department) => (
            <li
              onClick={() => showOrganization(department.departmentID)}
              key={department.departmentID}
              className="mx-2 flex cursor-pointer items-center rounded-md p-3 text-sm hover:bg-[var(--primary-active)]"
            >
              <DepartmentIcon src={department.faceURL} />
              <div className="ml-3 truncate">{department.name}</div>
            </li>
          ))}
        </ul>
      </div>
    </FlexibleSider>
  );
};
export default ContactSider;
