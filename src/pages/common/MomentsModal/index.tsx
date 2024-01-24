import { forwardRef, ForwardRefRenderFunction, memo } from "react";

import DraggableModalWrap from "@/components/DraggableModalWrap";
import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";

import styles from "./index.module.scss";
import { Moments } from "./MomentsBox";

const MomentsModal: ForwardRefRenderFunction<OverlayVisibleHandle> = (_, ref) => {
  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);

  return (
    <DraggableModalWrap
      open={isOverlayOpen}
      title={null}
      footer={null}
      width={550}
      onCancel={closeOverlay}
      closeIcon={null}
      className={styles.modal}
      centered
      mask={false}
      ignoreClasses=".ignore-drag, .cursor-pointer, .ant-modal-wrap"
    >
      {isOverlayOpen && <Moments key={new Date().getTime()} onCancel={closeOverlay} />}
    </DraggableModalWrap>
  );
};

export default memo(forwardRef(MomentsModal));
