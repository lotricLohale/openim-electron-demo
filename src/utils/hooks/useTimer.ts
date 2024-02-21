import { useLatest } from "ahooks";
import { useState, useRef } from "react";

function useTimer(interval = 1000) {
  const [time, setTime] = useState(30);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const latestTime = useLatest(time);

  const setTimer = (initial: number) => {
    setTime(initial);
    if (timer.current) clearTimer();
    timer.current = setInterval(() => {
      if (latestTime.current != 0) {
        setTime((t) => t - 1);
      } else {
        clearTimer();
      }
    }, interval);
  };

  const clearTimer = () => {
    timer.current && clearInterval(timer.current);
    setTime(0);
  };

  return { time: latestTime.current, setTimer, clearTimer };
}

export default useTimer;
