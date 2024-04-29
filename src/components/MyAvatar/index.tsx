import { Avatar, AvatarProps } from "antd";
import ic_avatar_01 from "@/assets/images/ic_avatar_01.png";
import ic_avatar_02 from "@/assets/images/ic_avatar_02.png";
import ic_avatar_03 from "@/assets/images/ic_avatar_03.png";
import ic_avatar_04 from "@/assets/images/ic_avatar_04.png";
import ic_avatar_05 from "@/assets/images/ic_avatar_05.png";
import ic_avatar_06 from "@/assets/images/ic_avatar_06.png";
import { UserOutlined } from "@ant-design/icons";
import { memo } from "react";
import CryptoJS from "crypto-js";

interface MyAvatarProps extends AvatarProps {
  item?: PublicField;
  nickname?: string;
  padding?: string;
}

type PublicField = {
  faceURL: string;
  nickname: string;
  groupID?: string;
  [propName: string]: any;
};

function getColorFromName(name: string) {
  // 判断名称是否为空，并取首字符或空字符串
  const initialChar = name ? name.substring(0, 1) : "";
  // 使用 crypto-js 库生成 MD5 哈希
  const md5Hash = CryptoJS.MD5(initialChar).toString();

  // 构建颜色字符串
  let colorHex = "#";
  if (md5Hash && md5Hash.length > 6) {
    colorHex += md5Hash.substring(0, 6);
  } else {
    colorHex += "1D6BED"; // 默认颜色
  }

  return colorHex;
}

const MyAvatar = (props: MyAvatarProps) => {
  let mySrc;
  const localList = {
    ic_avatar_01: ic_avatar_01,
    ic_avatar_02: ic_avatar_02,
    ic_avatar_03: ic_avatar_03,
    ic_avatar_04: ic_avatar_04,
    ic_avatar_05: ic_avatar_05,
    ic_avatar_06: ic_avatar_06,
  };

  if (!props.src && props.nickname) {
    return (
      <div style={{ padding: props.padding ?? "0px" }}>
        <div
          style={{ width: "36px", height: "36px", backgroundColor: getColorFromName(props.nickname), borderRadius: "12px", textAlign: "center", lineHeight: "34px", color: "#fff" }}
        >
          {props.nickname.split("")[0].toUpperCase()}
        </div>
      </div>
    );
  }
  if (Object.keys(localList).includes(props.src as string)) {
    //@ts-ignore
    mySrc = localList[props.src as string];
  } else {
    mySrc = props.src;
  }
  return <Avatar shape="square" icon={<UserOutlined />} style={{ minWidth: `${props.size ?? 42}px` }} {...props} src={mySrc} />;
};

export default memo(MyAvatar);
