import { Button, Checkbox, Modal, ModalProps, Row } from "antd";
import React, { useEffect, useRef, useState } from "react";
import type { DraggableData, DraggableEvent } from "react-draggable";
import Draggable from "react-draggable";
import MyAvatar from "../../../components/MyAvatar";

import "./defaultModal.scss";
import { FullUserItem } from "../../../utils/open_im_sdk/types";
import { events, im } from "../../../utils";
import Login from "../../login/Login";
import { UPDATE_ACCOUNT } from "../../../constants/events";

export interface DefaultModalProps extends ModalProps {
  render?: any;
  userInfo: FullUserItem;
}

const DefaultModal: React.FC<DefaultModalProps> = (props) => {
  const { render, userInfo } = props;
  const [open, setOpen] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [bounds, setBounds] = useState({ left: 0, top: 0, bottom: 0, right: 0 });
  const [userList, setUserList] = useState([{}]);
  const [showLogin, setShowLogin] = useState(false);
  const draggleRef = useRef<HTMLDivElement>(null);
  const userInfoConfig = React.useMemo(
    () => [
      {
        title: "手机号",
        key: "phoneNumber",
      },
      {
        title: "用户名",
        key: "nickname",
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
  const updateAccount = async () => {
    debugger;
    console.log("updateAccount", localStorage.getItem("qieqie_localAccountList"));
  };
  useEffect(() => {
    setOpen(!!render);
  }, [render]);
  useEffect(() => {
    if (!Boolean(render)) return;
    (async () => {
      let accountList: any = localStorage.getItem("qieqie_localAccountList");
      if (accountList) {
        accountList = JSON.parse(accountList) || {};
      } else {
        accountList = {};
      }
      if (!accountList[userInfo.userID]) {
        accountList[userInfo.userID] = { dialCode: localStorage.getItem(`IMareaCode`), userID: userInfo.userID, token: localStorage.getItem(`improfile-${userInfo.userID}`) };
      }
      const ids: Array<string> = [];
      const idsData: any[] = [];
      for (const key in accountList) {
        ids.push(key);
        idsData.push(accountList[key]);
      }
      const res = await im.getUsersInfo(ids);
      try {
        const uArr = JSON.parse(res.data);
        uArr.forEach((item: any, idx: number) => {
          idsData[idx].info = item?.publicInfo;
        });
      } catch (error) {}
      console.log("accountList", res);
      setUserList(idsData);
    })();
  }, [render, userInfo.userID]);
  useEffect(() => {
    window.electron.addIpcRendererListener(UPDATE_ACCOUNT, updateAccount, UPDATE_ACCOUNT);
    return () => {
      window.electron.removeIpcRendererListener(UPDATE_ACCOUNT);
    };
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
            {userList.map((user: any) => {
              return (
                <Row>
                  <div className="qieqie-account-manage-item">
                    <div className="qieqie-account-manage-item-user">
                      <MyAvatar nickname={user.info?.nickname} size={42} src={user.info?.faceURL ?? ""} />
                      <div className="qieqie-account-manage-item-user-info">
                        <span className="qieqie-account-manage-item-user-info-name">{user.info?.nickname}</span>
                        <span className="qieqie-account-manage-item-user-info-status">{user.info?.userID === userInfo.userID ? "登录中" : ""}</span>
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
          {userInfoConfig.map((config) => {
            return (
              <div className="qieqie-account-manage-info-item">
                <span className="qieqie-account-manage-info-item-title">{config.title}</span>
                <span className="qieqie-account-manage-info-item-value">{userInfo[config.key as "email"]}</span>
              </div>
            );
          })}
        </div>
        <div className="qieqie-account-manage-btns">
          <Button
            onClick={() => {
              window.electron.accountLogin();
            }}
          >
            添加账户
          </Button>
          <Button>退出登录</Button>
        </div>
      </div>
    </Modal>
  );
};

export default DefaultModal;
