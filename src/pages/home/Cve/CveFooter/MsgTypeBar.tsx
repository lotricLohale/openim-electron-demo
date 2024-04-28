import { AudioOutlined, CrownOutlined, PlayCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Dropdown, Menu, message, Image as AntdImage, Tooltip, Progress } from "antd";
import { forwardRef, ForwardRefRenderFunction, memo, useEffect, useImperativeHandle, useState } from "react";
import { UploadRequestOption } from "rc-upload/lib/interface";
import { base64toFile, events, fileToBase64, getPicInfo, getVideoInfo, im, switchUpload } from "../../../../utils";
import Upload, { RcFile } from "antd/lib/upload";
import { PICMESSAGETHUMOPTION } from "../../../../config";
import { newFaceMap as faceMap } from "../../../../constants/faceType";
import send_id_card from "@/assets/images/send_id_card.png";
import send_pic from "@/assets/images/send_pic.png";
import send_video from "@/assets/images/send_video.png";
import send_file from "@/assets/images/send_file.png";
import input_emoji from "@/assets/images/input_emoji.png";
import input_cut from "@/assets/images/input_cut.png";
import input_video from "@/assets/images/input_video.png";
import input_pic from "@/assets/images/input_pic.png";
import input_card from "@/assets/images/input_card.png";
import input_file from "@/assets/images/input_file.png";
import input_call from "@/assets/images/input_call.png";
import face_cicon from "@/assets/images/face_cicon.png";
import face_cicon_se from "@/assets/images/face_cicon_se.png";
import face_eicon from "@/assets/images/face_eicon.png";
import face_eicon_se from "@/assets/images/face_eicon_se.png";
import { useTranslation } from "react-i18next";
import { CustomEmojiType, FaceType, MediaType } from "../../../../@types/open_im";
import styles from "../../../../components/VirtualSearchBar/index.module.less";
import { minioUploadType } from "../../../../api/admin";
import { MessageItem, MessageType, SessionType } from "../../../../utils/open_im_sdk/types";
import { uuid } from "../../../../utils/open_im_sdk";
import { GET_RTC_INVITEIDS, OPEN_GROUP_MODAL, SEND_DROP_FILE, SIGNAL_INGINVITE } from "../../../../constants/events";
import { useSelector, shallowEqual } from "react-redux";
import { RootState } from "../../../../store";
import GolbalLoading from "../../../../components/GolbalLoading";

type MsgTypeBarProps = {
  disabled: boolean;
  choseCard: () => void;
  faceClick: (face: (typeof faceMap)[0] | CustomEmojiType, type: FaceType) => void;
  sendMsg: (nMsg: string, type: MessageType, uid?: string, gid?: string, showNotification?: boolean, fileArrayBuffer?: ArrayBuffer, snpArrayBuffer?: ArrayBuffer) => void;
};

type MsgTypeBarHandle = {
  sendImageMsg: (file: RcFile, url: string) => void;
  closeFaceDropDown: () => void;
};

