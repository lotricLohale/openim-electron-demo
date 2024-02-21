import { Modal } from "antd";
import { FC } from "react";
import { ConversationItem, MergeElem, PictureElem } from "../../../../utils/open_im_sdk/types";
import ChatContent from "../../Cve/ChatContent";

type MerModalProps = {
  close: () => void;
  info: MergeElem & { sender: string };
  visible: boolean;
  curCve: ConversationItem;
};

const MerModal: FC<MerModalProps> = ({ close, info, visible, curCve }) => {
  return (
    <Modal key="MerModal" title={info?.title} visible={visible} footer={null} onCancel={close} mask={false} width="60vw" className="mer_modal total_content">
      <ChatContent isMerge={true} loadMore={() => {}} loading={false} msgList={[...info!.multiMessage].reverse()} hasMore={false} curCve={curCve} />
    </Modal>
  );
};

export default MerModal;
