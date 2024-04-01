/**
 * @author zhanzl
 * @date 2024/02/01
 * @description 点击倒计时组件
 */
import React, { FC } from "react";

import "./countdown.scss";

interface CountdownProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /**
   * 初始开始倒计时， 默认false
   */
  initCountDown?: boolean;
  /**
   * 倒计时，默认60
   */
  count?: number;
}
const Countdown: FC<CountdownProps> = (props) => {
  const { count = 60, onClick, initCountDown, ...divProps } = props;
  const [timeState, setTimeState] = React.useState(0);
  const timeRef = React.useRef<NodeJS.Timeout>();
  const countRef = React.useRef<number>(0);
  // 点击开始倒计时
  const startTimeOut = (e?: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    // 倒计时中点击无效
    if (countRef.current > 0) return;
    countRef.current = count;
    setTimeState(countRef.current);
    timeRef.current = setInterval(() => {
      setTimeState(() => {
        countRef.current = countRef.current - 1;
        return countRef.current;
      });
      if (countRef.current === 0) {
        timeRef.current && clearInterval(timeRef.current);
      }
    }, 1000);
    if (e) onClick?.(e);
  };
  // 销毁时清空定时器
  React.useEffect(() => {
    // 是否初始开始倒计时
    initCountDown && startTimeOut();
    return () => {
      timeRef.current && clearInterval(timeRef.current);
    };
  }, []);
  return (
    <div className={`rtc-countdown rtc-countdown-${timeState > 0 ? "dis" : "default"}`} onClick={startTimeOut} {...divProps}>
      {props.children}
      {timeState > 0 ? ` (${timeState}s)` : ""}
    </div>
  );
};

export default Countdown;
