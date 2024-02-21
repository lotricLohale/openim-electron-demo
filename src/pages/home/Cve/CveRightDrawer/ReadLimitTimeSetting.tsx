import { message } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import { t } from "i18next";
import { im } from "../../../../utils";

const Settings = [
  {
    title: "30s",
    value: 30,
  },
  {
    title: t("Min", { num: 5 }),
    value: 300,
  },
  {
    title: t("Hour", { num: 1 }),
    value: 3600,
  },
  {
    title: t("Day", { num: 1 }),
    value: 86400,
  },
];
const ReadLimitTimeSetting = ({ limitTime, conversationID }: { limitTime: number; conversationID: string }) => {
  const chooseItem = (time: number) => {
    if (time !== limitTime) {
      im.setOneConversationBurnDuration({
        conversationID: conversationID,
        burnDuration: time,
      })
        .then(() => {
          message.success("设置成功！");
        })
        .catch((err) => {
          message.error("设置失败！");
        });
    }
  };

  return (
    <>
      {Settings.map((item) => (
        <div onClick={() => chooseItem(item.value)} key={item.value} className="group_drawer_item group_drawer_item_nbtm">
          <span>{item.title}</span>
          {limitTime === item.value && <CheckOutlined />}
        </div>
      ))}
    </>
  );
};

export default ReadLimitTimeSetting;
