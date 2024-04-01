import { Button, Divider, message, Input } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector, shallowEqual } from "react-redux";
import { RootState } from "../../../../../store";
import { CLOSE_RIGHT_DRAWER } from "../../../../../constants/events";
import { events, im } from "../../../../../utils";
import { GroupRole } from "../../../../../utils/open_im_sdk/types";
import group_notice_empty from "@/assets/images/group_notice_empty.png";

export const GroupNotice = ({role}:{role:GroupRole}) => {
  const { t } = useTranslation();
  const groupInfo = useSelector((state: RootState) => state.contacts.groupInfo, shallowEqual);
  const [isEdit, setIsEdit] = useState(false);
  const [textValue, setTextValue] = useState(groupInfo.notification);


  const handleEdit = () => {
    setIsEdit(true);
  };

  const handleTextValue = (e: any) => {
    setTextValue(e.target.value);
  };

  const sendNotice = () => {
    const options = {
      groupID: groupInfo!.groupID,
      groupInfo: {
        groupName: groupInfo!.groupName,
        introduction: groupInfo!.introduction,
        notification: textValue,
        faceURL: groupInfo!.faceURL,
      },
    };
    im.setGroupInfo(options).then((res) => {
      message.success(t("ReleaseSuccess"));
      events.emit(CLOSE_RIGHT_DRAWER);
    });
  };

  return (
    <div className="group_notice">
      {isEdit ? (
        <>
          <Input.TextArea
            className="edit_notice_content"
            key="group_introduction"
            value={textValue}
            onChange={handleTextValue}
            showCount
            autoSize={{ minRows: 12, maxRows: 12 }}
            maxLength={200}
            placeholder={t("PleaseInputNotice")}
          />
          <div className="btnBox">
            <Button disabled={textValue === ""} onClick={sendNotice} type="primary" className="btn">
              {t("Release")}
            </Button>
          </div>
        </>
      ) : (
        <>
          {textValue ? (
            <div className="noti_content">{textValue}</div>
          ) : (
            <div className="empty_tip">
              <img src={group_notice_empty} alt="" />
              <div>{t("GroupNoticeEmpty")}</div>
            </div>
          )}
          <div className="btnBox">
            {role !== GroupRole.Nomal? (
              <Button onClick={handleEdit} type="primary" className="btn">
                {t("Edit")}
              </Button>
            ) : (
              <Divider>{t("GroupPermissionTip")}</Divider>
            )}
          </div>
        </>
      )}
    </div>
  );
};
