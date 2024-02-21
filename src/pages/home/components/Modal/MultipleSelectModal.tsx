import { Button, Input, message, Modal, Upload } from "antd";
import { FC, useMemo } from "react";
import MyAvatar from "../../../../components/MyAvatar";
import { useReactive } from "ahooks";
import { UploadRequestOption } from "rc-upload/lib/interface";
import { events, im, switchUpload } from "../../../../utils";
import { GET_RTC_INVITEIDS, SEND_FORWARD_MSG } from "../../../../constants/events";
import { useTranslation } from "react-i18next";
import { GroupType, Member, MessageType } from "../../../../utils/open_im_sdk/types";
import { ModalType } from "../../../../@types/open_im";
import StructureBox, { InviteType } from "../StructureBox";
import group_icon from "@/assets/images/group_icon.png";
import { customType } from "../../../../constants/messageContentType";

export type MultipleSelectModalProps = {
  visible: boolean;
  modalType: ModalType;
  groupId?: string;
  options?: string;
  mediaType?: string;
  preList?: any[];
  close: () => void;
};

type RsType = {
  groupName: string;
  groupIcon: string;
  selectedList: any[];
  comfirmLoading: boolean;
};

const MultipleSelectModal: FC<MultipleSelectModalProps> = ({ visible, modalType, groupId, options, mediaType, preList, close }) => {
  const rs = useReactive<RsType>({
    groupName: "",
    groupIcon: "",
    selectedList: [],
    comfirmLoading: false,
  });
  const { t } = useTranslation();

  const uploadIcon = async (uploadData: UploadRequestOption) => {
    switchUpload(uploadData)
      .then((res) => {
        rs.groupIcon = res.data.URL;
      })
      .catch((err) => message.error(t("UploadFailed")));
  };

  const modalOperation = () => {
    rs.comfirmLoading = true;
    switch (modalType) {
      case "create":
        createGroup();
        break;
      case "create_work":
        createGroup(true);
        break;
      case "invite":
        inviteToGroup();
        break;
      case "remove":
        kickFromGroup();
        break;
      case "forward":
      case "merge":
      case "card_share":
        forwardMsg();
        break;
      case "rtc_invite":
        rtcInvite();
        break;
      case "meeting_invite":
        meetingInvite();
        break;
      default:
        break;
    }
  };

  const meetingInvite = () => {
    const cves: any[] = [];
    rs.selectedList.forEach((item) => {
      if (item.tagID) {
        item.userList.forEach((user: any) => {
          if (!cves.find((c) => c.userID && c.userID === user.userID)) {
            cves.push(user);
          }
        });
      } else {
        if (!cves.find((c) => (c.userID && c.userID === item.userID) || (c.groupID && c.groupID === item.groupID))) {
          cves.push(item);
        }
      }
    });
    const customData = {
      customType: customType.MeetingInvitation,
      data: JSON.parse(options!),
    };
    events.emit(SEND_FORWARD_MSG, JSON.stringify(customData), MessageType.CUSTOMMESSAGE, cves);
    rs.comfirmLoading = false;
    close();
  };

  const rtcInvite = () => {
    const tmpArr: string[] = [];
    rs.selectedList.forEach((s) => tmpArr.push(s.userID));
    events.emit(GET_RTC_INVITEIDS, tmpArr);
    rs.comfirmLoading = false;
    close();
  };

  const forwardMsg = () => {
    const parseMsg = JSON.parse(options!);
    const cves: any[] = [];
    rs.selectedList.forEach((item) => {
      if (item.tagID) {
        item.userList.forEach((user: any) => {
          if (!cves.find((c) => c.userID === user.userID)) {
            cves.push(user);
          }
        });
      } else {
        if (!cves.find((c) => c.userID === item.userID)) {
          cves.push(item);
        }
      }
    });
    const isShare = modalType === "card_share";
    const messageType = isShare ? "card_share" : parseMsg.contentType ?? MessageType.MERGERMESSAGE;
    const sendParams = isShare || parseMsg.contentType ? options : parseMsg;
    events.emit(SEND_FORWARD_MSG, sendParams, messageType, cves);
    rs.comfirmLoading = false;
    close();
  };

  const createGroup = (iswork = false) => {
    if (!rs.groupName || rs.selectedList.length == 0) {
      message.warning(t("CompleteTip"));
      rs.comfirmLoading = false;
      return;
    }

    let memberList: Member[] = [];
    let addedIDs: string[] = [];
    // 标签去重
    rs.selectedList.map((s) => {
      if (s.tagID) {
        s.userList.forEach((user: any) => {
          if (memberList.find((member) => member.userID === user.userID)) {
            memberList.push({
              userID: user.userID,
              roleLevel: 1,
            });
          }
        });
      } else {
        if (!addedIDs.includes(s.userID)) {
          memberList.push({
            userID: s.userID,
            roleLevel: 1,
          });
          addedIDs.push(s.userID);
        }
      }
    });
    const options = {
      groupBaseInfo: {
        groupType: iswork ? GroupType.WorkingGroup : GroupType.NomalGroup,
        groupName: rs.groupName,
        introduction: "",
        notification: "",
        faceURL: rs.groupIcon,
        ex: "",
      },
      memberList,
    };
    console.log(options);

    im.createGroup(options)
      .then((res) => {
        message.success(t("GruopCreateSuc"));
      })
      .catch((err) => {
        message.error(t("GruopCreateFailed"));
      })
      .finally(() => {
        close();
        rs.comfirmLoading = false;
      });
  };

  const inviteToGroup = () => {
    if (rs.selectedList.length === 0) {
      message.warning(t("SelectMemberTip"));
      return;
    }
    let userIDList: string[] = [];
    rs.selectedList.map((s) => userIDList.push(s.userID));
    const options = {
      groupID: groupId!,
      reason: "",
      userIDList,
    };
    im.inviteUserToGroup(options)
      .then((res) => {
        message.success(t("InviteSuc"));
        rs.comfirmLoading = false;
        close();
      })
      .catch((err) => {
        message.error(t("InviteFailed"));
        rs.comfirmLoading = false;
        close();
      });
  };

  const kickFromGroup = () => {
    if (rs.selectedList.length === 0) {
      message.warning(t("KickMemberTip"));
      return;
    }
    let userIDList: string[] = [];
    rs.selectedList.map((s) => userIDList.push(s.userID));
    const options = {
      groupID: groupId!,
      reason: "",
      userIDList,
    };
    im.kickGroupMember(options)
      .then((res) => {
        message.success(t("KickSuc"));
        rs.comfirmLoading = false;
        close();
      })
      .catch((err) => {
        message.error(t("KickFailed"));
        rs.comfirmLoading = false;
        close();
      });
  };

  const selectChange = (selectList: any[]) => {
    rs.selectedList = selectList;
  };

  const switchTitle = () => {
    switch (modalType) {
      case "create":
        return t("CreateGroup");
      case "create_work":
        return t("CreateWorkGroup");
      case "invite":
        return t("AddMembers");
      case "remove":
        return t("RemoveMembers");
      case "forward":
        return t("ForwardedMessage");
      case "card_share":
        return t("CardShare");
      case "rtc_invite":
        return mediaType === "video" ? t("CallVideoTitle") : t("CallVoiceTitle");
      default:
        return "邀请";
    }
  };

  const CreateGroupHeader = useMemo(
    () => (
      <>
        <div className="group_info_item">
          <div className="group_info_label">{t("GroupName")}</div>
          <div style={{ width: "100%" }}>
            <Input
              placeholder={t("GroupNameTip")}
              value={rs.groupName}
              onChange={(e) => {
                rs.groupName = e.target.value;
              }}
            />
          </div>
        </div>
        <div className="group_info_item">
          <div className="group_info_label">{t("GroupAvatar")}</div>
          <div>
            <MyAvatar src={rs.groupIcon === "" ? group_icon : rs.groupIcon} size={38} />
            <Upload accept="image/*" action={""} customRequest={(data) => uploadIcon(data)} showUploadList={false}>
              <span className="group_info_icon">{t("ClickUpload")}</span>
            </Upload>
          </div>
        </div>
      </>
    ),
    [rs.groupName, rs.groupIcon]
  );

  const isCreate = modalType === "create" || modalType === "create_work";

  const isShowTag = modalType === "create" || modalType === "create_work" || modalType === "forward" || modalType === "card_share";

  const isShowCveAndGroup = modalType === "forward" || modalType === "card_share" || modalType === "merge" || modalType === "meeting_invite";

  const inGroupType = ["remove", "rtc_invite"];

  const isInvite = inGroupType.includes(modalType) ? InviteType.InGroup : modalType === "invite" ? InviteType.Group : InviteType.Nomal;

  return (
    <Modal width="60%" className="group_modal" title={switchTitle()} visible={visible} onCancel={close} footer={null} centered>
      <div>
        {isCreate && CreateGroupHeader}
        <div className="group_info_item">
          <div className="group_info_label">{t("Invite")}</div>
          <StructureBox
            getRole={modalType === "remove"}
            preList={preList}
            isInvite={isInvite}
            showGroup={isShowCveAndGroup}
            showCve={isShowCveAndGroup}
            showTag={isShowTag}
            onChanged={selectChange}
          />
        </div>
        {/* <SelectBox friendList={rs.friendList} memberList={!isCreate ? rs.memberList : undefined} groupList={!isCreate ? rs.groupList : undefined} onSelectedChange={selectChange} /> */}
        <div className="group_info_footer">
          <Button className="cancel_btn" onClick={close}>
            {t("Cancel")}
          </Button>
          <Button className="confirm_btn" loading={rs.comfirmLoading} onClick={modalOperation} type="primary">
            {t("Confirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default MultipleSelectModal;
