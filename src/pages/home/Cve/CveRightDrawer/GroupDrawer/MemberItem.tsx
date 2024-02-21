import { AudioMutedOutlined, AudioOutlined, CheckOutlined, DeleteOutlined, UserSwitchOutlined } from "@ant-design/icons";
import { Modal, message, Tooltip, Skeleton, Input } from "antd";
import { FC, forwardRef, ForwardRefRenderFunction, memo, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MemberMapType } from "../../../../../@types/open_im";
import MyAvatar from "../../../../../components/MyAvatar";
import { im } from "../../../../../utils";
import { AllowType, GroupMemberItem, GroupRole } from "../../../../../utils/open_im_sdk/types";
import member_admin from "@/assets/images/member_admin.png";
import member_admin_seted from "@/assets/images/member_admin_set.png";
import member_mute from "@/assets/images/member_mute.png";
import member_muted from "@/assets/images/member_muted.png";
import member_del from "@/assets/images/member_del.png";
import { shallowEqual, useSelector } from "react-redux";
import { RootState } from "../../../../../store";

type MemberItemProps = {
  item: GroupMemberItem;
  // member2Status: MemberMapType;
  role: GroupRole;
  // idx: number;
  muteIconClick: (item: GroupMemberItem, isMute: boolean) => void;
};

const MemberItem: ForwardRefRenderFunction<HTMLDivElement, MemberItemProps> = ({ item, role, muteIconClick }, ref) => {
  const [isMute, setIsMute] = useState(false);
  const groupInfo = useSelector((state: RootState) => state.contacts.groupInfo, shallowEqual);
  const { t } = useTranslation();

  useEffect(() => {
    const now = parseInt(Date.now() / 1000 + "");
    setIsMute(item.muteEndTime > now);
  }, [item]);

  const warning = () => {
    Modal.confirm({
      title: t("RemoveMembers"),
      content: t("RemoveTip1") + item.nickname + " " + t("RemoveTip2"),
      cancelText: t("Cancel"),
      okText: t("Remove"),
      okButtonProps: {
        danger: true,
        type: "primary",
      },
      closable: false,
      className: "warning_modal",
      onOk: () => removeMember(),
    });
  };

  const removeMember = () => {
    const options = {
      groupID: item.groupID,
      reason: "kick",
      userIDList: [item.userID],
    };
    im.kickGroupMember(options)
      .then((res) => {
        message.success(t("KickSuc"));
      })
      .catch((err) => message.error(t("KickFailed")));
  };

  const updateGroupRole = () => {
    const options = {
      groupID: item.groupID,
      userID: item.userID,
      roleLevel: item.roleLevel === GroupRole.Nomal ? GroupRole.Admin : GroupRole.Nomal,
    };
    im.setGroupMemberRoleLevel(options).then((res) => {
      message.success(t("AccessSucTip"));
    });
  };

  const ActionIcons = () => (
    <div className="action_list">
      <Tooltip placement="top" title={t("SetMute")}>
        <img src={isMute ? member_muted : member_mute} onClick={() => muteIconClick(item, isMute)} />
      </Tooltip>
      {role === GroupRole.Owner && <Tooltip placement="top" title={t("SteGorupAdmin")}>
        <img src={item.roleLevel === GroupRole.Admin ? member_admin_seted : member_admin} onClick={updateGroupRole} />
      </Tooltip>}
      <Tooltip placement="top" title={t("RemoveMembers")}>
        <img src={member_del} onClick={warning} />
      </Tooltip>
    </div>
  );

  const GetActions = useMemo(() => {
    if (role === GroupRole.Owner) {
      if (item.roleLevel !== GroupRole.Owner) {
        return <ActionIcons />;
      }
    } else if (role === GroupRole.Admin) {
      if (item.roleLevel === GroupRole.Nomal) {
        return <ActionIcons />;
      }
    }
    return null;
  }, [role, item.roleLevel, isMute]);

  const SwitchTip = useMemo(() => {
    switch (item.roleLevel) {
      case 2:
        return <div className="owner_tip">{t("GroupOwner")}</div>;
      case 3:
        return <div className="admin_tip">{t("GroupAdministrators")}</div>;
      default:
        return null;
    }
  }, [item.roleLevel]);

  const clickItem = () => {
    if(groupInfo.groupID === item.groupID && groupInfo.lookMemberInfo === AllowType.NotAllowed && role === GroupRole.Nomal){
      return;
    }

    window.userClick(item.userID,groupInfo.groupID, groupInfo.applyMemberFriend)
  }

  return (
    <div ref={ref} className="group_members_list_item">
      <div className="left_info" onClick={clickItem}>
        <MyAvatar size={36} src={item.faceURL} />
        <div className="member_info">
          <div className="title">
            <div>{item.nickname}</div>
            {SwitchTip}
          </div>
          {/* <div className="member_status">{ParseStatus}</div> */}
        </div>
      </div>
      {GetActions}
    </div>
  );
};

export default memo(forwardRef(MemberItem));
