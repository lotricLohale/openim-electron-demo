import React from "react";

/**
 * 监听值变化，初次加载不进入
 */
export const useDidMountEffect = (
  func: Function,
  deps: React.DependencyList | undefined,
) => {
  const didMount = React.useRef(false);

  React.useEffect(() => {
    if (didMount.current) func();
    else didMount.current = true;
  }, deps);
};
