import { RightOutlined, PlusOutlined, MinusOutlined, SearchOutlined, CheckOutlined, LoadingOutlined } from "@ant-design/icons";
import { Switch, Button, Typography, message, Modal, Upload, Tooltip, Dropdown, Input } from "antd";
import { FC, useState, useEffect, memo } from "react";
import { useTranslation } from "react-i18next";
import MyAvatar from "../../../../../components/MyAvatar";
import { RESET_CVE, OPEN_GROUP_MODAL, DELETE_MESSAGE } from "../../../../../constants/events";
import { copy2Text, events, im, switchUpload } from "../../../../../utils";
import { ConversationItem, GroupItem, GroupMemberItem, GroupRole, GroupStatus, GroupType, GroupVerificationType, OptType } from "../../../../../utils/open_im_sdk/types";
import { DrawerType } from "../CveRightDrawer";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../../../store";
import group_icon from "@/assets/images/group_icon.png";
import edit_group_icon from "@/assets/images/edit_group_icon.png";
import { UploadRequestOption } from "rc-upload/lib/interface";
import { Grid } from "react-virtualized";
import { useDebounceFn, useReactive } from "ahooks";
import { setCurCve } from "../../../../../store/actions/cve";

const { Paragraph } = Typography;

type GroupDrawerProps = {
  curCve: ConversationItem;
  role: GroupRole;
  groupInfo: GroupItem;
  currentMember: GroupMemberItem;
  changeType: (tp: DrawerType) => void;
  updatePin: (e: boolean) => void;
  updateOpt: (e: boolean, isMute?: boolean) => void;
};

