import React from "react";

/**
 * 监听值变化，初次加载不进入
 */
export const useDidMountEffect = (func: Function, deps: React.DependencyList | undefined) => {
  const didMount = React.useRef(false);

  React.useEffect(() => {
    if (didMount.current) func();
    else didMount.current = true;
  }, deps);
};
// api请求loading
export const useApiLoading = () => {
  const [loading, setLoading] = React.useState(false);
  const apiLoading = (api: Function) => {
    return async (...args: any[]) => {
      setLoading(true);
      try {
        await api(...args);
      } catch (error) {}
      setLoading(false);
    };
  };
  return {
    loading,
    apiLoading,
  };
};
