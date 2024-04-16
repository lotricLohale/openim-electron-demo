import { SearchOutlined } from "@ant-design/icons";
import { useDebounceFn } from "ahooks";
import { Button, Input, Modal } from "antd";
import { FC, memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { shallowEqual, useSelector } from "react-redux";
import MyAvatar from "../../../../components/MyAvatar";
import { RootState } from "../../../../store";
import { FriendItem } from "../../../../utils/open_im_sdk/types";

type CardMsgModalProps = {
  visible: boolean;
  close: () => void;
  cb: (sf: FriendItem) => void;
};

const CardMsgModal: FC<CardMsgModalProps> = ({ visible, close, cb }) => {
  const friendList = useSelector((state: RootState) => state.contacts.friendList, shallowEqual);
  const [searchValue, setSearchValue] = useState("");
  const { t } = useTranslation();

  const sendCardMsg = (item: FriendItem) => {
    cb(item);
    close();
  };

  const onSearchChanged = (e: any) => {
    setSearchValue(e.target.value);
  };
  const { run: debounceSearch } = useDebounceFn(onSearchChanged, { wait: 500 });

  const getRenderList = () => {
    if (searchValue) {
      return friendList.filter((friend) => friend.nickname.includes(searchValue) || friend.remark?.includes(searchValue));
    }
    return friendList;
  };

  return (
    <Modal wrapClassName="card_cons_se" title={t("SelectCard")} visible={visible} footer={null} onCancel={close} width="320px" className="card_se_modal">
      <div className="top_ctx">
        <Input placeholder={t("Search")} onChange={debounceSearch} prefix={<SearchOutlined />} />
      </div>
      <div className="btm_ctx">
        <div className="title">{t("MyFriends")}</div>
        <div className="cons_list">
          {getRenderList().map((f) => (
            <div key={f.userID} className="cons_list_item">
              <div className="cons_list_item_left">
                <MyAvatar nickname={f.remark === "" ? f.nickname : f.remark} size={32} src={f.faceURL} />
                <div className="nick">{f.remark === "" ? f.nickname : f.remark}</div>
              </div>
              <Button onClick={() => sendCardMsg(f)} ghost type="primary" size="small">
                {t("Send")}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default memo(CardMsgModal, () => true);
