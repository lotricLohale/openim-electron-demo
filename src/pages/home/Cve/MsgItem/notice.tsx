import { FC, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { TimeTip } from "./SwitchMsgType/SwitchMsgType";
import { parseTime } from "../../../../utils";
import { shallowEqual, useSelector } from "react-redux";
import { RootState } from "../../../../store";
import { Button, message } from "antd";
import "./notice.less";
const useNoticeCodeWidthTitle = () => {
  const { t } = useTranslation();
  return {
    2801: t("noticeMsg.2801"),
    2802: t("noticeMsg.2802"),
    2803: t("noticeMsg.2803"),
    2804: t("noticeMsg.2804"),
    2805: t("noticeMsg.2805"),
    2806: t("noticeMsg.2806"),
    2807: t("noticeMsg.2807"),
    2808: t("noticeMsg.2808"),
    2809: t("noticeMsg.2809"),
    2812: t("noticeMsg.2812"),
    2810: t("noticeMsg.2810"),
    2811: t("noticeMsg.2811"),
  } as { [name: number]: string };
};

const getNoticeCodeWidthTitle = (t: Function) => {
  return {
    2801: t("noticeMsg.2801"),
    2802: t("noticeMsg.2802"),
    2803: t("noticeMsg.2803"),
    2804: t("noticeMsg.2804"),
    2805: t("noticeMsg.2805"),
    2806: t("noticeMsg.2806"),
    2807: t("noticeMsg.2807"),
    2808: t("noticeMsg.2808"),
    2809: t("noticeMsg.2809"),
    2812: t("noticeMsg.2812"),
    2810: t("noticeMsg.2810"),
    2811: t("noticeMsg.2811"),
  } as { [name: number]: string };
};

interface NoticeRenderProps {
  timestamp: number;
  noticeDetail: any;
}

const NoticeRender: FC<NoticeRenderProps> = (props) => {
  const { timestamp, noticeDetail } = props;
  const selectValue = (state: RootState) => state.user.selfInfo;
  const userInfo = useSelector(selectValue, shallowEqual);
  const { t } = useTranslation();
  console.log(noticeDetail);
  const noticeMsg = useMemo(() => {
    return `noticeMsg.${noticeDetail.contentType !== 2807 ? noticeDetail.contentType : noticeDetail.DeleteDay > 0 ? 2807 : "2807_0"}Msg`;
  }, [noticeDetail.DeleteDay, noticeDetail.contentType]);
  return (
    <>
      <div className={`chat_bg_msg_content_text nick_magin`}>
        <div className="text_container">
          {/* {JSON.stringify(noticeDetail)} */}
          <Trans
            t={t}
            i18nKey={noticeMsg}
            values={{
              user: userInfo.nickname,
              time: parseTime(timestamp, true),
              ip: noticeDetail.IP,
              address: noticeDetail.City,
              drive: noticeDetail.DeviceName || t("noticeMsg.driveNull"),
              deleteDay: noticeDetail.DeleteDay,
            }}
            components={{
              br: <br />,
              noticeColor: <span style={{ color: "#0089ff" }}></span>,
            }}
          />
          {noticeDetail.contentType === 2801 || noticeDetail.contentType === 2808 ? (
            <div className="notice-login-button">
              <Button type="text" onClick={() => message.warning("暂不支持请前往手机端操作")} block>
                拒绝登录
              </Button>
              <Button type="link" onClick={() => message.warning("暂不支持请前往手机端操作")} block>
                同意登录
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      <TimeTip timestamp={timestamp} />
    </>
  );
};

export { useNoticeCodeWidthTitle, NoticeRender, getNoticeCodeWidthTitle };