const GroupDrawer: FC<GroupDrawerProps> = ({ curCve, role, groupInfo, currentMember, changeType, updatePin, updateOpt }) => {
  const selfID = useSelector((state: RootState) => state.user.selfInfo.userID, shallowEqual);
  const [selfMemberInfo, setSelfMemberInfo] = useState<GroupMemberItem>(currentMember);
  const [transferModalVisable, setTransferModalVisable] = useState(false);
  const accessLoading = useReactive({
    // pin: false,
    // notDisturb: false,
    // blockGroup: false,
    muteGroup: false,
    verification: false,
  });
  const dispatch = useDispatch();

  const { t } = useTranslation();
  let nickDrft = "";

  const quitGroup = () => {
    im.quitGroup(curCve.groupID)
      .then((res) => {
        events.emit(RESET_CVE);
        message.success(t("QuitGroupSuc"));
      })
      .catch((err) => message.error(t("QuitGroupFailed")));
  };

  const quitWarning = () => {
    Modal.confirm({
      title: t("QuitGroup"),
      content: t("QuitGroupWarning"),
      onOk: quitGroup,
    });
  };

  const dissolveGroup = () => {
    im.dismissGroup(curCve.groupID)
      .then((res) => {
        dispatch(setCurCve({} as ConversationItem));
        message.success(t("DismissGroupSuc"));
      })
      .catch((err) => message.error(t("DismissGroupFailed")));
  };

  const dissolveWarning = () => {
    Modal.confirm({
      title: t("DissolveGroup"),
      content: t("DissolveGroupWarning"),
      onOk: dissolveGroup,
    });
  };

  const updateMuteGroup = () => {
    accessLoading.muteGroup = true;
    im.changeGroupMute({ groupID: curCve.groupID, isMute: groupInfo.status !== GroupStatus.Muted }).finally(() => (accessLoading.muteGroup = false));
  };

  const closeTransferModal = () => {
    setTransferModalVisable(false);
  };

  const updateNick = () => {
    im.setGroupMemberNickname({
      groupID: curCve.groupID,
      userID: selfID,
      GroupMemberNickname: nickDrft,
    })
      .then(async (res) => {
        message.success("修改成功！");
        let newName = nickDrft;
        if (nickDrft === "") {
          const { data } = await im.getGroupMembersInfo({ groupID: curCve.groupID, userIDList: [selfID] });
          newName = JSON.parse(data)[0].nickname;
        }
        setSelfMemberInfo({ ...selfMemberInfo, nickname: newName });
      })
      .catch((err) => message.error("修改失败！"));
  };

  const delMsgConfirm = () => {
    Modal.confirm({
      title: t("DeleteMessage"),
      content: t("DeleteGroupMessageConfirm", { group: curCve.showName }),
      cancelText: t("Cancel"),
      okText: t("Delete"),
      okButtonProps: {
        danger: true,
        type: "primary",
      },
      closable: false,
      className: "warning_modal",
      onOk: () => delRemoteRecord(),
    });
  };

  const delRemoteRecord = () => {
    im.clearGroupHistoryMessageFromLocalAndSvr(curCve.groupID)
      .then((res) => {
        events.emit(DELETE_MESSAGE, curCve.groupID, true);
      })
      .catch((err) => message.error(t("DeleteMessageFailed")));
  };

  const VeritificationMenu = () => {
    const updateGroupVeritification = (type: GroupVerificationType) => {
      if (type === groupInfo.needVerification) {
        return;
      }
      accessLoading.verification = true;
      im.setGroupVerification({
        groupID: groupInfo.groupID,
        verification: type,
      })
        .then((res) => {
          message.success(t("AccessSucTip"));
        })
        .catch((err) => message.error(err.errMsg ?? "err"))
        .finally(() => (accessLoading.verification = false));
    };

    const menuList = [
      {
        title: t("AllNot"),
        type: GroupVerificationType.AllNot,
        idx: 0,
      },
      {
        title: t("AllNeed"),
        type: GroupVerificationType.AllNeed,
        idx: 1,
      },
      {
        title: t("ApplyNeedInviteNot"),
        type: GroupVerificationType.ApplyNeedInviteNot,
        idx: 2,
      },
    ];
    return (
      <div style={{ boxShadow: "0px 4px 25px rgb(0 0 0 / 16%)" }} className="group_ver_list">
        {menuList.map((menu) => (
          <div key={menu.idx} onClick={() => updateGroupVeritification(menu.type)} className="group_ver_item">
            <span>{menu.title}</span>
            {menu.type === groupInfo.needVerification && <CheckOutlined />}
          </div>
        ))}
      </div>
    );
  };

  const switchVerificationDesc = (type: GroupVerificationType) => {
    switch (type) {
      case GroupVerificationType.AllNeed:
        return t("AllNeed");
      case GroupVerificationType.ApplyNeedInviteNot:
        return t("ApplyNeedInviteNot");
      case GroupVerificationType.AllNot:
        return t("AllNot");
    }
  };

  return (
    <>
      <div className="group_drawer">
        <GroupDrawerTitle role={role} />
        <GroupMemberRow role={role} changeType={changeType} />
        <div className="group_drawer_item group_drawer_item_nbtm">
          <div>{t("Group")}ID</div>
          <Paragraph copyable={{ text: curCve.groupID, onCopy: () => copy2Text(curCve.groupID) }} ellipsis>
            {curCve.groupID}
          </Paragraph>
        </div>
        <div className="group_drawer_item group_drawer_item_nbtm group_drawer_item_bottom">
          <div>{t("GroupType")}</div>
          <Paragraph>
            {t(groupInfo.groupType === GroupType.NomalGroup ? "NomalGroup" : "WorkGroup")}
          </Paragraph>
        </div>
        <div className="group_drawer_item group_drawer_item_nbtm">
          <div>{t("NickInGruop")}</div>
          <Paragraph
            editable={{
              tooltip: t("ClickEdit"),
              maxLength: 15,
              onChange: (v) => (nickDrft = v),
              onEnd: updateNick,
            }}
          >
            {selfMemberInfo?.nickname}
          </Paragraph>
        </div>
        <div className="group_drawer_item group_drawer_item_nbtm">
          <div>{t("Pin")}</div>
          <Switch checked={curCve.isPinned} size="small" onChange={updatePin} />
        </div>
        <div className="group_drawer_item group_drawer_item_nbtm">
          <div>{t("NotDisturb")}</div>
          <Switch checked={curCve.recvMsgOpt === OptType.WithoutNotify} size="small" onChange={(e) => updateOpt(e)} />
        </div>
        <div className="group_drawer_item group_drawer_item_nbtm">
          <div>{t("BlockThisGroup")}</div>
          <Switch checked={curCve.recvMsgOpt === OptType.Mute} size="small" onChange={(e) => updateOpt(e, true)} />
        </div>
        {role === GroupRole.Owner && (
          <div className="group_drawer_item group_drawer_item_nbtm">
            <div>{t("MuteAll")}</div>
            <Switch loading={accessLoading.muteGroup} checked={groupInfo.status === GroupStatus.Muted} size="small" onChange={updateMuteGroup} />
          </div>
        )}
        <div onClick={delMsgConfirm} style={{ cursor: "pointer" }} className="group_drawer_item group_drawer_item_bottom group_drawer_item_nbtm">
          <div>{t("ClearChat")}</div>
          <RightOutlined />
        </div>
        <div className="group_drawer_item">
          <div>{t("GroupVerification")}</div>
          <Dropdown
            overlayClassName="group_ver_dropdown"
            disabled={accessLoading.verification || role === GroupRole.Nomal}
            trigger={["click"]}
            overlay={VeritificationMenu}
            placement="topLeft"
          >
            <div className="group_drawer_item_right">
              <span>{switchVerificationDesc(groupInfo.needVerification)}</span>
              {accessLoading.verification ? <LoadingOutlined /> : <RightOutlined />}
            </div>
          </Dropdown>
        </div>
        <div
          onClick={() => {
            if (role !== GroupRole.Nomal) {
              changeType("member_permisson");
            }
          }}
          style={{ cursor: "pointer" }}
          className="group_drawer_item group_drawer_item_bottom group_drawer_item_nbtm"
        >
          <div>{t("MemberPermis")}</div>
          <RightOutlined />
        </div>
        {role === GroupRole.Owner && (
          <div onClick={() => setTransferModalVisable(true)} style={{ cursor: "pointer" }} className="group_drawer_item">
            <div>{t("TransferGroup")}</div>
            <RightOutlined />
          </div>
        )}
      </div>
      <div className="set_drawer_btns">
        {role !== GroupRole.Owner && (
          <Button onClick={quitWarning} danger className="group_drawer_btns_item">
            {t("QuitGroup")}
          </Button>
        )}
        {role === GroupRole.Owner ? (
          <Button onClick={dissolveWarning} type="primary" danger className="group_drawer_btns_item">
            {t("DissolveGroup")}
          </Button>
        ) : null}
      </div>
      {transferModalVisable && <TransferModal onClose={closeTransferModal} />}
    </>
  );
};

