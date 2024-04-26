import { useUpdateEffect } from "ahooks";
import { FC, memo, useEffect, useState } from "react";
import { useSelector, shallowEqual, useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import { CommonContacts } from "../../../@types/open_im";
import ContactList from "../../../components/ContactList";
import { APPLICATION_ACCESS_UPDATE, APPLICATION_TYPE_UPDATE, CLEAR_SEARCH_INPUT, TO_ASSIGN_CVE } from "../../../constants/events";
import { GroupTypes } from "../../../constants/messageContentType";
import { RootState } from "../../../store";
import { setGroupMemberLoading } from "../../../store/actions/contacts";
import { events } from "../../../utils";
import { getCommonContacts, updateReadedApplications } from "../../../utils/im";
import { FriendItem, GroupItem, PublicUserItem, SessionType } from "../../../utils/open_im_sdk/types";
import { MenuItem } from "./ContactMenuList";
import GroupList from "./GroupList";
import LabelList from "./LabelList";
import NewNotice from "./NewNotice";
import Organizational from "./Organizational";

type ContactContentProps = {
  menu: MenuItem;
};

const ContactContent: FC<ContactContentProps> = ({ menu }) => {
  const friendList = useSelector((state: RootState) => state.contacts.friendList, shallowEqual);
  const groupList = useSelector((state: RootState) => state.contacts.groupList, shallowEqual);
  const selfID = useSelector((state: RootState) => state.user.selfInfo.userID, shallowEqual);
  const recvFriendApplicationList = useSelector((state: RootState) => state.contacts.recvFriendApplicationList, shallowEqual);
  const sentFriendApplicationList = useSelector((state: RootState) => state.contacts.sentFriendApplicationList, shallowEqual);
  const recvGroupApplicationList = useSelector((state: RootState) => state.contacts.recvGroupApplicationList, shallowEqual);
  const sentGroupApplicationList = useSelector((state: RootState) => state.contacts.sentGroupApplicationList, shallowEqual);
  const selfOrzInfo = useSelector((state: RootState) => state.contacts.organizationInfo, shallowEqual).deps;
  const [renderType, setRenderType] = useState<"recv" | "sent">("recv");
  const [commonList, setCommonList] = useState<CommonContacts[]>([]);
  const [searchFlag, setSearchFlag] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    events.on(APPLICATION_TYPE_UPDATE, applicationUpdateHandler);
    getCommonList();
    return () => {
      events.off(APPLICATION_TYPE_UPDATE, applicationUpdateHandler);
    };
  }, []);

  useUpdateEffect(() => {
    if (menu.idx === 1 || menu.idx === 2) {
      setRenderType("recv");
    }
    if (searchFlag) {
      setSearchFlag(false);
      events.emit(CLEAR_SEARCH_INPUT);
    }
  }, [menu]);

  const applicationUpdateHandler = (type: "recv" | "sent") => {
    setRenderType(type);
  };

  const getCommonList = async () => {
    const tmpList: any = await getCommonContacts();
    setCommonList(tmpList.filter((user: CommonContacts) => user.owenerID === selfID));
  };

  const clickListItem = (item: FriendItem | GroupItem, type: SessionType) => {
    if (GroupTypes.includes(type)) {
      dispatch(
        setGroupMemberLoading({
          loading: true,
          hasMore: true,
        })
      );
    }
    navigate("/");
    setTimeout(() => {
      events.emit(TO_ASSIGN_CVE, type === SessionType.Single ? (item as FriendItem).userID : (item as GroupItem).groupID, type);
    }, 0);
  };

  const checkStore = async (renderList: any[]) => {
    await updateReadedApplications(renderList.filter((item) => item.handleResult === 0));
    events.emit(APPLICATION_ACCESS_UPDATE);
  };

  const switchContent = () => {
    switch (menu.idx) {
      case 1:
      case 2:
        let tmpList;
        if (!searchFlag) {
          if (menu.idx === 1 && renderType === "recv") {
            let tObj: { [name: string]: boolean } = {};
            tmpList = recvFriendApplicationList?.filter((item) => {
              return tObj[item.fromUserID] ? false : (tObj[item.fromUserID] = true);
            });
          } else if (menu.idx === 1 && renderType === "sent") {
            tmpList = sentFriendApplicationList;
          } else if (menu.idx === 2 && renderType === "recv") {
            tmpList = recvGroupApplicationList;
          } else if (menu.idx === 2 && renderType === "sent") {
            tmpList = sentGroupApplicationList;
          }
        }
        tmpList?.sort((a, b) => {
          return a.handleResult === 0 ? -1 : 1;
        });
        checkStore(tmpList ?? []);
        return <NewNotice type={menu.idx} renderType={renderType} renderList={tmpList} />;
      case 0:
        return <ContactList clickItem={clickListItem} contactList={commonList as unknown as PublicUserItem[]} />;
      case 3:
        return <ContactList clickItem={clickListItem} contactList={friendList} />;
      case 4:
        return <GroupList groupList={groupList} clickItem={clickListItem} />;
      case 5:
        return <LabelList />;
      // case 6:
      // case 7:
      // case 8:
      // return <Organizational selfDepartment={menu.title} />;
      default:
        // return null;
        console.log(menu.idx);

        return <Organizational myDepartment={selfOrzInfo[menu.idx - 6] ?? {}} />;
    }
  };
  return switchContent();
};

export default memo(ContactContent);
