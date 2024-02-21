import { useRef } from "react";

function useDebounce(time: number, fun: any) {
  const timer = useRef<NodeJS.Timeout | null>(null);

  const debounceWrapper = (...arg: any[]) => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    setTimeout(() => {
      fun(...arg);
    }, time);
  };

  return { debounceWrapper };
}

export default useDebounce;
