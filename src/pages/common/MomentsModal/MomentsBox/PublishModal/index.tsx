import { Button, Modal } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useEffect, useState } from "react";

import { usePublishMoments } from "@/api/moments";
import type { CheckListItem } from "@/pages/common/ChooseModal/ChooseBox/CheckItem";
import emitter, { SelectUserParams } from "@/utils/events";

import { PublishType } from "../index";
import Content from "./Content";
import styles from "./index.module.scss";
import PermissionSelect from "./PermissionSelect";

interface PublishModalProps {
  publishType: PublishType;
  setPublishType: (type: PublishType) => void;
}

// 0公开 1私密 2部分可见 3不允许指定人可见
export type PermissionType = 0 | 1 | 2 | 3;

export type PublishModalType = "CREATE_TEXT" | "PRERMISSION_SLELCT";

const PublishModal = (props: PublishModalProps) => {
  const { publishType, setPublishType } = props;
  const { mutate: publishMoments } = usePublishMoments();

  const [modalType, setModalType] = useState<PublishModalType>("CREATE_TEXT");

  // 发布所需
  const [text, setText] = useState("");
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [permission, setPermission] = useState<PermissionType>(0);
  const [atUserList, setAtUserList] = useState<CheckListItem[]>([]);
  const [permissionUserList, setPermissionUserList] = useState<CheckListItem[]>([]);
  const [permissionGroupList, setPermissionGroupList] = useState<CheckListItem[]>([]);

  useEffect(() => {
    setFileList([]);
  }, [publishType]);

  useEffect(() => {
    const handleData = (e: SelectUserParams) => {
      if (e.notConversation) {
        setAtUserList(e.choosedList);
      } else {
        setPermissionUserList(e.choosedList.filter((e) => Boolean(e.userID)));
        setPermissionGroupList(e.choosedList.filter((e) => Boolean(e.groupID)));
      }
    };
    emitter.on("SELECT_USER", handleData);
    // window.electronAPI?.subscribeOnce("transferChooseModalData", (_, data: string) => {
    //   handleData(JSON.parse(data) as SelectUserParams);
    // });
    return () => {
      emitter.off("SELECT_USER", handleData);
    };
  }, []);

  const ressetPermission = () => {
    setPermissionUserList([]);
    setPermissionGroupList([]);
  };

  const onSubmit = () => {
    let metas;
    if (publishType === 0) {
      metas = fileList.map((e) => ({
        thumb: e.url as string,
        original: e.url as string,
      }));
    } else {
      metas = fileList.map((e) => ({
        thumb: e.url as string,
        original: e.uid,
      }));
    }
    const content = {
      metas,
      text,
      type: publishType,
    };
    const data = {
      content,
      permission,
      atUserIDs: atUserList.map((user) => user.userID) as string[],
      permissionUserIDs: permissionUserList.map((user) => user.userID) as string[],
      permissionGroupIDs: permissionGroupList.map((group) => group.groupID) as string[],
    };
    publishMoments(data);
    setPublishType(-1);
    setText("");
    ressetPermission();
    setAtUserList([]);
    setPermission(0);
  };

  return (
    <Modal
      open={publishType >= 0}
      mask={false}
      closable={false}
      footer={null}
      centered
      width={360}
      className={styles.modal}
      onCancel={() => setPublishType(-1)}
    >
      <div className="flex max-h-[80vh] min-h-[480px] flex-col overflow-scroll bg-[#F4F5F7]">
        <div className=" flex min-h-[40px] items-center justify-center bg-white">
          发布{publishType === 0 ? "图文" : "视频"}
        </div>
        {modalType === "CREATE_TEXT" && (
          <Content
            text={text}
            setText={setText}
            fileList={fileList}
            setFileList={setFileList}
            setModalType={setModalType}
            permission={permission}
            atUserList={atUserList}
            publishType={publishType}
          />
        )}
        {modalType === "PRERMISSION_SLELCT" && (
          <PermissionSelect
            setModalType={setModalType}
            permission={permission}
            setPermission={setPermission}
            permissionUserList={permissionUserList}
            permissionGroupList={permissionGroupList}
            ressetPermission={ressetPermission}
          />
        )}
        {modalType === "CREATE_TEXT" && (
          <div className="flex items-center justify-center">
            <Button
              type="primary"
              ghost
              className="m-2 w-full"
              onClick={() => setPublishType(-1)}
            >
              取消
            </Button>
            <Button type="primary" className="m-2 w-full" onClick={onSubmit}>
              发布
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PublishModal;
