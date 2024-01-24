import { BellFilled, EyeFilled, PlusOutlined, RightOutlined } from "@ant-design/icons";
import { Input, message, Spin, Upload } from "antd";
import { TextAreaRef } from "antd/es/input/TextArea";
import type { UploadFile, UploadProps } from "antd/es/upload/interface";
import { useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { IMSDK } from "@/layout/MainContentWrap";
import { useFileMessage } from "@/pages/chat/queryChat/ChatFooter/SendActionBar/useFileMessage";
import { CheckListItem } from "@/pages/common/ChooseModal/ChooseBox/CheckItem";
import { openChooseContact } from "@/utils/childWindows";
import { feedbackToast, getFileType } from "@/utils/common";
import emitter from "@/utils/events";

import { PublishType } from "../index";
import type { PermissionType, PublishModalType } from "./index";

const { TextArea } = Input;

const uploadButton = (
  <div>
    <PlusOutlined />
    <div style={{ marginTop: 8 }}>Upload</div>
  </div>
);

interface ContentProps {
  text: string;
  setText: (text: string) => void;
  fileList: UploadFile[];
  permission: PermissionType;
  atUserList: CheckListItem[];
  publishType: PublishType;
  setFileList: (fileList: UploadFile[]) => void;
  setModalType: (type: PublishModalType) => void;
}

const Content = ({
  text,
  setText,
  publishType,
  fileList,
  permission,
  atUserList,
  setFileList,
  setModalType,
}: ContentProps) => {
  const textareaRef = useRef<TextAreaRef>(null);

  const { getVideoSnshotFile } = useFileMessage();
  const [spinning, setSpinning] = useState(false);

  const permissionText = () => {
    switch (permission) {
      case 0:
        return "公开";
      case 1:
        return "私密";
      case 2:
        return "部分可见";
      case 3:
        return "不给谁看";
      default:
        break;
    }
  };

  const uploadImgProps: UploadProps = {
    accept: "image/*",
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    customRequest: async (options) => {
      try {
        const fileData = options.file as File;
        const {
          data: { url },
        } = await IMSDK.uploadFile({
          name: fileData.name,
          contentType: getFileType(fileData.name),
          uuid: uuidv4(),
          file: fileData,
        });
        setFileList([
          ...fileList.filter((e) => e.status === "done"),
          {
            uid: url,
            name: url,
            status: "done",
            url: url,
            response: url,
          },
        ]);
      } catch (error) {
        feedbackToast({ error: "上传图片失败！" });
      }
    },
    onChange: ({ fileList: newFileList }) => setFileList(newFileList),
  };

  const uploadVideoProps: UploadProps = {
    accept: "video/mp4",
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    customRequest: async (options) => {
      setSpinning(true);
      try {
        const fileData = options.file as File;
        const fileImg = await getVideoSnshotFile(fileData);
        const {
          data: { url: videoUrl },
        } = await IMSDK.uploadFile({
          name: fileData.name,
          contentType: getFileType(fileData.name),
          uuid: uuidv4(),
          file: fileData,
        });
        const {
          data: { url: videoImg },
        } = await IMSDK.uploadFile({
          name: fileImg.name,
          contentType: getFileType(fileImg.name),
          uuid: uuidv4(),
          file: fileImg,
        });
        setFileList([
          ...fileList.filter((e) => e.status === "done"),
          {
            uid: videoUrl,
            name: videoImg,
            status: "done",
            url: videoImg,
            response: videoImg,
          },
        ]);
      } catch (error) {
        console.log(error);
        message.error("上传视频失败！");
        setFileList([...fileList.filter((e) => e.status === "done")]);
      }
      setSpinning(false);
    },
    onChange: ({ fileList: newFileList }) => setFileList(newFileList),
  };

  const uploadProps = publishType === 0 ? uploadImgProps : uploadVideoProps;

  const handleAt = () => {
    // if (window.electronAPI) {
    //   const data = {
    //     notConversation: true,
    //     friendList: atUserList,
    //     groupList: [],
    //   };
    //   openChooseContact(JSON.stringify(data));
    // } else {
    emitter.emit("OPEN_CHOOSE_MODAL", {
      type: "SELECT_USER",
      extraData: {
        notConversation: true,
        list: atUserList,
      },
    });
    // }
  };

  return (
    <div className="flex-1">
      <Spin spinning={spinning}>
        <div className="mt-2 bg-white p-2">
          <TextArea
            showCount
            bordered={false}
            placeholder="这一刻的想法..."
            maxLength={150}
            value={text}
            onChange={(e) => setText(e.target.value)}
            ref={textareaRef}
            autoSize={{ minRows: 4, maxRows: 4 }}
          />
          <Upload listType="picture-card" fileList={fileList} {...uploadProps}>
            {fileList.length >= 9 ? null : uploadButton}
          </Upload>
        </div>
        <div
          className="py- mt-2 flex cursor-pointer items-center justify-between bg-white px-4 py-4"
          onClick={() => setModalType("PRERMISSION_SLELCT")}
        >
          <div style={{ color: "#8E9AB0 " }}>
            <EyeFilled />
            <span className=" ml-2">谁可以看</span>
          </div>
          <div style={{ color: "#8E9AB0 " }}>
            <span className="text-blue-400">{permissionText()}</span>
            <RightOutlined />
          </div>
        </div>
        <div
          className="flex cursor-pointer items-center justify-between bg-white px-4 pt-4"
          onClick={handleAt}
        >
          <div style={{ color: "#8E9AB0 " }}>
            <BellFilled />
            <span className="ml-2">提醒谁看</span>
          </div>
          <div style={{ color: "#8E9AB0 " }} className="">
            <RightOutlined />
          </div>
        </div>
        <div className="bg-white py-2">
          {atUserList.length > 0 && (
            <span className="ml-5.5 mt-1 text-xs text-blue-400">
              {atUserList.map((e) => e.nickname).join("、")}
            </span>
          )}
        </div>
      </Spin>
    </div>
  );
};

export default Content;