const MsgTypeBar: ForwardRefRenderFunction<MsgTypeBarHandle, MsgTypeBarProps> = ({ disabled, choseCard, faceClick, sendMsg }, ref) => {
  const { t } = useTranslation();
  const [expressionStyle, setExpressionStyle] = useState(1);
  const [visibleValue, setVisibleValue] = useState(false);
  const [emojiMap, setEmojiMap] = useState<CustomEmojiType[]>([]);
  const [getEmojiIndex, setGetEmojiIndex] = useState<number>();
  const [uploadLoading, seUploadLoading] = useState(false);
  const [uploadingStatus, setUploadingStatus] = useState("active");
  const [uploadingProgress, setUploadingProgress] = useState(0);
  const selfInfo = useSelector((state: RootState) => state.user.selfInfo, shallowEqual);
  const curCve = useSelector((state: RootState) => state.cve.curCve, shallowEqual);

  useEffect(() => {
    events.on(SEND_DROP_FILE, dropHandler);
    return () => {
      events.off(SEND_DROP_FILE, dropHandler);
    };
  }, []);

  const dropHandler = (files: File[]) => {
    // if (window.electron) {
    // switchFileAndSend(data, "file");
    // } else {
    files.map((file) => {
      sendCosMsg(
        {
          file,
          type: file.type,
        } as any,
        "file"
      );
    });
    // }
  };

  const imgMsg = async (file: RcFile) => {
    const fileArrayBuffer = await getFileData(file as Blob);
    const { width, height } = await getPicInfo(file);
    const sourcePicture = {
      uuid: file.uid,
      type: getFileType(file.name),
      size: file.size,
      width,
      height,
      url: "",
    };
    const imgInfo = {
      sourcePicture,
      snapshotPicture: sourcePicture,
      bigPicture: sourcePicture,
    };
    const msgStr = (await im.createImageMessage(imgInfo)).data;
    const imgMsg: MessageItem = JSON.parse(msgStr);
    imgMsg.pictureElem.sourcePicture.url = URL.createObjectURL(file);
    sendMsg(JSON.stringify(imgMsg), MessageType.PICTUREMESSAGE, undefined, undefined, false, fileArrayBuffer);
  };

  const videoMsg = async (file: RcFile) => {
    const fileArrayBuffer = await getFileData(file as Blob);
    const info = await getVideoInfo(URL.createObjectURL(file));
    const snpFile = base64toFile(info.snapshotUrl);
    const snpArrayBuffer = await getFileData(snpFile as Blob);
    const { width, height } = await getPicInfo(snpFile as any);
    const videoInfo = {
      videoPath: "",
      duration: parseInt(info.duration + ""),
      videoType: getFileType(file.name),
      snapshotPath: "",
      videoUUID: file.uid,
      videoUrl: "",
      videoSize: file.size,
      snapshotUUID: file.uid,
      snapshotSize: snpFile.size,
      snapshotUrl: "",
      snapshotWidth: width,
      snapshotHeight: height,
      snapShotType: "png",
    };
    const { data } = await im.createVideoMessage(videoInfo);
    const videoMsg: MessageItem = JSON.parse(data);
    videoMsg.videoElem.snapshotUrl = URL.createObjectURL(snpFile);
    sendMsg(JSON.stringify(videoMsg), MessageType.VIDEOMESSAGE, undefined, undefined, false, fileArrayBuffer, snpArrayBuffer);
  };

  const fileMsg = async (file: RcFile) => {
    const fileArrayBuffer = await getFileData(file as Blob);

    const fileInfo = {
      filePath: "",
      fileName: file.name,
      uuid: file.uid,
      sourceUrl: "",
      fileSize: file.size,
      fileType: getFileType(file.name),
    };
    const { data } = await im.createFileMessage(fileInfo);
    sendMsg(data, MessageType.FILEMESSAGE, undefined, undefined, false, fileArrayBuffer);
  };

  const getFileType = (name: string) => {
    const idx = name.lastIndexOf(".");
    return name.slice(idx + 1);
  };

  const uploadProgress = (progress: number) => {
    setUploadingProgress(progress);
  };

  const sendCosMsg = async (uploadData: UploadRequestOption, type: string) => {
    // if (window.electron?.isWin && (uploadData.file as RcFile).size > 52428800) {
    //   message.warning("上传文件超出大小限制！");
    //   return;
    // }
    const fileType = (uploadData.file as RcFile).type;
    switch (type) {
      case "pic":
        imgMsg(uploadData.file as RcFile);
        break;
      case "video":
        videoMsg(uploadData.file as RcFile);
        break;
      case "file":
        if (fileType.includes("image")) {
          imgMsg(uploadData.file as RcFile);
        } else if (fileType.includes("video")) {
          videoMsg(uploadData.file as RcFile);
        } else {
          fileMsg(uploadData.file as RcFile);
        }
        break;
      default:
        break;
    }
  };

  const changeEmojiStyle = (style: any) => {
    switch (style) {
      case 1:
        setExpressionStyle(1);
        setVisibleValue(true);
        break;
      default: // 获取本地表情包
        // 获取当前用户ID
        setExpressionStyle(2);
        setVisibleValue(true);
        const emojiStorage = JSON.parse(localStorage.getItem("userEmoji")!);
        const userId = selfInfo.userID;
        // 获取当前用户的表情包
        const emojis = emojiStorage.filter((item: any) => {
          return item.userID === String(userId);
        });
        setEmojiMap(emojis[0].emoji);
        break;
    }
  };

  const handleVisibleChange = (flag: any) => {
    setVisibleValue(flag);
    if (flag) {
      setExpressionStyle(1);
    }
  };

  const closeFaceDropDown = () => {
    setVisibleValue(false);
  };

  const deleteFace = () => {
    const emojiStorage = JSON.parse(localStorage.getItem("userEmoji")!);
    const userId = selfInfo.userID;
    const emojis = emojiStorage.filter((item: any) => {
      return item.userID === String(userId);
    });
    const otherUserEmoji = emojiStorage.filter((item: any) => {
      return item.userID !== String(userId);
    });
    const newFace = emojis[0].emoji.filter((item: any, index: number) => {
      return index !== getEmojiIndex;
    });
    const allUserEmoji = [
      {
        userID: String(userId),
        emoji: newFace,
      },
      ...otherUserEmoji,
    ];
    localStorage.setItem("userEmoji", JSON.stringify(allUserEmoji));
    setEmojiMap(newFace);
  };

  const uploadIcon = async (uploadData: UploadRequestOption) => {
    switchUpload(uploadData)
      .then(async (res) => {
        const { width, height } = await getPicInfo(uploadData.file as RcFile);
        const userEmoji = JSON.parse(localStorage.getItem("userEmoji")!);
        const userId = selfInfo.userID;
        const emojiObj = userEmoji.filter((item: any) => {
          return item.userID === String(userId);
        });
        const otherUserEmoji = userEmoji.filter((item: any) => {
          return item.userID !== String(userId);
        });
        // console.log(emojiObj)
        emojiObj[0].emoji = [
          {
            url: res.data.URL,
            width,
            height,
          },
          ...emojiObj[0].emoji,
        ];
        const allUserEmoji = [
          {
            userID: String(userId),
            emoji: emojiObj[0].emoji,
          },
          ...otherUserEmoji,
        ];
        localStorage.setItem("userEmoji", JSON.stringify(allUserEmoji));
        const newData = JSON.parse(localStorage.getItem("userEmoji")!);
        const newFace = newData.filter((item: any) => {
          return item.userID === String(userId);
        });
        setEmojiMap(newFace[0].emoji);
      })
      .catch((err) => message.error(t("UploadFailed")));
  };

  const faceMenu = () => (
    <Menu className={styles.btn_menu}>
      <Menu.Item key="1" onClick={() => deleteFace()}>
        {t("Delete")}
      </Menu.Item>
    </Menu>
  );

  const copy2Send = (file: any) => {
    // if (file.path) {
    //   switchFileAndSend([file.path], "file");
    // }
    sendCosMsg({ file } as UploadRequestOption, "file");
  };

  useImperativeHandle(ref, () => ({
    sendImageMsg: imgMsg,
    closeFaceDropDown,
    copy2Send,
  }));

  const FaceType = () => (
    <div style={{ boxShadow: "0px 4px 25px rgb(0 0 0 / 16%)" }} className="face_container">
      {expressionStyle === 1 ? (
        <div className="face_container_emoji">
          {faceMap.map((face) => (
            <div key={face.context} onClick={() => faceClick(face, "emoji")} className="face_item">
              <AntdImage preview={false} width={24} src={face.src} />
            </div>
          ))}
        </div>
      ) : (
        <div className="face_container_emoji">
          <Upload accept="image/*" action={""} customRequest={(data) => uploadIcon(data)} showUploadList={false}>
            <span className="upload">
              <div>
                <PlusOutlined style={{ fontSize: "35px" }} />
              </div>
            </span>
          </Upload>
          {emojiMap?.map((face, index) => (
            <div key={index} className="emoji_item">
              <Dropdown overlay={faceMenu} trigger={["contextMenu"]} placement="bottom">
                <AntdImage
                  preview={false}
                  style={{ borderRadius: "5px" }}
                  height={50}
                  width={50}
                  src={face.url}
                  onClick={() => faceClick(face, "customEmoji")}
                  onContextMenu={() => setGetEmojiIndex(index)}
                />
              </Dropdown>
            </div>
          ))}
        </div>
      )}

      <hr style={{ margin: 0, opacity: ".3" }}></hr>
      <div className="expression_style">
        <span style={expressionStyle === 1 ? { backgroundColor: "#f5f5f6" } : { backgroundColor: "" }} onClick={() => changeEmojiStyle(1)}>
          <img src={expressionStyle === 1 ? face_eicon_se : face_eicon} />
        </span>
        <span style={expressionStyle !== 1 ? { backgroundColor: "#f5f5f6" } : { backgroundColor: "" }} onClick={() => changeEmojiStyle(2)}>
          <img src={expressionStyle === 1 ? face_cicon : face_cicon_se} />
        </span>
      </div>
    </div>
  );

  const switchType = (type: string) => {
    switch (type) {
      case "pic":
        return "image/*";
      case "video":
        return "video/*";
      case "file":
        return "*";
      default:
        return "*";
    }
  };

  // const openElecDialog = async (type: string) => {
  //   if (!window.electron) return;
  //   // @ts-ignore
  //   const res: string[] = window.electron.OpenShowDialog([switchType(type)]);
  //   switchFileAndSend(res, type);
  // };

  // const switchFileAndSend = async (pathList: string[], type: string) => {
  //   let msgStr = "";
  //   let snpPath = "";
  //   if (pathList) {
  //     const imageSuffixs = ["jpeg", "png", "gif", "jpg", "gif"];
  //     const videoSuffixs = ["avi", "wmv", "asf", "mp4", "mpg", "mpeg", "mov", "mp4", "flv"];
  //     const suffix = pathList[0].slice(pathList[0].lastIndexOf(".") + 1);

  //     const nameIdx = pathList[0].lastIndexOf(window.electron.isWin ? "\\" : "/") + 1;

  //     if (type === "pic" || (imageSuffixs.includes(suffix) && type === "file")) {
  //       const imageData = await im.createImageMessageFromFullPath(pathList[0]);
  //       const imgMsg: MessageItem = JSON.parse(imageData.data);
  //       imgMsg.pictureElem.sourcePicture.url = "file://" + pathList[0];
  //       msgStr = JSON.stringify(imgMsg);
  //     } else if (type === "video" || (videoSuffixs.includes(suffix) && type === "file")) {
  //       const suffixIdx = pathList[0].lastIndexOf(".") + 1;
  //       const dataUrl = window.electron.file2url(pathList[0]);
  //       const info = await getVideoInfo(dataUrl);
  //       const catchPath = window.electron.getCachePath();
  //       snpPath = catchPath + pathList[0].slice(nameIdx - 1, suffixIdx) + "png";
  //       await window.electron.save2path(snpPath, info.snapshotUrl);
  //       const videoData = await im.createVideoMessageFromFullPath({
  //         videoFullPath: pathList[0],
  //         videoType: pathList[0].slice(suffixIdx),
  //         duration: info.duration,
  //         snapshotFullPath: snpPath,
  //       });
  //       const videoMsg: MessageItem = JSON.parse(videoData.data);
  //       videoMsg.videoElem.snapshotUrl = "file://" + snpPath;
  //       msgStr = JSON.stringify(videoMsg);
  //     } else {
  //       const fileData = await im.createFileMessageFromFullPath({ fileFullPath: pathList[0], fileName: pathList[0].slice(nameIdx) });
  //       msgStr = fileData.data;
  //     }
  //     sendMsg(msgStr, MessageType.FILEMESSAGE, undefined, undefined, false, snpPath);
  //   }
  // };

  const CallType = () => (
    <Menu className="call_menu">
      <Menu.Item key={"video_call"} onClick={videoCall} icon={<PlayCircleOutlined />}>
        {t("VideoCall")}
      </Menu.Item>
      <Menu.Item key={"voice_call"} onClick={voiceCall} icon={<AudioOutlined />}>
        {t("VoiceCall")}
      </Menu.Item>
    </Menu>
  );

  const ScreenShotMenu = () => {
    return (
      <Menu className="call_type_drop shot_menu">
        <Menu.Item
          key={"hidden"}
          onClick={() => {
            window.electron?.screenshot(true);
          }}
        >
          {t("HiddenWin")}
        </Menu.Item>
      </Menu>
    );
  };

  const shotScreen = () => window.electron?.screenshot();

  const voiceCall = async () => {
    events.emit(SIGNAL_INGINVITE, await getCallConfig("audio"));
  };

  const videoCall = async () => {
    events.emit(SIGNAL_INGINVITE, await getCallConfig("video"));
  };

  const getCallConfig = async (mediaType: MediaType) => {
    return {
      inviterUserID: selfInfo.userID,
      inviteeUserIDList: await getIDList(),
      groupID: curCve?.groupID,
      roomID: uuid("rtc"),
      timeout: 30,
      mediaType,
      sessionType: curCve?.conversationType,
      platformID: window.electron ? window.electron.platform : 5,
    };
  };

  const getIDList = () => {
    return new Promise<string[]>((resolve, reject) => {
      if (curCve?.conversationType === SessionType.Single) {
        resolve([curCve!.userID]);
      } else {
        events.emit(OPEN_GROUP_MODAL, "rtc_invite", curCve?.groupID);
        events.once(GET_RTC_INVITEIDS, (list: string[]) => {
          resolve(list);
        });
      }
    });
  };

  const UploadLoadingContent = () => {
    return <Progress status={uploadingStatus as any} type="circle" percent={uploadingProgress} width={72} />;
  };

  const nomalAction = (idx: number) => {
    if (disabled) {
      return;
    }
    switch (idx) {
      case 2:
        shotScreen();
        break;
      case 5:
        choseCard();
        break;
      default:
        break;
    }
  };

  const actionList = [
    {
      idx: 1,
      title: t("Emoji"),
      mediaType: "",
      icon: input_emoji,
    },
    {
      idx: 2,
      title: t("Cut"),
      mediaType: "",
      icon: input_cut,
    },
    {
      idx: 3,
      title: t("Pic"),
      mediaType: "pic",
      icon: input_pic,
    },
    {
      idx: 4,
      title: t("Video"),
      mediaType: "video",
      icon: input_video,
    },
    {
      idx: 5,
      title: t("IDCard"),
      mediaType: "",
      icon: input_card,
    },
    {
      idx: 6,
      title: t("File"),
      mediaType: "file",
      icon: input_file,
    },
    {
      idx: 7,
      title: t("Call"),
      mediaType: "",
      icon: input_call,
    },
  ];

  const getFileData = (data: Blob): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result as ArrayBuffer);
      };
      reader.readAsArrayBuffer(data);
    });
  };

  const switchAction = (action: (typeof actionList)[0]) => {
    switch (action.idx) {
      case 1:
        return (
          <Dropdown
            key={action.title}
            disabled={disabled}
            visible={visibleValue}
            onVisibleChange={handleVisibleChange}
            overlayClassName="face_type_drop"
            overlay={FaceType}
            placement="topLeft"
            arrow={{ pointAtCenter: true }}
            trigger={["click"]}
          >
            <img src={action.icon} />
          </Dropdown>
        );
      case 3:
      case 4:
      case 6:
        return (
          <Upload
            key={action.title}
            // disabled={window.electron !== undefined || disabled}
            disabled={disabled}
            accept={switchType(action.mediaType) as string}
            action={""}
            customRequest={(data) => sendCosMsg(data, action.mediaType)}
            // customRequest={(data) => wasmTest(data)}
            showUploadList={false}
          >
            <Tooltip title={action.title}>
              {/* <img onClick={() => openElecDialog(action.mediaType)} src={action.icon} /> */}
              <img src={action.icon} />
            </Tooltip>
          </Upload>
        );
      case 7:
        return (
          <Dropdown key={action.title} disabled={disabled} overlayClassName="call_type_drop" overlay={CallType} trigger={["click"]} placement="top" arrow={{ pointAtCenter: true }}>
            <img src={action.icon} />
          </Dropdown>
        );
      default:
        return action.idx === 2 && !window.electron ? null : (
          <Dropdown key={action.title} overlay={ScreenShotMenu} trigger={["contextMenu"]} placement="top" arrow={{ pointAtCenter: true }}>
            <img onClick={() => nomalAction(action.idx)} src={action.icon} />
          </Dropdown>
          // <Tooltip key={action.title} title={action.title}>
          //   <img onClick={() => nomalAction(action.idx)} src={action.icon} />
          // </Tooltip>
        );
    }
  };

  return (
    <>
      <div className="action_bar">{actionList.map((action) => switchAction(action))}</div>
      {uploadLoading && <GolbalLoading content={<UploadLoadingContent />} visible={uploadLoading} />}
    </>
  );
};

export default memo(forwardRef(MsgTypeBar), (p, n) => p.disabled === n.disabled);
