import { RightOutlined } from "@ant-design/icons";
import { Breadcrumb, Empty, message, Tag } from "antd";
import { t } from "i18next";
import { FC, forwardRef, memo, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Loading } from "../../../components/Loading";
import MyAvatar from "../../../components/MyAvatar";
import { TO_ASSIGN_CVE } from "../../../constants/events";
import { events, genAvatar, im } from "../../../utils";
import List from "rc-virtual-list";
import { DepartmentItem, DepartmentMemberItem, SessionType } from "../../../utils/open_im_sdk/types";
import useListHight from "../../../utils/hooks/useListHight";
import { useLatest } from "ahooks";
import organizational_logo from "@/assets/images/organizational_logo.png";
import { throttle } from "throttle-debounce";

type OrganizationalProps = {
  myDepartment: DepartmentItem;
};

type NaviItemProps = {
  depID: string;
  depName: string;
  hasMember?: boolean;
};

type DepartmentDataType = {
  deps: DepartmentItem[];
  members: DepartmentMemberItem[];
  isDep: boolean;
};

const Organizational: FC<OrganizationalProps> = ({ myDepartment }) => {
  const [departmentData, setDepartmentData] = useState<DepartmentDataType>({
    deps: [],
    members: [],
    isDep: true,
  });
  const latestDepData = useLatest(departmentData);
  const [naviItem, setNaviItem] = useState<NaviItemProps[]>([]);
  const [offsetData, setOffsetData] = useState({
    depOffset: 0,
    depHasMore: true,
    depLoading: false,
    memberOffset: 0,
    memberHasMore: true,
    memberLoading: false,
  });
  const latestoffsetData = useLatest(offsetData);
  const curDepID = useRef("");

  useEffect(() => {
    resetOffset(myDepartment.departmentID);
    setTimeout(() => {
      if (myDepartment.subDepartmentNum) {
        getDepList(myDepartment.departmentID);
      }
      if (!myDepartment.subDepartmentNum || myDepartment.memberNum) {
        getDepMembers(myDepartment.departmentID);
      }
    });
    setNaviItem([{ depID: myDepartment.departmentID, depName: myDepartment.name, hasMember: hasMemberAndSubDepartment(myDepartment) }]);
  }, [myDepartment.departmentID]);

  const handleNavi = async (id: string) => {
    if (id === naviItem[naviItem.length - 1].depID) {
      return;
    }
    await getDepList(id);
    const naviIndex = naviItem.findIndex((item) => item.depID === id);
    const newNavi = naviItem.slice(0, naviIndex + 1);
    setNaviItem(newNavi);
  };

  const resetOffset = (id: string) => {
    curDepID.current = id;
    setOffsetData({
      depOffset: 0,
      depHasMore: true,
      depLoading: false,
      memberOffset: 0,
      memberHasMore: true,
      memberLoading: false,
    });
  };

  const hasMemberAndSubDepartment = (item: DepartmentItem) => item.memberNum !== 0 && item.subDepartmentNum !== 0;

  const getDepartmentItem = (item: DepartmentItem) => {
    const departmentID = item.departmentID;
    resetOffset(departmentID);
    setTimeout(async () => {
      if (item.subDepartmentNum) {
        await getDepList(departmentID);
      }

      if (!item.subDepartmentNum || item.memberNum) {
        await getDepMembers(departmentID);
      }
      setNaviItem([
        ...naviItem,
        {
          depID: item.departmentID,
          depName: item.name,
          hasMember: hasMemberAndSubDepartment(item),
        },
      ]);
    });
  };

  const getDepMembers = async (departmentID: string) => {};

  const getDepList = async (departmentID: string) => {};

  const onDepMemberListScroll = (e: any, listHeight: number) => {
    const shouldScroll = !latestoffsetData.current.memberLoading && latestoffsetData.current.memberHasMore;
    if (shouldScroll && e.target.scrollHeight - listHeight - 60 < e.target.scrollTop) {
      getDepMembers(curDepID.current);
    }
  };

  const onDepListScroll = (e: any, listHeight: number) => {
    const shouldScroll = !latestoffsetData.current.depLoading && latestoffsetData.current.depHasMore;
    if (shouldScroll && e.target.scrollHeight - listHeight - 60 < e.target.scrollTop) {
      getDepList(curDepID.current);
    }
  };

  const throttleDepScroll = throttle(250, onDepListScroll);
  const throttleDepMemberScroll = throttle(250, onDepMemberListScroll);

  const switchList = () => {
    if (naviItem.length === 0) return <Loading />;

    if (naviItem[naviItem.length - 1].hasMember) {
      return (
        <>
          <DepList
            isFirst={offsetData.depOffset === 0}
            onDepListScroll={throttleDepScroll}
            hasMember={true}
            loading={offsetData.depLoading}
            getDepartmentItem={getDepartmentItem}
            deps={latestDepData.current.deps}
          />
          <DepMemberList
            isFirst={offsetData.memberOffset === 0}
            onDepMemberListScroll={throttleDepMemberScroll}
            hasMember={true}
            loading={offsetData.memberLoading}
            members={latestDepData.current.members}
          />
        </>
      );
    }
    return latestDepData.current.isDep ? (
      <DepList
        isFirst={offsetData.depOffset === 0}
        onDepListScroll={throttleDepScroll}
        loading={offsetData.depLoading}
        getDepartmentItem={getDepartmentItem}
        deps={latestDepData.current.deps}
      />
    ) : (
      <DepMemberList
        isFirst={offsetData.memberOffset === 0}
        onDepMemberListScroll={throttleDepMemberScroll}
        loading={offsetData.memberLoading}
        members={latestDepData.current.members}
      />
    );
  };

  return (
    <div className="organizational_item">
      <div className="navigation">
        <Breadcrumb separator=">">
          {naviItem.map((item) => (
            <Breadcrumb.Item key={item.depID} onClick={() => handleNavi(item.depID)}>
              {item.depName}
            </Breadcrumb.Item>
          ))}
        </Breadcrumb>
      </div>
      <div className="organizational_item_content">{switchList()}</div>
    </div>
  );
};

