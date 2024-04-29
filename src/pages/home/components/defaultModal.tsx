import { Button, Checkbox, Modal, ModalProps, Row } from "antd";
import React, { useEffect, useRef, useState } from "react";
import type { DraggableData, DraggableEvent } from "react-draggable";
import Draggable from "react-draggable";
import MyAvatar from "../../../components/MyAvatar";

import "./defaultModal.scss";
import { FullUserItem } from "../../../utils/open_im_sdk/types";

export interface DefaultModalProps extends ModalProps {
  render: any;
  userInfo: FullUserItem;
}

const DefaultModal: React.FC<DefaultModalProps> = (props) => {
  const { render, userInfo } = props;
  const [open, setOpen] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [bounds, setBounds] = useState({ left: 0, top: 0, bottom: 0, right: 0 });
  const [userList, setUserList] = useState([{}]);
  const draggleRef = useRef<HTMLDivElement>(null);
  const userInfoConfig = React.useMemo(
    () => [
      {
        title: "手机号",
        key: "phone",
      },
      {
        title: "用户名",
        key: "userName",
      },
      {
        title: "更多信息",
        key: "more",
      },
    ],
    []
  );
  const showModal = () => {
    setOpen(true);
  };

  const handleOk = (e: React.MouseEvent<HTMLElement>) => {
    console.log(e);
    setOpen(false);
  };

  const handleCancel = (e: React.MouseEvent<HTMLElement>) => {
    console.log(e);
    setOpen(false);
  };

  const onStart = (_event: DraggableEvent, uiData: DraggableData) => {
    const { clientWidth, clientHeight } = window.document.documentElement;
    const targetRect = draggleRef.current?.getBoundingClientRect();
    if (!targetRect) {
      return;
    }
    setBounds({
      left: -targetRect.left + uiData.x,
      right: clientWidth - (targetRect.right - uiData.x),
      top: -targetRect.top + uiData.y,
      bottom: clientHeight - (targetRect.bottom - uiData.y),
    });
  };
  const switchAccount = () => {};
  useEffect(() => {
    setOpen(!!render);
  }, [render]);
  useEffect(() => {
    let accountList: any = localStorage.getItem("qieqie_localAccountList");
    if (accountList) {
      accountList = JSON.parse(accountList) || {};
      if (!accountList[userInfo.userID]) {
        accountList[userInfo.userID] = { dialCode: localStorage.getItem(`IMareaCode`), userID: userInfo.userID, token: localStorage.getItem(`improfile-${userInfo.userID}`) };
      }
      accountList = accountList.keys().map((id: string) => {
        return accountList[id];
      });

      setUserList(accountList);
    }
  }, []);
  return (
    <Modal
      title={null}
      footer={null}
      open={open}
      width={460}
      closable={false}
      bodyStyle={{
        padding: 0,
        borderRadius: "24px",
      }}
      onOk={handleOk}
      mask={false}
      onCancel={handleCancel}
      modalRender={(modal) => (
        <Draggable disabled={disabled} bounds={bounds} onStart={(event, uiData) => onStart(event, uiData)}>
          <div ref={draggleRef}>{modal}</div>
        </Draggable>
      )}
    >
      <div className="qieqie-account-manage">
        <div className="qieqie-account-manage-title">账号</div>
        <div className="qieqie-account-manage-check">
          <Checkbox.Group style={{ width: "100%" }} onChange={switchAccount}>
            {userList.map(() => {
              return (
                <Row>
                  <div className="qieqie-account-manage-item">
                    <div className="qieqie-account-manage-item-user">
                      <MyAvatar nickname={"test"} size={42} src={""} />
                      <div className="qieqie-account-manage-item-user-info">
                        <span className="qieqie-account-manage-item-user-info-name">用户名</span>
                        <span className="qieqie-account-manage-item-user-info-status">状态</span>
                      </div>
                    </div>
                    <Checkbox value="E"></Checkbox>
                  </div>
                </Row>
              );
            })}
          </Checkbox.Group>
        </div>
        <div className="qieqie-account-manage-info">
          <div className="qieqie-account-manage-info-title">账号信息</div>
          {userInfoConfig.map(() => {
            return (
              <div className="qieqie-account-manage-info-item">
                <span className="qieqie-account-manage-info-item-title">手机号码</span>
                <span className="qieqie-account-manage-info-item-value">136 7091 4702</span>
              </div>
            );
          })}
        </div>
        <div className="qieqie-account-manage-btns">
          <Button>添加账户</Button>
          <Button>退出登录</Button>
        </div>
      </div>
    </Modal>
  );
};

export default DefaultModal;
