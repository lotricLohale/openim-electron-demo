import { Avatar, AvatarProps } from "antd";
import ic_avatar_01 from "@/assets/images/ic_avatar_01.png";
import ic_avatar_02 from "@/assets/images/ic_avatar_02.png";
import ic_avatar_03 from "@/assets/images/ic_avatar_03.png";
import ic_avatar_04 from "@/assets/images/ic_avatar_04.png";
import ic_avatar_05 from "@/assets/images/ic_avatar_05.png";
import ic_avatar_06 from "@/assets/images/ic_avatar_06.png";
import { UserOutlined } from "@ant-design/icons";
import { memo } from "react";

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
        <div style={{ width: "42px", height: "42px", backgroundColor: "#0E1013", borderRadius: "12px", textAlign: "center", lineHeight: "42px", color: "#fff" }}>
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