export default GroupDrawer;

type GroupDrawerCompProps = {
  role: GroupRole;
  changeType?: (tp: DrawerType) => void;
};

const GroupDrawerTitle: FC<GroupDrawerCompProps> = memo(({ role }) => {
  const groupInfo = useSelector((state: RootState) => state.contacts.groupInfo, shallowEqual);
  const { t } = useTranslation();
  let groupNameDrft = "";

  const updateGroupInfo = (type: "name" | "icon", groupIconDrft?: string) => {
    if ((type === "name" && !groupNameDrft) || (type === "icon" && !groupIconDrft)) {
      return;
    }
    const options = {
      groupID: groupInfo!.groupID,
      groupInfo: {
        groupName: type === "name" ? groupNameDrft : groupInfo.groupName,
        // introduction: groupInfo!.introduction,
        // notification: groupInfo!.notification,
        faceURL: type === "icon" ? groupIconDrft : groupInfo.faceURL,
      },
    };
    im.setGroupInfo(options)
      .then((res) => {
        message.success(t("ModifySuc"));
      })
      .catch((err) => message.error(t("ModifyFailed")));
  };

  const uploadIcon = async (uploadData: UploadRequestOption) => {
    switchUpload(uploadData)
      .then((res) => {
        updateGroupInfo("icon", res.data.URL);
      })
      .catch((err) => message.error(t("UploadFailed")));
  };

  const isAdmin = role !== GroupRole.Nomal;

  const editConfig = isAdmin
    ? {
        tooltip: t("ClickEdit"),
        maxLength: 20,
        onChange: (v: string) => (groupNameDrft = v),
        onEnd: () => updateGroupInfo("name"),
      }
    : false;

  return (
    <div className="group_drawer_item group_drawer_item_bottom">
      <div className="group_drawer_item_left">
        <Upload openFileDialogOnClick={isAdmin} accept="image/*" action={""} customRequest={(data) => uploadIcon(data)} showUploadList={false}>
          <MyAvatar size={38} src={!groupInfo.faceURL ? group_icon : groupInfo.faceURL} />
        </Upload>
        <div className="group_drawer_item_info">
          <Typography.Text editable={editConfig} ellipsis>
            {groupInfo.groupName}
          </Typography.Text>
        </div>
        {isAdmin && <img className="edit_icon" src={edit_group_icon} alt="" />}
      </div>
    </div>
  );
});

