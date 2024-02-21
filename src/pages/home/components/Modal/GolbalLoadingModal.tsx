import { Modal, Spin } from "antd";

const GolbalLoadingModal = ({ golbalLoading }: { golbalLoading: boolean }) => (
  <Modal
    footer={null}
    visible={golbalLoading}
    closable={false}
    centered
    className="global_loading"
    maskStyle={{
      backgroundColor: "transparent",
    }}
    bodyStyle={{
      padding: 0,
      textAlign: "center",
    }}
  >
    <Spin tip="loading..." size="large" />
  </Modal>
);

export default GolbalLoadingModal;
