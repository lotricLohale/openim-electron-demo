import { CloseOutlined } from "@ant-design/icons";
import { Modal } from "antd";
import { forwardRef, ForwardRefRenderFunction, memo } from "react";

import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";
import { MergeElem } from "@/utils/open-im-sdk-wasm/types/entity";

import MessageItem from "../chat/queryChat/MessageItem";

interface IMergePreviewModalProps {
  mergeData?: MergeElem;
}

const MergePreviewModal: ForwardRefRenderFunction<
  OverlayVisibleHandle,
  IMergePreviewModalProps
> = ({ mergeData }, ref) => {
  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);
  return (
    <Modal
      title={null}
      footer={null}
      centered
      open={isOverlayOpen}
      closable={false}
      width={680}
      onCancel={closeOverlay}
      maskStyle={{
        opacity: 0,
        transition: "none",
      }}
      className="no-padding-modal"
      maskTransitionName=""
    >
      <div className="flex h-16 items-center justify-between bg-[var(--gap-text)] px-7">
        <div className="font-medium">{mergeData?.title}</div>
        <CloseOutlined
          className="cursor-pointer text-[#8e9ab0]"
          rev={undefined}
          onClick={closeOverlay}
        />
      </div>
      <div className="h-[65vh] overflow-auto">
        {mergeData?.multiMessage.map((message) => (
          <MessageItem
            message={message}
            isSender={false}
            disabled
            key={message.clientMsgID}
          />
        ))}
      </div>
    </Modal>
  );
};

export default memo(forwardRef(MergePreviewModal));
