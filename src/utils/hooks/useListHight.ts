import { useState, useEffect } from "react";
import { useSelector, shallowEqual } from "react-redux";
import { RootState } from "../../store";

function useListHight(topGap: number,rate = 1) {
  const [listHeight, setListHeight] = useState(Math.floor((document.body.clientHeight - topGap)*rate));
  const fullState = useSelector((state: RootState) => state.user.fullState, shallowEqual);

  useEffect(() => {
    window.addEventListener("resize",resizeHandler);
    setListHeight(Math.floor((document.body.clientHeight - topGap)*rate));
    return () => {
      window.removeEventListener("resize",resizeHandler);
    }
  }, [fullState]);

  const resizeHandler = () => {
    setListHeight(Math.floor((document.body.clientHeight - topGap)*rate));
  }

  return { listHeight,setListHeight };
}

export default useListHight;
