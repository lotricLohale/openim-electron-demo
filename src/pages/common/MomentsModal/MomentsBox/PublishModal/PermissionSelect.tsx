import { CheckOutlined, RightOutlined } from "@ant-design/icons";
import { Button, Col, Row } from "antd";

import { CheckListItem } from "@/pages/common/ChooseModal/ChooseBox/CheckItem";
import { openChooseContact } from "@/utils/childWindows";
import emitter from "@/utils/events";

import type { PermissionType, PublishModalType } from "./index";

interface ItemProps {
  isSelect: boolean;
  title: string;
  content: string;
  showRigth?: boolean;
  textList: string[];
  permission: PermissionType;
  selectType: (type: PermissionType) => void;
}

const Item = (props: ItemProps) => {
  const { isSelect, title, content, showRigth, textList, permission, selectType } =
    props;
  const isRight = showRigth ? "" : "hidden";

  return (
    <Row
      className="cursor-pointer bg-white p-2"
      justify={"center"}
      onClick={() => selectType(permission)}
    >
      <Col span={3} className="flex items-center justify-center">
        <CheckOutlined className={isSelect ? "" : "hidden"} />
      </Col>
      <Col span={19}>
        <div className="ml-4 flex flex-col">
          <span style={{ color: "#0C1C33" }}>{title}</span>
          <span style={{ color: "#8E9AB0" }} className=" text-xs ">
            {content}
          </span>

          <span className="mt-1 text-xs text-blue-400">
            {isSelect ? textList.join("、") : ""}
          </span>
        </div>
      </Col>
      <Col span={2} className={`flex items-center justify-center`}>
        <RightOutlined className={isRight} />
      </Col>
    </Row>
  );
};

interface SelectTypeProps {
  permission: PermissionType;
  setPermission: (type: PermissionType) => void;
  setModalType: (type: PublishModalType) => void;
  permissionUserList: CheckListItem[];
  permissionGroupList: CheckListItem[];
  ressetPermission: () => void;
}

const PermissionSelect = (props: SelectTypeProps) => {
  const {
    permission,
    setPermission,
    setModalType,
    permissionUserList,
    permissionGroupList,
    ressetPermission,
  } = props;

  const textList = [...permissionUserList, ...permissionGroupList].map((e) => {
    if (e.userID) {
      return e.nickname ?? "";
    }
    if (e.groupID) return e.groupName ?? "";
    return "";
  });

  const selectType = (newPermission: PermissionType) => {
    setPermission(newPermission);

    const isChange = permission !== newPermission;

    if (isChange || newPermission < 2) {
      ressetPermission();
    }

    // PC
    // if ((newPermission === 2 || newPermission === 3) && window.electronAPI) {
    //   const data = {
    //     notConversation: false,
    //     friendList: isChange ? [] : permissionUserList,
    //     groupList: isChange ? [] : permissionGroupList,
    //   };
    //   openChooseContact(JSON.stringify(data));
    //   return;
    // }

    // WEB
    if (newPermission === 2 || newPermission === 3) {
      emitter.emit("OPEN_CHOOSE_MODAL", {
        type: "SELECT_USER",
        extraData: {
          notConversation: false,
          list: isChange ? [] : permissionUserList,
        },
      });
    }
  };

  const itemData = [
    { type: 0, title: "公开", content: "所有人可见" },
    { type: 1, title: "私密", content: "仅自己可见" },
    { type: 2, title: "部分可见", content: "仅选中的人可见" },
    { type: 3, title: "不给谁看", content: "仅选中的人不可见" },
  ];

  return (
    <>
      <div className="mt-2 flex-1">
        {itemData.map((e) => (
          <Item
            key={e.title}
            permission={e.type as PermissionType}
            isSelect={permission === e.type}
            title={e.title}
            content={e.content}
            selectType={selectType}
            showRigth={e.type === 2 || e.type === 3}
            textList={textList}
          ></Item>
        ))}
      </div>
      <div className="flex items-center justify-center">
        <Button
          type="primary"
          className="m-2 w-full"
          onClick={() => setModalType("CREATE_TEXT")}
        >
          确定
        </Button>
      </div>
    </>
  );
};

export default PermissionSelect;
