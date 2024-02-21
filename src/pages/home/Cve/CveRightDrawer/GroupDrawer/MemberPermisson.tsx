import { Switch } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector, shallowEqual } from "react-redux";
import { RootState } from "../../../../../store";
import { im } from "../../../../../utils";
import { AllowType, GroupStatus } from "../../../../../utils/open_im_sdk/types";

const MemberPermisson = () => {
  const groupInfo = useSelector((state: RootState) => state.contacts.groupInfo, shallowEqual);
  const [loading, setLoading] = useState({
    info: false,
    friend: false,
  });
  const { t } = useTranslation();

  const updateInfoAuth = (value: boolean) => {
    setLoading({
      ...loading,
      info: true,
    });
    im.setGroupLookMemberInfo({
      groupID: groupInfo.groupID,
      rule: value ? AllowType.NotAllowed : AllowType.Allowed,
    })
      .then(() => {})
      .finally(() =>
        setLoading({
          ...loading,
          info: false,
        })
      );
  };
  
  const updateFriendAuth = (value: boolean) => {
    setLoading({
      ...loading,
      friend: true,
    });
    im.setGroupApplyMemberFriend({
      groupID: groupInfo.groupID,
      rule: value ? AllowType.NotAllowed : AllowType.Allowed,
    })
      .then(() => {})
      .finally(() =>
        setLoading({
          ...loading,
          friend: false,
        })
      );
  };

  return (
    <>
      <div className="group_drawer_item group_drawer_item_nbtm">
        <div>{t("NotAllowedViewInfo")}</div>
        <Switch loading={loading.info} checked={groupInfo.lookMemberInfo === AllowType.NotAllowed} size="small" onChange={updateInfoAuth} />
      </div>
      <div className="group_drawer_item group_drawer_item_nbtm">
        <div>{t("NotAllowedAddFriend")}</div>
        <Switch loading={loading.friend} checked={groupInfo.applyMemberFriend === AllowType.NotAllowed} size="small" onChange={updateFriendAuth} />
      </div>
    </>
  );
};

export default MemberPermisson;