const GroupMemberRow: FC<GroupDrawerCompProps> = memo(
  ({ role, changeType }) => {
    const { t } = useTranslation();
    const groupMembers = useSelector((state: RootState) => state.contacts.groupMemberList, shallowEqual);
    const groupInfo = useSelector((state: RootState) => state.contacts.groupInfo, shallowEqual);

    const inviteToGroup = () => {
      events.emit(OPEN_GROUP_MODAL, "invite", groupInfo.groupID);
    };

    const delInGroup = () => {
      events.emit(OPEN_GROUP_MODAL, "remove", groupInfo.groupID);
    };

    return (
      <div className="group_drawer_row">
        <div className="group_drawer_row_title">
          <div>
            <span>{t("GroupMembers")}</span>
            <span className="num_tip">{groupInfo.memberCount}人</span>
          </div>
        </div>
        <div className="group_drawer_row_icon">
          {groupInfo.memberCount > 0
            ? groupMembers!.map((gm, idx) => {
                if (idx < (role !== GroupRole.Nomal ? 18 : 19)) {
                  return (
                    <div key={gm.userID} className="icon_item">
                      <MyAvatar key={gm.userID} size={34.5} src={gm.faceURL} />
                      <Tooltip title={gm.nickname}>
                        <div className="item_nick">{gm.nickname}</div>
                      </Tooltip>
                    </div>
                  );
                }
              })
            : null}
          <PlusOutlined onClick={inviteToGroup} />
          {role !== GroupRole.Nomal && <MinusOutlined onClick={delInGroup} />}
        </div>
        <div className="group_drawer_row_tip">
          <span onClick={() => changeType!("member_list")}>查看更多</span>
        </div>
      </div>
    );
  },
  (p, n) => p.role === n.role
);

type TransferModalProps = {
  onClose: () => void;
};

const TransferModal: FC<TransferModalProps> = memo(
  ({ onClose }) => {
    const groupMembers = useSelector((state: RootState) => state.contacts.groupMemberList, shallowEqual);
    const selfID = useSelector((state: RootState) => state.user.selfInfo.userID, shallowEqual);
    const [renderList, setRenderList] = useState(groupMembers.filter((member) => member.userID !== selfID));
    const [selectedUser, setSelectedUser] = useState<GroupMemberItem>();
    const { t } = useTranslation();

    const transfer = () => {
      if (!selectedUser) return;
      im.transferGroupOwner({ groupID: selectedUser.groupID, newOwnerUserID: selectedUser.userID })
        .then((res) => {
          message.success(t("TransferSuc"));
        })
        .catch((err) => message.error(t("TransferFailed")))
        .finally(onClose);
    };

    const transferWarning = () => {
      Modal.confirm({
        title: t("TransferGroup"),
        content: t("TransferTip", { nickname: selectedUser?.nickname }),
        onOk: transfer,
      });
    };

    const cellRenderer = ({ columnIndex, key, rowIndex, style }: any) => {
      const idx = rowIndex * 6 + columnIndex;
      const item = renderList[idx];

      return item && item.userID !== selfID ? (
        <div
          onClick={() => setSelectedUser(item)}
          style={style}
          key={key}
          className={`member_grid_item ${selectedUser?.userID === item.userID ? "member_grid_item_selected" : ""}`}
        >
          <MyAvatar size={36} src={item.faceURL} />
          <Tooltip title={item.nickname}>
            <div className="nickname">{item.nickname}</div>
          </Tooltip>
        </div>
      ) : null;
    };

    const onSearch = (e: any) => {
      // const tmpList = groupMembers.filter((member) => member.nickname.includes(e.target.value));
      // setRenderList(tmpList);
    };

    const { run: debounceSearch } = useDebounceFn(onSearch, { wait: 500 });

    return (
      <Modal title={t("TransferGroup")} visible={true} footer={null} onCancel={onClose} width="620px" className="transfer_modal">
        <div className="transfer_member_container">
          <Input placeholder={t("Search")} onChange={debounceSearch} prefix={<SearchOutlined />} />
          <div className="member_grid">
            <Grid height={290} rowHeight={71} rowCount={Math.ceil(renderList.length / 3)} width={530} columnCount={9} columnWidth={57} cellRenderer={cellRenderer} />
          </div>
        </div>
        <div className="group_transfer_footer">
          <Button className="cancel_btn" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button className="confirm_btn" loading={false} onClick={transferWarning} type="primary">
            {t("Confirm")}
          </Button>
        </div>
      </Modal>
    );
  },
  () => true
);
