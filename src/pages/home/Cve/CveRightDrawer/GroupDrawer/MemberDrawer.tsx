import { CheckOutlined, SearchOutlined } from "@ant-design/icons";
import { Empty, Input, message, Modal, Tooltip } from "antd";
import { FC, forwardRef, ForwardRefRenderFunction, memo, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector, shallowEqual, useDispatch } from "react-redux";
import { debounce, throttle } from "throttle-debounce";
import { Loading } from "../../../../../components/Loading";
import { RootState } from "../../../../../store";
import { im } from "../../../../../utils";
import { GroupMemberItem, GroupRole } from "../../../../../utils/open_im_sdk/types";
import MemberItem from "./MemberItem";
import List from "rc-virtual-list";
import { useLatest } from "ahooks";
import { CbEvents } from "../../../../../utils/open_im_sdk";
import { getGroupMemberList } from "../../../../../store/actions/contacts";

const muteSelect = [
  {
    title: "10分钟",
    seconds: 600,
  },
  {
    title: "1小时",
    seconds: 3600,
  },
  {
    title: "12小时",
    seconds: 43200,
  },
  {
    title: "1天",
    seconds: 86400,
  },
];

type MemberDrawerProps = {
  role: GroupRole;
};

export type MemberDrawerHandle = {
  updateRrnerList: (members?: GroupMemberItem[]) => void;
};

const MemberDrawer: ForwardRefRenderFunction<MemberDrawerHandle, MemberDrawerProps> = ({ role }, ref) => {
  // const [searchText, setSearchText] = useState("");
  // const latestText = useLatest(searchText);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [muteItem, setMuteItem] = useState<GroupMemberItem>();
  const groupMemberList = useSelector((state: RootState) => state.contacts.groupMemberList, shallowEqual);
  const groupMemberState = useSelector((state: RootState) => state.contacts.groupMemberLoading, shallowEqual);
  const [renderList, setRenderList] = useState<GroupMemberItem[]>(groupMemberList);
  const fullState = useSelector((state: RootState) => state.user.fullState, shallowEqual);
  const [muteAction, setMuteAction] = useState({
    seconds: 0,
    loading: false,
  });
  const { t } = useTranslation();
  const [listHeight, setListHeight] = useState(document.body.clientHeight - 105);

  const dispatch = useDispatch();

  useEffect(() => {
    // setTimeout(() => setRenderList(groupMemberList));
    window.onresize = function () {
      setListHeight(document.body.clientHeight - 105);
    };
  }, []);

  useEffect(() => {
    setListHeight(document.body.clientHeight - 105);
  }, [fullState]);

  useEffect(() => {
    // if (!searchText) {
    setRenderList(groupMemberList);
    // }
  }, [groupMemberList]);

  const updateRrnerList = (members?: GroupMemberItem[]) => {
    setRenderList(members ?? groupMemberList);
  };

  useImperativeHandle(ref, () => ({
    updateRrnerList,
  }));

  const setMute = async (mutedSeconds: number, item?: GroupMemberItem) => {
    const curItem = item ?? muteItem;
    setMuteAction({
      seconds: mutedSeconds,
      loading: true,
    });
    const res = await im.changeGroupMemberMute({ groupID: curItem!.groupID, userID: curItem!.userID, mutedSeconds });
    if (res.errCode === 0) {
      message.info(mutedSeconds === 0 ? "取消禁言成功！" : "设置禁言成功！");
    }
    setMuteAction({
      seconds: mutedSeconds,
      loading: false,
    });
    setShowMuteModal(false);
  };

  const muteIconClick = (item: GroupMemberItem, isMute: boolean) => {
    if (isMute) {
      setMute(0, item);
    } else {
      setMuteItem(item);
      setShowMuteModal(true);
    }
  };

  const closeMuteModal = () => {
    setShowMuteModal(false);
  };

  const SelectModal = () => (
    <Modal width={320} className="mute_modal" centered title={t("SetMute")} footer={null} visible={showMuteModal} onCancel={closeMuteModal}>
      {muteSelect.map((select) => (
        <div onClick={() => setMute(select.seconds)} key={select.seconds} className="mute_selet">
          <span>{select.title}</span>
          {muteAction.seconds === select.seconds && <CheckOutlined />}
        </div>
      ))}
      <div className="mute_input">
        <div>自定义</div>
        {/* @ts-ignore */}
        <Input type={"number"} onPressEnter={(e) => setMute(Number(e.target.value))} placeholder="秒" />
      </div>
      {muteAction.loading && (
        <div className="mute_loading_mask">
          <Loading />
        </div>
      )}
    </Modal>
  );

  const onScroll = (e: any) => {
    const shouldScroll = !groupMemberState.loading && groupMemberState.hasMore;
    if (shouldScroll && e.target.scrollHeight - listHeight - 60 < e.target.scrollTop) {
      const options = {
        groupID: groupMemberList[0].groupID,
        offset: groupMemberList.length,
        filter: 0,
        count: 50,
      };
      dispatch(getGroupMemberList(options, [...groupMemberList]));
    }
  };

  const throttleScroll = throttle(250, onScroll);

  return (
    <div className="group_members">
      {renderList.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("EmptySearch")} />
      ) : (
        <List
          height={listHeight}
          data={renderList}
          itemHeight={48}
          onScroll={throttleScroll}
          itemKey="userID"
          children={(item, idx) => <MemberItem muteIconClick={muteIconClick} role={role} item={item} />}
        />
      )}

      <SelectModal />
    </div>
  );
};

export default memo(forwardRef(MemberDrawer));
