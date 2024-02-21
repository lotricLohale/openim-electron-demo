import top_mini from "@/assets/images/top_mini.png";
import top_max from "@/assets/images/top_max.png";
import top_close from "@/assets/images/top_close.png";
import { Button, Input, message, Modal } from "antd";
import styles from "./index.module.less";
import { FC, memo, useCallback, useEffect, useRef, useState } from "react";
import { shallowEqual, useSelector } from "react-redux";
import { useClickAway } from "ahooks";
import { useTranslation } from "react-i18next";
import { events, filterEmptyValue, im } from "../../utils";
import { ModalType } from "../../@types/open_im";
import { TO_ASSIGN_CVE, OPEN_SINGLE_MODAL, OPEN_GROUP_MODAL, FORWARD_AND_MER_MSG, JOIN_MEETING } from "../../constants/events";
import { useLocation } from "react-router";

import { FriendItem, PublicUserItem, GroupItem } from "../../utils/open_im_sdk/types";
import UserCard, { CardType } from "../../pages/home/components/UserCard";
import GroupCard from "../../pages/home/components/GroupCard";
import MultipleSelectModal from "../../pages/home/components/Modal/MultipleSelectModal";
import VirtualSearchBar from "../VirtualSearchBar";
import { searchUserInfoByBusiness } from "../../api/login";
import { RootState } from "../../store";
import LaunchMeetingModal from "../../pages/home/components/Modal/LaunchMeetingModal";
import MeetingModal from "../../pages/home/components/Modal/MeetingModal";
import { MeetingConfig } from "../../pages/home/components/Modal/data";

type GroupInfoType = {
  members: any[];
  gid: string;
};

