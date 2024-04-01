import { SearchOutlined, PlusOutlined, UserAddOutlined, MessageOutlined, UsergroupAddOutlined } from "@ant-design/icons";
import { Dropdown, Menu, Popover } from "antd";
import { FC, memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { JOIN_MEETING, SHOW_GOLBAL_SEARCH_MODAL } from "../../constants/events";
import { events, im } from "../../utils";
import top_add from "@/assets/images/top_add.png";
import top_add_friend from "@/assets/images/top_add_frind.png";
import top_add_group from "@/assets/images/top_add_group.png";
import top_join_meeting from "@/assets/images/top_join_meeting.png";
import top_launch_meeting from "@/assets/images/top_launch_meeting.png";
import top_create_group from "@/assets/images/top_create_group.png";
import top_meeting_records from "@/assets/images/top_meeting_records.png";
import top_create_work_group from "@/assets/images/top_create_work_group.png";
import styles from "./index.module.less";
import MyAvatar from "../MyAvatar";
import moment from "moment";
import { useSelector } from "react-redux";
import { RootState } from "../../store";

export type VirtualSearchBarProps = {
  searchCb?: (value: string) => void;
  clickMenuItem?: (idx: number) => void;
};

export type VirtualSearchBarHandle = {
  clear: () => void;
};

const VirtualSearchBar: FC<VirtualSearchBarProps> = ({ searchCb = () => {}, clickMenuItem = () => {} }, ref) => {
  const { t } = useTranslation();

  const menus = [
    {
      title: t("AddFriend"),
      icon: top_add_friend,
      method: clickMenuItem,
    },
    {
      title: t("JoinGroup"),
      icon: top_add_group,
      method: clickMenuItem,
    },
    {
      title: t("CreateGroup"),
      icon: top_create_group,
      method: clickMenuItem,
    },
    {
      title: t("CreateWorkGroup"),
      icon: top_create_work_group,
      method: clickMenuItem,
    },
    {
      title: "视频会议",
      icon: top_launch_meeting,
      method: clickMenuItem,
    },
  ];

  const addMenu = () => (
    <Menu className={styles.btn_menu}>
      {menus?.map((m, idx) => (
        <Menu.Item key={m.title} onClick={() => m.method(idx)} icon={<img src={m.icon} />}>
          {m.title}
        </Menu.Item>
      ))}
    </Menu>
  );

  const openGolbalSearch = () => {
    events.emit(SHOW_GOLBAL_SEARCH_MODAL);
  };

  return (
    <>
      <div className={styles.top_tools}>
        {/* <Popover overlayClassName="meeting_record_pop" destroyTooltipOnHide content={<MeetingRecordContent />} trigger="click" placement="bottom">
          <img className={styles.top_record} src={top_meeting_records} alt="" />
        </Popover> */}

        <div onClick={openGolbalSearch} className={styles.search_bar}>
          <div>
            <SearchOutlined />
            <span>搜索</span>
          </div>
        </div>
        <Dropdown overlayClassName={styles.top_search} overlay={addMenu} placement="bottom" arrow={{ pointAtCenter: true }}>
          <img className={styles.top_add} src={top_add} />
        </Dropdown>
      </div>
    </>
  );
};

export default memo(VirtualSearchBar);

type MeetingRecordItem = {
  createTime: number;
  endTime: number;
  hostUserID: string;
  joinDisableVideo: boolean;
  meetingID: string;
  meetingName: string;
  onlyHostInviteUser: boolean;
  participantCanEnableVideo: boolean;
  startTime: number;
};
const MeetingRecordContent = () => {
  const selfName = useSelector((state: RootState) => state.user.selfInfo.nickname);
  const [meetingList, setMeetingList] = useState<MeetingRecordItem[]>([]);

  useEffect(() => {
    im.signalingGetMeetings().then(({ data }) => {
      console.log(JSON.parse(data));

      setMeetingList(JSON.parse(data).meetingInfoList ?? []);
    });
  }, []);

  const joinMeeting = (record: MeetingRecordItem) => {
    im.signalingJoinMeeting({
      meetingID: record.meetingID,
      meetingName: record.meetingName,
      participantNickname: selfName,
    })
      .then(({ data }) => {
        console.log(data);
        events.emit(JOIN_MEETING, JSON.parse(data));
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <div className="wrap_container">
      <div className="record_title">会议记录</div>
      <div className="record_list">
        {meetingList.map((item) => (
          <div className="record_item" onDoubleClick={() => joinMeeting(item)}>
            <MyAvatar size={42} />
            <div className="record_details">
              <div className="item_title">
                <div>{item.meetingName}</div>
                {Date.now() < item.startTime * 1000 ? <span>未开始</span> : null}
              </div>
              <div className="time">{`${moment(item.startTime * 1000).format("M月DD日 HH:mm")}-${moment(item.endTime * 1000).format("HH:mm")}`}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
