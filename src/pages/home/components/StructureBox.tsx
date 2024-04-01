import { CloseOutlined, LoadingOutlined, RightOutlined, SearchOutlined } from "@ant-design/icons";
import { Breadcrumb, Checkbox, Empty, Input, message } from "antd";
import { FC, forwardRef, memo, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
// import { getDeptList, getDeptUserList } from "../../../api/world_window";
import { shallowEqual, useSelector } from "react-redux";
import { RootState } from "../../../store";
import { useDebounceFn, useLatest, useReactive, useUpdate } from "ahooks";
import { getAllTags } from "../../../api/tag";
import tag_icon from "@/assets/images/tag_icon.png";
import my_tag from "@/assets/images/my_tag.png";
import { debounce, throttle } from "throttle-debounce";
import MyAvatar from "../../../components/MyAvatar";
import List from "rc-virtual-list";
import my_friend from "@/assets/images/my_friend.png";
import my_group from "@/assets/images/group_icon.png";
import nomal_cons from "@/assets/images/nomal_cons.png";
import label_icon from "@/assets/images/label_icon.png";
import organizational_logo from "@/assets/images/organizational_logo.png";
import { MenuItem, OrzMenuList } from "../Contact/ContactMenuList";
import { genAvatar, im } from "../../../utils";
import { ConversationItem, DepartmentItem, DepartmentMemberItem, FriendItem, GroupMemberItem, GroupRole, PublicUserItem } from "../../../utils/open_im_sdk/types";
import { Loading } from "../../../components/Loading";

interface CheckFields {
  uuid: string;
  showName: string;
  check: boolean;
  disabled: boolean;
}
type MyDepartmentItem = DepartmentItem & CheckFields;
type MyDepartmentMemberItem = DepartmentMemberItem & CheckFields;
type MyFriendItem = FriendItem & CheckFields;
type MyConversationItem = ConversationItem & CheckFields;

type StructureBoxProps = {
  preList?: any[];
  showGroup?: boolean;
  showTag?: boolean;
  showCve?: boolean;
  isInvite?: InviteType;
  getRole?: boolean;
  onChanged: (selected: any[]) => void;
};

export enum InviteType {
  Nomal = 0,
  Group = 1,
  InGroup = 2,
}

type Step = "menu" | "cate" | "user" | "tag" | "group" | "friend" | "in_group";
type LeftMenuType = "CommonContacts" | "MyFriends" | "MyGroups" | "Tags" | "Organizational" | "OrganizationalSub";

type RSType = {
  step: Step;
  curDepID: string;
  tagList: any[];
  renderList: any[];
  prvRenderList: any[];
  preDisableList: string[];
  checkedList: any[];
  allCheck: boolean;
  navs: any[];
  searchFlag: boolean;
  searchText: string;
  loading: boolean;
};

const StructureBox: FC<StructureBoxProps> = ({ preList = [], showGroup = false, showTag = false, showCve = false, isInvite = InviteType.Nomal, getRole = false, onChanged }) => {
  const { t } = useTranslation();
  const selfID = useSelector((state: RootState) => state.user.selfInfo.userID, shallowEqual);
  const fullState = useSelector((state: RootState) => state.user.fullState, shallowEqual);
  const groupList = useSelector((state: RootState) => state.contacts.groupList, shallowEqual);
  const friendList = useSelector((state: RootState) => state.contacts.friendList, shallowEqual);
  const groupMemberList = useSelector((state: RootState) => state.contacts.groupMemberList, shallowEqual);
  const groupInfo = useSelector((state: RootState) => state.contacts.groupInfo, shallowEqual);
  const cves = useSelector((state: RootState) => state.cve.cves, shallowEqual);
  const rs = useReactive<RSType>({
    step: isInvite === InviteType.InGroup ? "in_group" : "menu",
    curDepID: "",
    tagList: [],
    renderList: [],
    prvRenderList: [],
    preDisableList: [],
    checkedList: [],
    allCheck: false,
    navs: [],
    searchFlag: false,
    searchText: "",
    loading: false,
  });
  const bodyLeftRef = useRef<HTMLDivElement>(null);
  const bodyRightRef = useRef<HTMLDivElement>(null);
  const [vListState, setVListState] = useState({
    item: 0,
    check: 0,
    cate: 0,
  });
  const latestStep = useLatest(rs.step);
  const latestSearchFlag = useLatest(rs.searchFlag);

  useEffect(() => {
    window.addEventListener("resize", resizeHandler);
    return () => {
      window.removeEventListener("resize", resizeHandler);
    };
  }, []);

  const resizeHandler = () => {
    const navEl = document.getElementsByClassName("struct_nav")[0];
    setVListState({
      item:
        bodyLeftRef.current?.clientHeight! -
        (navEl?.clientHeight ?? 0) -
        (latestStep.current === "cate" || latestStep.current === "in_group" || latestSearchFlag.current ? 52 : 89),
      check: bodyRightRef.current?.clientHeight! - 55,
      cate: bodyLeftRef.current?.clientHeight! - 62 - (navEl?.clientHeight ?? 0),
    });
  };

  useEffect(() => {
    const navEl = document.getElementsByClassName("struct_nav")[0];
    setVListState({
      item:
        bodyLeftRef.current?.clientHeight! -
        (navEl?.clientHeight ?? 0) -
        (latestStep.current === "cate" || latestStep.current === "in_group" || latestSearchFlag.current ? 52 : 89),
      check: bodyRightRef.current?.clientHeight! - 55,
      cate: bodyLeftRef.current?.clientHeight! - 62 - (navEl?.clientHeight ?? 0),
    });
  }, [rs.navs.length, fullState, rs.searchFlag]);

  useEffect(() => {
    if (isInvite === InviteType.InGroup) {
      let currentMember: GroupMemberItem | undefined;
      if (getRole) {
        im.getGroupMembersInfo({ groupID: groupInfo.groupID, userIDList: [selfID] }).then(({ data }) => {
          currentMember = JSON.parse(data)[0];
          updateGroupMembers(currentMember);
        });
      }
      updateGroupMembers();
    }
  }, [groupMemberList]);

  useEffect(() => {
    rs.checkedList = preList ?? [];
  }, []);

  useEffect(() => {
    onChanged(rs.checkedList);
  }, [rs.checkedList]);

  const getDisabledList = async (userList: PublicUserItem[]) => {
    if (isInvite === InviteType.Nomal) {
      return;
    }
    try {
      const { data } = await im.getGroupMembersInfo({ groupID: groupInfo.groupID, userIDList: userList.map((friend) => friend.userID) });
      rs.preDisableList = JSON.parse(data).map((member: GroupMemberItem) => member.userID);
    } catch (error) {}
  };

  const updateGroupMembers = (currentMember?: GroupMemberItem) => {
    rs.renderList = groupMemberList.map((member: any) => {
      member.check = false;
      const roleDisable = getRole && currentMember ? currentMember?.roleLevel === GroupRole.Admin && member.roleLevel !== GroupRole.Nomal : false;
      member.disabled = rs.preDisableList.includes(member.userID) || member.userID === selfID || roleDisable;
      member.uuid = member.userID;
      member.showName = member.nickname;
      return member;
    });
  };

  const updateUserFields = (userList: MyDepartmentMemberItem[] | MyFriendItem[]) => {
    let allCheckFlag = true;
    userList.forEach((user) => {
      const idx = rs.checkedList.findIndex((check) => check.uuid === user.userID);
      user.uuid = user.userID;
      user.check = idx > -1;
      user.showName = user.nickname;
      user.disabled = rs.preDisableList.includes(user.userID) || user.userID === selfID;
      if (idx === -1 && !user.disabled) {
        allCheckFlag = false;
      }
    });
    rs.allCheck = allCheckFlag;
    rs.renderList = userList;
  };

  const updateConversationFields = () => {
    const conversations = [...cves] as MyConversationItem[];
    let allCheckFlag = true;
    conversations.map((cve) => {
      const idx = rs.checkedList.findIndex((check) => check.uuid === cve.userID || check.uuid === cve.groupID);
      cve.uuid = cve.userID || cve.groupID;
      cve.check = idx > -1;
      cve.disabled = rs.preDisableList.includes(cve.userID) || cve.userID === selfID;
      if (idx === -1 && !cve.disabled) {
        allCheckFlag = false;
      }
    });
    rs.allCheck = allCheckFlag;
    rs.renderList = conversations;
  };

  const updateTagFields = (tagList: any[]) => {
    let allCheckFlag = true;
    tagList.forEach((tag: any) => {
      const fid = rs.checkedList.findIndex((check) => check.tagID === tag.tagID);
      tag.check = fid !== -1;
      tag.disabled = false;
      tag.uuid = tag.tagID;
      tag.showName = tag.tagName;
      if (fid === -1 && !tag.disabled) allCheckFlag = false;
    });
    rs.renderList = tagList;
    rs.allCheck = allCheckFlag;
  };

  const updateGroupFields = (groupList: any[]) => {
    let allCheckFlag = true;
    groupList.forEach((group) => {
      const fid = rs.checkedList.findIndex((check) => check.groupID === group.groupID);
      group.check = fid !== -1;
      group.disabled = false;
      group.uuid = group.groupID;
      group.showName = group.groupName;
      if (fid === -1 && !group.disabled) allCheckFlag = false;
    });
    rs.renderList = groupList;
    rs.allCheck = allCheckFlag;
  };

  const getDepMembers = async (departmentID: string) => {};

  const getDepList = async (departmentID: string) => {};

  const orzClick = async (item: MenuItem) => {
    const depID = item.suffix;
    const label = item.title;
    const isSub = item.id !== "Organizational";
    rs.curDepID = depID;
    isSub ? await getDepMembers(depID) : await getDepList(depID);
    rs.step = isSub ? "user" : "cate";
    rs.navs.push({ label, id: depID });
  };

  const clickMenu = async (type: LeftMenuType) => {
    rs.searchFlag = false;
    rs.searchText = "";
    rs.loading = true;
    switch (type) {
      case "CommonContacts":
        rs.step = "friend";
        rs.navs.push({ label: "最近聊天", id: "" });
        updateConversationFields();
        break;
      case "MyFriends":
        rs.step = "friend";
        rs.navs.push({ label: t("MyFriends"), id: "" });
        const tmpFArr = [...(friendList as MyFriendItem[])];
        await getDisabledList(friendList);
        updateUserFields(tmpFArr);
        break;
      case "Tags":
        rs.step = "tag";
        rs.navs.push({ label: t("Label"), id: "" });
        const tagRes = await getAllTags();
        const tagData = tagRes.data.tags ?? [];
        updateTagFields(tagData);
        break;
      case "MyGroups":
        rs.step = "group";
        rs.navs.push({ label: t("MyGroups"), id: "" });
        updateGroupFields([...groupList]);
        break;
    }
    rs.loading = false;
  };

  const depClick = async (dep: MyDepartmentItem) => {
    rs.curDepID = dep.departmentID;
    rs.navs.push({ label: dep.name, id: dep.departmentID });
    if (dep.subDepartmentNum) {
      await getDepList(dep.departmentID);
    } else {
      rs.step = "user";
      await getDepMembers(dep.departmentID);
    }
    rs.searchFlag = false;
    rs.searchText = "";
  };

  const reset = () => {
    rs.navs = [];
    rs.step = "menu";
    rs.searchFlag = false;
    rs.searchText = "";
  };

  const handleNavi = async (id: string) => {
    await getDepList(id);
    const idx = rs.navs.findIndex((nav) => nav.id === id);
    rs.navs = rs.navs.slice(0, idx + 1);
    rs.step = "cate";
    rs.searchFlag = false;
    rs.searchText = "";
  };

  const renderNav = () => {
    return (
      isInvite !== InviteType.InGroup &&
      rs.navs.length > 0 && (
        <Breadcrumb className="struct_nav" separator=">">
          <Breadcrumb.Item onClick={reset}>{t("Contact")}</Breadcrumb.Item>
          {rs.navs.map((item, index) => {
            return (
              <Breadcrumb.Item key={index} onClick={() => handleNavi(item.id)}>
                {item.label}
              </Breadcrumb.Item>
            );
          })}
        </Breadcrumb>
      )
    );
  };

  const cancelSelect = (item: any, needDiff?: boolean) => {
    const idx = rs.checkedList.findIndex((check) => check.uuid === item.uuid);
    const tmpArr = [...rs.checkedList];
    tmpArr.splice(idx, 1);

    rs.checkedList = tmpArr;
    const ridx = rs.renderList.findIndex((render) => render.uuid === item.uuid);
    const pidx = rs.prvRenderList.findIndex((render) => render.uuid === item.uuid);

    if (ridx !== -1) {
      rs.renderList[ridx] = { ...rs.renderList[ridx], check: false };
    }
    if (pidx !== -1) {
      rs.prvRenderList[pidx] = { ...rs.prvRenderList[pidx], check: false };
    }
    if (needDiff) {
      const fid = rs.renderList.findIndex((render) => !render.check && render.uuid !== selfID && !render.disabled);
      rs.allCheck = fid === -1;
    }
  };

  const checkClick = (val: boolean, item: any) => {
    if (val && rs.checkedList.length === 10) {
      message.warning(t("MaxNumRtcTip"));
      return;
    }
    if (val) {
      const idx = rs.renderList.findIndex((render) => render.uuid === item.uuid);
      rs.renderList[idx].check = true;
      rs.checkedList = [...rs.checkedList, item];
      if (rs.prvRenderList.length > 0) {
        const pidx = rs.prvRenderList.findIndex((render) => render.uuid === item.uuid);
        if (pidx !== -1) rs.prvRenderList[pidx].check = true;
      }
    } else {
      cancelSelect(item);
    }
    const fid = rs.renderList.findIndex((render) => !render.check && render.uuid !== selfID && !render.disabled);
    rs.allCheck = fid === -1;
  };

  const allCheck = (val: boolean) => {
    rs.renderList.forEach((render) => (render.uuid !== selfID && !render.disabled ? (render.check = val) : ""));
    if (val) {
      const tmpCheck = rs.checkedList.reduce((total, check) => [...total, check.uuid], []);
      rs.renderList.forEach((render) => {
        if (!tmpCheck.includes(render.uuid) && render.uuid !== selfID && !render.disabled) {
          rs.checkedList = [...rs.checkedList, render];
        }
      });
    } else {
      const cTmpCheck = rs.renderList.reduce((total, render) => [...total, render.uuid], []);
      rs.checkedList = rs.checkedList.filter((check) => !cTmpCheck.includes(check.uuid));
    }
    rs.allCheck = val;
  };

  const searchFun = (value: string) => {
    if (value === "") {
      let allCheckFlag = true;
      const skipList = ["menu", "cate", "tag", "group"];
      if (!skipList.includes(rs.step)) {
        rs.prvRenderList.forEach((user: any) => {
          if (!user.check) allCheckFlag = false;
        });
      }
      rs.renderList = rs.prvRenderList;
      rs.searchFlag = false;
      rs.allCheck = allCheckFlag;
    } else {
      rs.loading = true;
      if (!rs.searchFlag) {
        rs.prvRenderList = rs.renderList;
        rs.searchFlag = true;
      }
      filterList(value);
    }
  };

  const filterList = (val: string) => {
    if (rs.step === "menu") {
      searchInOrz(val);
    } else {
      const labelkey = "showName";
      rs.renderList = rs.prvRenderList.filter((render) => render[labelkey].includes(val));
      rs.loading = false;
    }
  };

  const searchInOrz = (value: string) => {};

  const { run: debounceSearch } = useDebounceFn(searchFun, { wait: 500 });

  const onSearchChanged = (val: string) => {
    rs.searchText = val;
    debounceSearch(val);
  };

  const menuList = [
    {
      title: "最近聊天",
      icon: nomal_cons,
      id: "CommonContacts",
      visible: showCve,
    },
    {
      title: t("MyFriends"),
      icon: my_friend,
      id: "MyFriends",
      visible: true,
    },
    {
      title: t("MyGroups"),
      icon: my_group,
      id: "MyGroups",
      visible: showGroup,
    },
    {
      title: t("Tags"),
      icon: my_tag,
      id: "Tags",
      visible: showTag,
    },
  ];

  const NomalList = useMemo(
    () =>
      rs.loading ? (
        <Loading />
      ) : rs.renderList.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("NoData")} />
      ) : (
        <div className="left_nomal_list">
          <List
            height={vListState.item}
            data={rs.renderList}
            itemHeight={50}
            itemKey={(render) => render.userID ?? render.departmentID ?? render.tagID ?? render.groupID}
            children={(render) => <NomalItem render={render} checkClick={checkClick} depClick={depClick} />}
          />
        </div>
      ),
    [rs.loading, rs.renderList, vListState.item, rs.checkedList]
  );

  const switchStep = () => {
    switch (rs.step) {
      case "menu":
        if (rs.searchFlag) {
          return NomalList;
        }
        return (
          <div className="left_menus">
            {menuList.map(
              (menu) =>
                menu.visible && (
                  <div key={menu.id} onClick={() => clickMenu(menu.id as LeftMenuType)} className="cate_item">
                    <div className="left_title">
                      <img src={menu.icon} />
                      <span>{menu.title}</span>
                    </div>
                    <RightOutlined />
                  </div>
                )
            )}
            <OrzMenuList
              className="orz_menus"
              startIdx={5}
              renderItem={(item) => (
                <div key={item.suffix} onClick={() => orzClick(item)} className="cate_item">
                  <div className="left_title">
                    <div className="orz_icon">
                      <img src={item.icon} />
                    </div>
                    <span>{item.title}</span>
                  </div>
                </div>
              )}
            />
          </div>
        );
      case "cate":
      case "user":
      case "tag":
      case "group":
      case "friend":
      case "in_group":
        return rs.loading ? (
          <Loading />
        ) : rs.renderList.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("NoData")} />
        ) : (
          <div className="left_nomal_list">
            {!rs.searchFlag && rs.step !== "cate" && rs.step !== "in_group" && (
              <div className="dep_item">
                <Checkbox checked={rs.allCheck} onChange={(e) => allCheck(e.target.checked)}>
                  <span className="label">全选</span>
                </Checkbox>
              </div>
            )}

            <List
              height={vListState.item}
              data={rs.renderList}
              itemHeight={50}
              itemKey={(render) => render.userID || render.departmentID || render.tagID || render.groupID}
              children={(render) => <NomalItem render={render} checkClick={checkClick} depClick={depClick} />}
            />
          </div>
        );
    }
  };

  const switchSrc = (item: any) => {
    if (item.faceURL) {
      return item.faceURL;
    } else if (item.tagName) {
      return my_tag;
    } else if (item.groupName) {
      return my_group;
    } else if (item.departmentID) {
      return item.nickname ? genAvatar(item.nickname, 38) : organizational_logo;
    } else {
      return null;
    }
  };

  const switchName = (item: any) => {
    if (item.groupName || item.tagName) {
      return "";
    } else {
      return item.showName;
    }
  };

  return (
    <div className="orz_body">
      <div ref={bodyLeftRef} className="body_left">
        <div className="left_search">
          <Input value={rs.searchText} onChange={(e) => onSearchChanged(e.target.value)} placeholder={t("Search")} prefix={<SearchOutlined />} />
        </div>
        {renderNav()}
        {switchStep()}
      </div>
      <div ref={bodyRightRef} className="body_right">
        <div className="selcted_desc">{t("SelectItem", { num: rs.step === "in_group" ? `${rs.checkedList.length}/10` : rs.checkedList.length })}</div>
        <List
          height={vListState.check}
          data={rs.checkedList}
          itemHeight={48}
          itemKey={"uuid"}
          children={(checked) => (
            <div className="selected_item">
              <div className="selected_info">
                <MyAvatar src={switchSrc(checked)} size={38} />
                <span className="title">{checked.showName}</span>
              </div>
              <CloseOutlined onClick={() => cancelSelect(checked, true)} />
            </div>
          )}
        />
      </div>
    </div>
  );
};