const TopBar = () => {
  const [isAddConsVisible, setIsAddConsVisible] = useState(false);
  const [userCardVisible, setUserCardVisible] = useState(false);
  const [groupCardVisible, setGroupCardVisible] = useState(false);
  const [groupOpModalVisible, setGroupOpModalVisible] = useState(false);
  const [forwardMsg, setForwardMsg] = useState("");
  const [addConNo, setAddConNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [serchRes, setSerchRes] = useState({} as any);
  const [addType, setAddType] = useState<"friend" | "group">("friend");
  const [modalType, setModalType] = useState<ModalType>("create");
  const [groupInfo, setGroupInfo] = useState<GroupInfoType>();
  const [singleType, setSingleType] = useState<CardType>();
  const avaRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [showPop, setShowPop] = useState(false);
  const { t } = useTranslation();
  const loaction = useLocation();

  const [showMeetingLaunchModal, setShowMeetingLaunchModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState({
    visible: false,
    config: {} as MeetingConfig,
  });

  useEffect(() => {
    events.on(TO_ASSIGN_CVE, assignHandler);
    events.on(OPEN_SINGLE_MODAL, openSingleModalHandler);
    events.on(OPEN_GROUP_MODAL, openGroupModalHandler);
    events.on(FORWARD_AND_MER_MSG, forwardMsgHandler);
    events.on(JOIN_MEETING, joinMeetingHandler);
    return () => {
      events.off(TO_ASSIGN_CVE, assignHandler);
      events.off(OPEN_SINGLE_MODAL, openSingleModalHandler);
      events.off(OPEN_GROUP_MODAL, openGroupModalHandler);
      events.off(FORWARD_AND_MER_MSG, forwardMsgHandler);
      events.off(JOIN_MEETING, joinMeetingHandler);
    };
  }, []);

  const forwardMsgHandler = (type: ModalType, options: string) => {
    setModal(type);
    setForwardMsg(options);
    setGroupOpModalVisible(true);
  };

  const assignHandler = () => {
    setUserCardVisible(false);
    setGroupCardVisible(false);
    setIsAddConsVisible(false);
  };

  const openSingleModalHandler = (info: FriendItem | PublicUserItem, type?: CardType) => {
    setSerchRes(info);
    setSingleType(type);
    setUserCardVisible(true);
  };

  const openGroupModalHandler = (type: ModalType, gid: string, preList?: any[]) => {
    setGroupInfo({ gid, members: preList ?? [] });
    setModal(type);
  };

  const joinMeetingHandler = (config: MeetingConfig) => {
    console.log(config);

    if (showMeetingModal.visible) {
      message.warning("当前已在会议中！");
      return;
    }
    setShowMeetingModal({
      visible: true,
      config,
    });
  };

  const getNo = (no: string) => {
    setAddConNo(no);
  };

  const searchCons = async () => {
    // setUserCardVisible(true)
    if (!addConNo) return;
    setLoading(true);
    if (addType === "friend") {
      try {
        const { data } = await searchUserInfoByBusiness(addConNo);
        if (data.totalNumber > 0) {
          const searchData = data.userFullInfoList[0];
          filterEmptyValue(searchData);
          console.log({ ...searchData });
          const res = await im.getUsersInfo([searchData.userID]);
          let IMUserInfo = JSON.parse(res.data)[0];
          const isFriend = IMUserInfo.friendInfo !== null;
          IMUserInfo = isFriend ? IMUserInfo.friendInfo : IMUserInfo.publicInfo;
          console.log({ ...IMUserInfo });
          console.log({ ...IMUserInfo, ...searchData });

          // const isFriend = friendList.find((item) => item.userID === searchData.userID);
          const cardData = isFriend ? { friend: { ...IMUserInfo, ...searchData } } : { public: { ...IMUserInfo, ...searchData } };
          const cardType = isFriend ? CardType.FriendInfo : CardType.UserInfo;
          setSerchRes(cardData);
          setSingleType(cardType);
          setUserCardVisible(true);
        } else {
          message.info(t("UserSearchEmpty"));
        }
        setLoading(false);
      } catch (error) {
        message.error(t("AccessFailed"));
        setLoading(false);
      }
      // im.getUsersInfo([addConNo])
      //   .then((res) => {
      //     const tmpArr = JSON.parse(res.data);
      //     if (tmpArr.length > 0) {
      //       const cardData = tmpArr[0].friendInfo ? { friend: tmpArr[0].friendInfo } : { public: tmpArr[0].publicInfo };
      //       const cardType = tmpArr[0].friendInfo ? CardType.FriendInfo : CardType.UserInfo
      //       setSerchRes(cardData);
      //       setSingleType(cardType);
      //       setUserCardVisible(true);
      //     } else {
      //       message.info(t("UserSearchEmpty"));
      //     }
      //     setLoading(false);
      //   })
      //   .catch((err) => {
      //     message.error(t("AccessFailed"));
      //     setLoading(false);
      //   });
    } else {
      im.getGroupsInfo([addConNo])
        .then((res) => {
          const tmpArr = JSON.parse(res.data);
          if (tmpArr.length > 0) {
            setSerchRes(tmpArr[0]);
            setGroupCardVisible(true);
          } else {
            message.info(t("GroupSearchEmpty"));
          }
          setLoading(false);
        })
        .catch((err) => {
          message.error(t("AccessFailed"));
          setLoading(false);
        });
    }
  };

  const cancleSearch = () => {
    setAddConNo("");
    setIsAddConsVisible(false);
  };

  const closeDragCard = () => {
    setUserCardVisible(false);
    setGroupCardVisible(false);
  };

  const closeOpModal = () => {
    setForwardMsg("");
    setGroupOpModalVisible(false);
  };

  const setModal = (type: ModalType) => {
    setModalType(type);
    setGroupOpModalVisible(true);
  };

  const closeLoading = () => {
    setLoading(false);
  };

  const clickMenuItem = (idx: number) => {
    switch (idx) {
      case 0:
        setAddType("friend");
        setIsAddConsVisible(true);
        break;
      case 1:
        setAddType("group");
        setIsAddConsVisible(true);
        break;
      case 2:
        setModal("create");
        break;
      case 3:
        setModal("create_work");
        break;
      case 4:
        setShowMeetingLaunchModal(true);
        break;
      default:
        break;
    }
  };

  const closeMeetingModal = useCallback(() => {
    setShowMeetingModal({
      visible: false,
      config: {} as MeetingConfig,
    });
  }, []);

  const closeMeetingLaunchModal = useCallback(() => {
    setShowMeetingLaunchModal(false);
  }, []);

  /// ----------------------------------------------------------------

  useClickAway(() => {
    if (showPop) setShowPop(false);
  }, [popRef, avaRef]);

  const miniSizeApp = () => {
    window.electron && window.electron.miniSizeApp();
  };

  const maxSizeApp = () => {
    window.electron && window.electron.maxSizeApp();
  };

  const closeApp = () => {
    window.electron?.closeApp();
  };

  return (
    <div className={styles.top_bar}>
      <div />
      {loaction.pathname !== "/login" ? <VirtualSearchBar clickMenuItem={clickMenuItem} /> : <div />}
      {window.electron && !window.electron.isMac ? (
        <div className={styles.window_actions}>
          <img onClick={miniSizeApp} src={top_mini} alt="" />
          <img onClick={maxSizeApp} src={top_max} alt="" />
          <img onClick={closeApp} src={top_close} alt="" />
        </div>
      ) : (
        <div />
      )}
      {isAddConsVisible && (
        <AddConModal
          closeLoading={closeLoading}
          isAddConsVisible={isAddConsVisible}
          loading={loading}
          searchCons={searchCons}
          cancleSearch={cancleSearch}
          getNo={getNo}
          type={addType}
        />
      )}
      {userCardVisible && (
        <UserCard inGroup={serchRes.groupMemberItem?.userID !== undefined} close={closeDragCard} cardType={singleType!} cardInfo={serchRes} visible={userCardVisible} />
      )}
      {groupCardVisible && <GroupCard close={closeDragCard} info={serchRes as GroupItem} draggableCardVisible={groupCardVisible} />}
      {groupOpModalVisible && (
        <MultipleSelectModal options={forwardMsg} groupId={groupInfo?.gid} preList={groupInfo?.members} modalType={modalType} visible={groupOpModalVisible} close={closeOpModal} />
      )}
      {showMeetingLaunchModal && <LaunchMeetingModal closeModal={closeMeetingLaunchModal} />}
      {showMeetingModal.visible && <MeetingModal config={showMeetingModal.config} closeModal={closeMeetingModal} />}
    </div>
  );
};

export default memo(TopBar);

type AddConModalProps = {
  isAddConsVisible: boolean;
  loading: boolean;
  type: "friend" | "group";
  searchCons: () => void;
  cancleSearch: () => void;
  getNo: (no: string) => void;
  closeLoading: () => void;
};

const AddConModal: FC<AddConModalProps> = ({ isAddConsVisible, loading, type, searchCons, cancleSearch, getNo, closeLoading }) => {
  const { t } = useTranslation();
  useEffect(() => {
    return () => {
      if (loading) closeLoading();
    };
  }, [loading]);
  return (
    <Modal
      key="AddConModal"
      className="add_cons_modal"
      title={type === "friend" ? t("AddFriend") : t("JoinGroup")}
      visible={isAddConsVisible}
      centered
      destroyOnClose
      width={360}
      onCancel={cancleSearch}
      footer={[
        <Button key="comfirmBtn" loading={loading} onClick={searchCons} className="add_cons_modal_btn" type="primary">
          {t("Confirm")}
        </Button>,
        <Button key="cancelBtn" onClick={cancleSearch} className="add_cons_modal_btn" type="default">
          {t("Cancel")}
        </Button>,
      ]}
    >
      <Input allowClear placeholder={`${t("PleaseInput")}${type === "friend" ? t("User") : t("Group")}ID`} onChange={(v) => getNo(v.target.value)} />
    </Modal>
  );
};
