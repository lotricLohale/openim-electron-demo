import { FC, useEffect, useMemo, useState } from "react";
import { Drawer, message, Tag } from "antd";
import { t } from "i18next";
import { massMessage } from "../../../api/tag";
import StructureSelectModal from "../components/Modal/StructureSelectModal";
type TogetherSendDrawerProps = {
  visible: boolean;
  checks?: any[];
  lastContent?: string;
  closeDrawer: () => void;
  getMasslist: () => void;
};

const TogetherSendDrawer: FC<TogetherSendDrawerProps> = ({ visible, checks = [], lastContent = "", closeDrawer, getMasslist }) => {
  const [checkedList, setCheckedList] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [content, setContent] = useState("");

  useEffect(() => {
    if (visible) {
      setCheckedList(checks);
      setContent(lastContent);
    }
  }, [visible]);

  const closeModal = () => {
    setModalVisible(false);
  };

  const showModal = () => {
    setModalVisible(true);
  };

  const close = () => {
    setCheckedList([]);
    setContent("");
    closeDrawer();
  };

  const selectConfirm = (data: any[]) => {
    setCheckedList(data);
    closeModal();
    console.log(data);
  };

  const closeTag = (id: string) => {
    const tmpArr = [...checkedList];
    const idx = tmpArr.findIndex((c) => c.uuid === id || c.userID === id);
    tmpArr.splice(idx, 1);
    setCheckedList(tmpArr);
  };

  const massMsg = () => {
    if (checkedList.length === 0 || !content) {
      message.info("请先完成信息填写！");
      return;
    }
    const tagList: string[] = [],
      userList: string[] = [],
      groupList: string[] = [];
    checkedList.forEach((val) => {
      if (val.userID !== undefined) {
        userList.push(val.userID);
      } else if (val.tagID !== undefined) {
        tagList.push(val.tagID);
      } else if (val.groupID !== undefined) {
        groupList.push(val.groupID);
      }
    });
    const data = {
      data: JSON.stringify({
        customType: 903,
        data: {
          url: "",
          duration: 0,
          text: content,
        },
      }),
      extension: "",
      description: "",
    };
    massMessage(tagList, userList, groupList, JSON.stringify(data)).then((res) => {
      message.success("群发成功！");
      getMasslist();
      close();
    });
  };

  const CreateDrawerContent = useMemo(
    () => (
      <div className="createDrawerContent">
        <span className="title">{t("addSendMember")}</span>
        <div className="addPeople" onClick={showModal}>
          {checkedList.length > 0 ? (
            checkedList.map((checked) => (
              <Tag closable onClose={() => closeTag(checked.uuid ?? checked.userID)} key={checked.uuid ?? checked.userID}>
                {checked.showName ?? checked.userName}
              </Tag>
            ))
          ) : (
            <span className="tip">{t("ClickAddMemberToReceiveMessage")}</span>
          )}
        </div>
        <span className="title">{t("EditContent")}</span>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} className="editContent" placeholder={t("PleaseEnterTheContent")}></textarea>
        <span onClick={massMsg} className="btn">
          {t("OnekeySend")}
        </span>
      </div>
    ),
    [checkedList, content]
  );

  return (
    <>
      <Drawer className="right_set_drawer togetherSendDrawer" width={360} maskClosable title={t("CreateTogetherSend")} placement="right" onClose={close} visible={visible} getContainer={document.getElementById("chat_main") ?? false}>
        {CreateDrawerContent}
      </Drawer>
      {modalVisible && <StructureSelectModal showGroup={true} showTag={true} preList={checkedList} visible={modalVisible} confirm={selectConfirm} close={closeModal} />}
    </>
  );
};

export default TogetherSendDrawer;
