import { Button, ButtonProps } from "antd";
import React from "react";
import { FC } from "react";
import { setTimeout } from "timers";

export interface AutoLoadingButtonProps extends ButtonProps {
  /**
   * 是否禁用自动loading, 默认false
   */
  disAutoLoading?: boolean;
  /**
   * 延迟loading时间（s）,默认200
   */
  delay?: number;
}

const AutoLoadingButton: FC<AutoLoadingButtonProps> = (props) => {
  const { disAutoLoading = false, onClick, delay = 200, ...rest } = props;
  const [loading, setLoading] = React.useState(false);
  const loadingRef = React.useRef(loading);
  const handleClick = async (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    // 如果禁用loading直接执行onClick事件
    if (disAutoLoading) {
      onClick && onClick(e);
      return;
    }
    setTimeout(() => {
      loadingRef.current && setLoading(true);
    }, delay);
    loadingRef.current = true;
    await onClick?.(e);
    loadingRef.current = false;
    setLoading(false);
  };
  return <Button {...rest} onClick={handleClick} loading={loading} />;
};

export default AutoLoadingButton;
