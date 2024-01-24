import { Modal } from "antd";
import { forwardRef, ForwardRefRenderFunction, memo, useEffect } from "react";

import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";
import emitter from "@/utils/events";

import SearchBox from "./SearchBox";

const SearchModal: ForwardRefRenderFunction<OverlayVisibleHandle> = (_, ref) => {
  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);

  useEffect(() => {
    emitter.on("CLOSE_SEARCH_MODAL", closeOverlay);
    return () => {
      emitter.off("CLOSE_SEARCH_MODAL", closeOverlay);
    };
  }, []);

  return (
    <Modal
      title={null}
      footer={null}
      centered
      open={isOverlayOpen}
      destroyOnClose
      closable={false}
      width={680}
      onCancel={closeOverlay}
      className="no-padding-modal global-search-modal"
      mask={false}
    >
      <SearchBox />
    </Modal>
  );
};

export default memo(forwardRef(SearchModal));
