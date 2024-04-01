import { useLatest } from "ahooks";
import { Empty, message, Spin } from "antd";
import { FC, memo, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../../store";
import { getCveList, setCurCve, setCveList } from "../../../../store/actions/cve";
import { diffMemo, im } from "../../../../utils";
import { ConversationItem } from "../../../../utils/open_im_sdk/types";
import CveItem from "./CveItem";
import List from "rc-virtual-list";
import { Loading } from "../../../../components/Loading";
import { throttle } from "throttle-debounce";

type CveListProps = {
  cveList: ConversationItem[];
  clickItem: (cve: ConversationItem) => void;
  loading: boolean;
  marginTop?: number;
  curCve: ConversationItem | null;
};

const CveList: FC<CveListProps> = (props) => {
  const { cveList, clickItem, loading, marginTop, curCve } = props;
  const curUid = useSelector((state: RootState) => state.user.selfInfo.userID, shallowEqual);
  const cveHasMore = useSelector((state: RootState) => state.cve.cveHasMore, shallowEqual);
  const fullState = useSelector((state: RootState) => state.user.fullState, shallowEqual);
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const latestList = useLatest(cveList);
  const [listHeight, setListHeight] = useState(document.body.clientHeight - (marginTop ?? 0));

  useEffect(() => {
    window.onresize = function () {
      setListHeight(document.body.clientHeight - (marginTop ?? 0));
    };
    setListHeight(document.body.clientHeight - (marginTop ?? 0));
  }, [fullState]);

  const delCve = useCallback((cid: string) => {
    im.deleteConversationFromLocalAndSvr(cid)
      .then((res) => {
        const tarray = [...latestList.current];
        const farray = tarray.filter((c) => c.conversationID !== cid);
        dispatch(setCveList(farray));
        dispatch(setCurCve({} as ConversationItem))
      })
      .catch((err) => message.error(t("AccessFailed")));
  }, []);

  const onScroll = (e: any) => {
    const nextFlag = e.target.scrollHeight - e.target.scrollTop < e.target.clientHeight + 30 && !loading && cveHasMore;
    if (nextFlag) {
      dispatch(getCveList([...cveList]));
    }
  };

  const throttleScroll = throttle(250, onScroll);

  return (
    <div className="cve_list">
      {cveList.length > 0 ? (
        <Spin tip={"Loading..."} spinning={loading}>
          <List
            height={listHeight}
            data={cveList}
            itemHeight={65}
            onScroll={throttleScroll}
            itemKey={"conversationID"}
            children={(item, idx) => <CveItem curUid={curUid!} curCid={curCve?.conversationID} onClick={clickItem} delCve={delCve} cve={item} />}
          />
        </Spin>
      ) : (
        <Empty description={t("NoCve")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </div>
  );
};

CveList.defaultProps = {
  marginTop: 58,
};

const diffKey = ["marginTop", "loading", "cveList"];
export default memo(CveList, (p, n) => {
  const shallowFlag = diffMemo(p, n, diffKey);
  const deepFlag = (p.curCve ?? {}).conversationID === (n.curCve ?? {}).conversationID;
  return shallowFlag && deepFlag;
});
