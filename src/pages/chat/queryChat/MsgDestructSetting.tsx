import { RightOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import { Modal, Select, Space, Spin } from "antd";
import {
  forwardRef,
  ForwardRefRenderFunction,
  memo,
  useEffect,
  useRef,
  useState,
} from "react";

import SettingRow from "@/components/SettingRow";
import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";
import { feedbackToast } from "@/utils/common";
import { ConversationItem } from "@/utils/open-im-sdk-wasm/types/entity";

const MsgDestructSetting = ({
  currentConversation,
  updateConversationMsgDestructState,
  updateDestructDuration,
}: {
  currentConversation?: ConversationItem;
  updateConversationMsgDestructState: () => Promise<void>;
  updateDestructDuration: (seconds: number) => Promise<void>;
}) => {
  const destructModalRef = useRef<OverlayVisibleHandle>(null);

  return (
    <>
      <SettingRow
        className="pb-2"
        title={"定期删除消息记录"}
        value={currentConversation?.isMsgDestruct}
        tryChange={updateConversationMsgDestructState}
      />
      {currentConversation?.isMsgDestruct && (
        <>
          <SettingRow
            className="cursor-pointer"
            title={"定期删除消息记录时间"}
            value={false}
            rowClick={() => destructModalRef.current?.openOverlay()}
          >
            <div className="flex items-center">
              <span className="mr-1 text-xs text-[var(--sub-text)]">
                {getDestructStr(currentConversation?.msgDestructTime ?? 86400)}
              </span>
              <RightOutlined rev={undefined} />
            </div>
          </SettingRow>
          <ForwardDestructDurationModal
            ref={destructModalRef}
            destructDuration={currentConversation?.msgDestructTime ?? 30}
            updateDestructDuration={updateDestructDuration}
          />
        </>
      )}
    </>
  );
};

export default MsgDestructSetting;

export const getDestructStr = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const weeks = Math.floor(days / 7);
  const month = Math.floor(weeks / 4);
  if (days <= 6) {
    return `${days}天`;
  } else if (weeks <= 6 && days % 7 === 0) {
    return `${weeks}周`;
  }
  return `${month}个月`;
};

const timeUnitOptions = [
  {
    label: "天",
    value: 86400,
  },
  {
    label: "周",
    value: 86400 * 7,
  },
  {
    label: "月",
    value: 86400 * 30,
  },
];

const DestructDurationModal: ForwardRefRenderFunction<
  OverlayVisibleHandle,
  {
    destructDuration: number;
    updateDestructDuration: (seconds: number) => Promise<void>;
  }
> = ({ destructDuration, updateDestructDuration }, ref) => {
  const [optionState, setOptionState] = useState({
    number: 1,
    unit: 86400,
  });
  const { closeOverlay, isOverlayOpen } = useOverlayVisible(ref);

  const { loading, runAsync, cancel } = useRequest(updateDestructDuration, {
    manual: true,
  });

  useEffect(() => {
    const days = Math.floor(destructDuration / 86400);
    const weeks = Math.floor(days / 7);
    const month = Math.floor(weeks / 4);
    if (days <= 6) {
      setOptionState({
        number: days,
        unit: 86400,
      });
    } else if (weeks <= 6 && days % 7 === 0) {
      setOptionState({
        number: weeks,
        unit: 86400 * 7,
      });
    } else {
      setOptionState({
        number: month,
        unit: 86400 * 30,
      });
    }
  }, [destructDuration]);

  const handleNumberChange = (value: number) => {
    setOptionState((prev) => ({ ...prev, number: value }));
  };

  const handleUnitChange = (value: number) => {
    setOptionState((prev) => ({ ...prev, unit: value }));
  };

  const saveChange = async () => {
    try {
      await runAsync(optionState.number * optionState.unit);
    } catch (error) {
      feedbackToast({ error });
    }
    closeOverlay();
  };

  const onCancel = () => {
    cancel();
    closeOverlay();
  };

  return (
    <Modal
      title={null}
      footer={null}
      closable={false}
      open={isOverlayOpen}
      destroyOnClose
      centered
      onCancel={onCancel}
      width={320}
      className="no-padding-modal"
    >
      <Spin spinning={loading}>
        <div className="px-5.5 py-6">
          <div className="mb-1">定期删除消息记录</div>
          <div className="text-xs text-[var(--sub-text)]">
            在此之后发送的消息会在选择的时间之后自动删除
          </div>
          <div className="mt-5">
            <Space wrap>
              <Select
                value={optionState.number}
                style={{ width: 60 }}
                onChange={handleNumberChange}
                options={Array(7)
                  .fill(1)
                  .map((_, idx) => ({ label: idx + 1, value: idx + 1 }))}
              />
              <Select
                style={{ width: 60 }}
                value={optionState.unit}
                onChange={handleUnitChange}
                options={timeUnitOptions}
              />
            </Space>
          </div>
          <div className="mt-10 flex items-center justify-end">
            <div>
              <span className="mr-3 cursor-pointer" onClick={closeOverlay}>
                取消
              </span>
              <span
                className="cursor-pointer text-[var(--primary)]"
                onClick={saveChange}
              >
                保存
              </span>
            </div>
          </div>
        </div>
      </Spin>
    </Modal>
  );
};

export const ForwardDestructDurationModal = memo(forwardRef(DestructDurationModal));
