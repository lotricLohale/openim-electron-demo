import { Avatar as AntdAvatar, AvatarProps } from "antd";
import clsx from "clsx";
import * as React from "react";

import department_icon from "@/assets/images/contact/department_icon.png";
interface IDepartmentIconProps extends AvatarProps {
  text?: string;
  color?: string;
  bgColor?: string;
  size?: number;
}

const DepartmentIcon: React.FC<IDepartmentIconProps> = (props) => {
  const { src, text, size = 42, color = "#fff", bgColor = "#2074de" } = props;
  const [errorHolder, setErrorHolder] = React.useState(false);

  const errorHandler = () => {
    setErrorHolder(true);
  };

  return !errorHolder && !src ? (
    <AntdAvatar
      style={{
        backgroundColor: bgColor,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        lineHeight: `${size - 2}px`,
        color,
      }}
      shape="square"
      {...props}
      className={clsx(
        {
          "cursor-pointer": Boolean(props.onClick),
        },
        props.className,
      )}
      onError={errorHandler as any}
    >
      {text}
    </AntdAvatar>
  ) : (
    <div className="flex h-[42px] min-w-[42px] items-center justify-center">
      <img width={9} src={department_icon} alt="" />
    </div>
  );
};

export default DepartmentIcon;
