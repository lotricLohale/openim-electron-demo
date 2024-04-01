import { Modal } from "antd";
import { FC } from "react";
import { LngLat, Map, Marker } from "react-amap";
import { AMapKey } from "../../../../config";

type LocationModalProps = {
  isModalVisible: boolean;
  position: LngLat;
  close: () => void;
};

const LocationModal: FC<LocationModalProps> = ({ isModalVisible, position, close }) => {
  return (
    <Modal width="80%" bodyStyle={{ padding: 0,height:"70vh" }} centered title={null} footer={null} visible={isModalVisible} onCancel={close}>
      <Map protocol="https" center={position} amapkey={AMapKey}>
        <Marker position={position} />
      </Map>
    </Modal>
  );
};

export default LocationModal;