export default Organizational;

const DepMemberItem = memo(
  forwardRef(({ item }: { item: DepartmentMemberItem }, ref) => {
    const navigate = useNavigate();

    const goChat = (item: DepartmentMemberItem) => {
      navigate("/");
      setTimeout(() => {
        events.emit(TO_ASSIGN_CVE, item.userID, SessionType.Single);
      }, 0);
    };
    return (
      <li key={item.userID} onDoubleClick={() => goChat(item)}>
        <MyAvatar src={genAvatar(item.nickname, 38)} size={38} />
        <div className="info">
          <div className="title">
            <span>{item.nickname}</span>
            {item.position && <span>{item.position}</span>}
          </div>
          {/* <span className="status">[手机在线]</span> */}
        </div>
      </li>
    );
  })
);

type DepMemberListProps = {
  members: DepartmentMemberItem[];
  loading?: boolean;
  hasMember?: boolean;
  isFirst: boolean;
  onDepMemberListScroll?: (e: any, height: number) => void;
};
const DepMemberList: FC<DepMemberListProps> = memo(({ members, loading, hasMember, isFirst, onDepMemberListScroll = () => {} }) => {
  const { listHeight } = useListHight(151, hasMember ? 0.7 : 1);

  return loading && isFirst ? (
    <Loading height={listHeight + "px"} />
  ) : members.length > 0 ? (
    <List
      className="organizational_memberList"
      onScroll={(e) => onDepMemberListScroll(e, listHeight)}
      height={listHeight}
      data={members}
      itemHeight={58}
      itemKey={"userID"}
      children={(item) => <DepMemberItem item={item} />}
    />
  ) : (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("NoData")} />
  );
});

const DepItem = memo(
  forwardRef(({ item, getDepartmentItem }: { item: DepartmentItem; getDepartmentItem: (item: DepartmentItem) => void }, ref) => (
    <li key={item.departmentID} onClick={() => getDepartmentItem(item)}>
      <div className="left_box">
        <img src={organizational_logo} width={38} />
        <span className="department_name">{item.name}</span>
      </div>
      <RightOutlined />
    </li>
  ))
);

type DepListProps = {
  deps: DepartmentItem[];
  hasMember?: boolean;
  loading?: boolean;
  isFirst: boolean;
  getDepartmentItem: (item: DepartmentItem) => void;
  onDepListScroll?: (e: any, height: number) => void;
};

const DepList: FC<DepListProps> = memo(({ deps, hasMember, loading, isFirst, getDepartmentItem, onDepListScroll = () => {} }) => {
  const { listHeight } = useListHight(151, hasMember ? 0.3 : 1);

  return loading && isFirst ? (
    <Loading height={listHeight + "px"} />
  ) : deps.length > 0 ? (
    <List
      className="department"
      height={listHeight}
      data={deps}
      itemHeight={62}
      itemKey={"departmentID"}
      onScroll={(e) => onDepListScroll(e, listHeight)}
      children={(item) => <DepItem item={item} getDepartmentItem={getDepartmentItem} />}
    />
  ) : (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("NoData")} />
  );
});