export default StructureBox;

type NomalItemProps = {
  render: any;
  checkClick: (isChecked: boolean, render: any) => void;
  depClick: (render: any) => void;
};

const NomalItem: FC<NomalItemProps> = memo(
  forwardRef(({ render, checkClick, depClick }, ref) => {
    const isDep = render.departmentType !== undefined;
    const update = useUpdate();

    const innerClick = (e: any) => {
      checkClick(e.target.checked, render);
      update();
    };

    return (
      <div onClick={() => (!isDep ? null : depClick(render))} className="dep_item">
        {!isDep ? (
          <Checkbox disabled={render.disabled} checked={render.check} onChange={innerClick}>
            <InnerItem render={render} />
          </Checkbox>
        ) : (
          <InnerItem render={render} />
        )}
        {isDep && <RightOutlined />}
      </div>
    );
  }),
  (p, n) => p.render.check === n.render.check
);

const InnerItem = memo(({ render }: { render: any }) => {
  const switchSrc = (item: any) => {
    if (item.faceURL) {
      return item.faceURL;
    } else if (item.tagName) {
      return my_tag;
    } else if (item.groupName) {
      return my_group;
    } else if (item.position) {
      return genAvatar(item.nickname, 38);
    } else if (item.departmentID) {
      return organizational_logo;
    } else {
      return null;
    }
  };

  return (
    <div className="wrap">
      <MyAvatar src={switchSrc(render)} size={38} />
      <div className="dep_item_info">
        <span className="label">{render.showName ?? render.name ?? render.nickname}</span>
      </div>
    </div>
  );
});
