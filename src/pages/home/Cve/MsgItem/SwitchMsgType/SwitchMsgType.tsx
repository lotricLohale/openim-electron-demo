import { Tooltip, Image, Spin, Progress, message, Typography } from "antd";
import { useState, useRef, CSSProperties, useEffect, FC, useMemo, memo } from "react";
import { useSelector, shallowEqual } from "react-redux";
import { LngLat, Map, Marker } from "react-amap";
import {
  DELETE_MESSAGE,
  IMG_PREVIEW_CLICK,
  JOIN_MEETING,
  MER_MSG_MODAL,
  MSG_UPDATE_CONTENT,
  SHOW_LOCATION_MODAL,
  SHOW_PLAYER_MODAL,
  SIGNAL_INGINVITE,
} from "../../../../../constants/events";
import { newFaceMap as faceMap } from "../../../../../constants/faceType";
import { customType } from "../../../../../constants/messageContentType";
import { RootState } from "../../../../../store";
import { switchFileIcon, bytesToSize, events, parseTime, diffMemo, sec2Format } from "../../../../../utils";

import other_voice from "@/assets/images/voice_other.png";
import my_voice from "@/assets/images/voice_my.png";
import my_video_call from "@/assets/images/custom_video_my.png";
import other_video_call from "@/assets/images/custom_video_other.png";
import voice_call from "@/assets/images/custom_voice.png";
import group_notify from "@/assets/images/group_notify.png";
import { useTranslation } from "react-i18next";
import {
  AtElem,
  ConversationItem,
  FileElem,
  MergeElem,
  MessageItem,
  MessageStatus,
  MessageType,
  NotificationElem,
  PictureElem,
  SessionType,
  SoundElem,
  VideoElem,
} from "../../../../../utils/open_im_sdk/types";
import { t } from "i18next";
import { LoadingOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { im, isFileDownloaded, parseMessageType } from "../../../../../utils/im";
import { MediaType } from "../../../../../@types/open_im";
import { uuid } from "../../../../../utils/open_im_sdk";
import MyAvatar from "../../../../../components/MyAvatar";
import moment from "moment";
import { secondsToTime } from "../../../components/Modal/data";
import { NoticeRender, useNoticeCodeWidthTitle } from "../notice";

const imgClickEmit = (el: PictureElem) => {
  events.emit(IMG_PREVIEW_CLICK, el);
};

const showInModal = (position: LngLat) => {
  events.emit(SHOW_LOCATION_MODAL, position);
};

const parseEmojiFace = (mstr: string) => {
  faceMap.map((f) => {
    const idx = mstr.indexOf(f.context);
    debugger
    console.log('mstr', mstr, faceMap);
    if (idx > -1) {
      mstr = mstr.replaceAll(f.context, `<img style="padding-right:2px" width="24px" src=${f.src} />`);
    }
  });
  return mstr;
};

const parseAt = (atel: AtElem) => {
  let mstr = atel.text ?? "";
  const pattern = /@\S+\s/g;
  const arr = mstr.match(pattern);
  const idkey = "atUserID";
  const namekey = "groupNickname";
  const searchList = atel.atUsersInfo ?? [];
  arr?.map((a) => {
    //@ts-ignore
    const member = searchList.find((gm: any) => gm[idkey] === a.slice(1, -1));
    if (member) {
      mstr = mstr.replaceAll(a, `<span onclick='userClick("${member[idkey].replace(".", "-")}")' style="color:#428be5;cursor: pointer;"> @${member[namekey]} </span>`);
    } else {
      mstr = mstr.replaceAll(a, `<span onclick="userClick('${a.slice(1, -1)}')" style="color:#428be5;cursor: pointer;"> ${a}</span>`);
    }
  });
  return mstr;
};

const parseBr = (mstr: string) => {
  let text = "";
  try {
    text = mstr.replaceAll("\\n", "<br>").replaceAll("\n", "<br>");
  } catch (error) {
    text = mstr.replace(new RegExp("\\n", "g"), "<br>").replace(new RegExp("\n", "g"), "<br>");
  }
  return text;
};

const parseUrl = (mstr: string) => {
  const pattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi;
  const arr = mstr.match(pattern);
  arr?.forEach((a) => {
    mstr = mstr.replaceAll(a, `<a onclick="urlClick('${a}')" href="javascript:;">${a}</a>`);
  });
  return mstr;
};

const parseQute = (quMsg: MessageItem, isSelfMsg: boolean, playVoice: Function) => {
  switch (quMsg.contentType) {
    case MessageType.TEXTMESSAGE:
      const parsedMsg = parseBr(parseUrl(parseEmojiFace(quMsg.content)));
      return <div className="content" dangerouslySetInnerHTML={{ __html: parsedMsg }}></div>;
    case MessageType.ATTEXTMESSAGE:
      let atMsg = parseAt(quMsg.atElem);
      atMsg = parseEmojiFace(atMsg);
      atMsg = parseUrl(atMsg);
      atMsg = parseBr(atMsg);
      return <div className="content" dangerouslySetInnerHTML={{ __html: atMsg }}></div>;
    case MessageType.PICTUREMESSAGE:
      return <Image style={{ maxWidth: "60px" }} src={quMsg.pictureElem.sourcePicture.url} />;
    case MessageType.VIDEOMESSAGE:
      return (
        <div className={`chat_bg_msg_content_video`}>
          <Image style={{ maxWidth: "60px" }} src={quMsg.videoElem.snapshotUrl ?? fallback} preview={false} fallback={fallback} />
          <PlayCircleOutlined
            style={{ fontSize: "16px" }}
            onClick={(e) => {
              e.stopPropagation();
              events.emit(SHOW_PLAYER_MODAL, quMsg.videoElem.videoUrl);
            }}
          />
        </div>
      );
    case MessageType.VOICEMESSAGE:
      return (
        <div className="voice_container" style={{ flexDirection: isSelfMsg ? "row-reverse" : "row", cursor: "pointer" }} onClick={() => playVoice(quMsg.soundElem.sourceUrl)}>
          <img style={!isSelfMsg ? { paddingLeft: "4px" } : { paddingRight: "4px" }} src={isSelfMsg ? my_voice : other_voice} alt="" />
          {`${quMsg.soundElem.duration} ''`}
        </div>
      );
    case MessageType.FILEMESSAGE:
      const el = quMsg.fileElem;
      const suffix = el.fileName.slice(el.fileName.lastIndexOf(".") + 1);
      return (
        <div className="file_container">
          <img src={switchFileIcon(suffix)} alt="" />
          <div className="file_info">
            <Typography.Text ellipsis={{ tooltip: el.fileName }}>{el.fileName}</Typography.Text>
            <div>{bytesToSize(el.fileSize)}</div>
          </div>
        </div>
      );
    case MessageType.CARDMESSAGE:
      const cardContent = JSON.parse(quMsg.content);
      return (
        <div
          className="qute_card"
          onClick={(e) => {
            e.stopPropagation();
            window.userClick(cardContent.userID);
          }}
        >{`${parseMessageType(quMsg)} ${cardContent.nickname}`}</div>
      );
    case MessageType.LOCATIONMESSAGE:
      try {
        const locationData = JSON.parse(quMsg.locationElem.description);
        const postion = { longitude: quMsg.locationElem.longitude, latitude: quMsg.locationElem.latitude };
        return (
          <div className="qute_location" onClick={() => showInModal(postion)}>
            <Image preview={false} style={{ maxWidth: "60px" }} src={locationData.url} />
            <div>
              <Typography.Text ellipsis={{ tooltip: locationData.name }}>{`[${locationData.name}]`}</Typography.Text>
            </div>
          </div>
        );
      } catch (error) {
        return parseMessageType(quMsg);
      }
    default:
      return parseMessageType(quMsg);
  }
};

const switchNotification = (notification: NotificationElem, timestamp: number) => {
  let noti = {} as any;
  try {
    noti = JSON.parse(notification.detail);
  } catch (error) {
    noti = {
      text: "数据格式错误",
    };
  }

  const mediaList = [];
  if ((noti.mixType === 1 || noti === 4) && noti.pictureElem) {
    mediaList.push({ src: noti.pictureElem.snapshotPicture.url ?? noti.pictureElem.sourcePicture.url, type: "image" });
  } else if ((noti.mixType === 2 || noti === 4) && noti.videoElem) {
    mediaList.push({ src: noti.videoElem.snapshotUrl, type: "video" });
  }

  const openUrl = () => {
    if (!noti.url) return;
    if (window.electron) {
      window.electron.openExternal(noti.url);
    } else {
      window.open(noti.url, "_blank");
    }
  };

  const playVideo = (url: string) => {};

  return (
    <div className={`chat_bg_msg_content_noti nick_magin`}>
      <div style={{ cursor: noti.url ? "pointer" : "default" }} onClick={openUrl} className="noti_container">
        <div className="noti_title">{noti.notificationName}</div>
        <div className="noti_content">
          <div>{noti.text}</div>
          {noti.mixType !== 0 && (
            <div>
              {mediaList.map((media) => (
                <Image
                  key={media.src}
                  placeholder={true}
                  // width={200}
                  // height={200}
                  style={{ maxHeight: "200px" }}
                  src={media.src}
                  preview={media.type === "image"}
                  onClick={() => (media.type === "image" ? imgClickEmit(noti.pictureElem) : playVideo(media.src))}
                  fallback={fallback}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {/* <TimeTip showDetails={true} timestamp={timestamp} /> */}
    </div>
  );
};

type SwitchMsgTypeProps = {
  msg: MessageItem;
  msgUploadProgress?: number;
  msgDownloadProgress?: number;
  audio: React.RefObject<HTMLAudioElement>;
  curCve?: ConversationItem;
  selfID: string;
  isMerge?: boolean;
};

const fallback =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3PTWBSGcbGzM6GCKqlIBRV0dHRJFarQ0eUT8LH4BnRU0NHR0UEFVdIlFRV7TzRksomPY8uykTk/zewQfKw/9znv4yvJynLv4uLiV2dBoDiBf4qP3/ARuCRABEFAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghgg0Aj8i0JO4OzsrPv69Wv+hi2qPHr0qNvf39+iI97soRIh4f3z58/u7du3SXX7Xt7Z2enevHmzfQe+oSN2apSAPj09TSrb+XKI/f379+08+A0cNRE2ANkupk+ACNPvkSPcAAEibACyXUyfABGm3yNHuAECRNgAZLuYPgEirKlHu7u7XdyytGwHAd8jjNyng4OD7vnz51dbPT8/7z58+NB9+/bt6jU/TI+AGWHEnrx48eJ/EsSmHzx40L18+fLyzxF3ZVMjEyDCiEDjMYZZS5wiPXnyZFbJaxMhQIQRGzHvWR7XCyOCXsOmiDAi1HmPMMQjDpbpEiDCiL358eNHurW/5SnWdIBbXiDCiA38/Pnzrce2YyZ4//59F3ePLNMl4PbpiL2J0L979+7yDtHDhw8vtzzvdGnEXdvUigSIsCLAWavHp/+qM0BcXMd/q25n1vF57TYBp0a3mUzilePj4+7k5KSLb6gt6ydAhPUzXnoPR0dHl79WGTNCfBnn1uvSCJdegQhLI1vvCk+fPu2ePXt2tZOYEV6/fn31dz+shwAR1sP1cqvLntbEN9MxA9xcYjsxS1jWR4AIa2Ibzx0tc44fYX/16lV6NDFLXH+YL32jwiACRBiEbf5KcXoTIsQSpzXx4N28Ja4BQoK7rgXiydbHjx/P25TaQAJEGAguWy0+2Q8PD6/Ki4R8EVl+bzBOnZY95fq9rj9zAkTI2SxdidBHqG9+skdw43borCXO/ZcJdraPWdv22uIEiLA4q7nvvCug8WTqzQveOH26fodo7g6uFe/a17W3+nFBAkRYENRdb1vkkz1CH9cPsVy/jrhr27PqMYvENYNlHAIesRiBYwRy0V+8iXP8+/fvX11Mr7L7ECueb/r48eMqm7FuI2BGWDEG8cm+7G3NEOfmdcTQw4h9/55lhm7DekRYKQPZF2ArbXTAyu4kDYB2YxUzwg0gi/41ztHnfQG26HbGel/crVrm7tNY+/1btkOEAZ2M05r4FB7r9GbAIdxaZYrHdOsgJ/wCEQY0J74TmOKnbxxT9n3FgGGWWsVdowHtjt9Nnvf7yQM2aZU/TIAIAxrw6dOnAWtZZcoEnBpNuTuObWMEiLAx1HY0ZQJEmHJ3HNvGCBBhY6jtaMoEiJB0Z29vL6ls58vxPcO8/zfrdo5qvKO+d3Fx8Wu8zf1dW4p/cPzLly/dtv9Ts/EbcvGAHhHyfBIhZ6NSiIBTo0LNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiEC/wGgKKC4YMA4TAAAAABJRU5ErkJggg==";

const SwitchMsgType: FC<SwitchMsgTypeProps> = (props) => {
  const { msg, audio, selfID, msgUploadProgress, msgDownloadProgress, isMerge = false } = props;
  const blackList = useSelector((state: RootState) => state.contacts.blackList, shallowEqual);
  const selfName = useSelector((state: RootState) => state.user.selfInfo.nickname, shallowEqual);
  const noticeCodeWidthTitle = useNoticeCodeWidthTitle();
  const playerRef = useRef<any>(null);
  const { t } = useTranslation();
  const needMargin = true;

  const isSelf = (sendID: string): boolean => {
    return selfID === sendID;
  };

  const merClick = (el: MergeElem, sender: string) => {
    events.emit(MER_MSG_MODAL, el, sender);
  };

  const playVoice = (url: string) => {
    audio.current!.src = url;
    audio.current?.play();
  };

  const handlePlayerReady = (player: any) => {
    playerRef.current = player;

    // you can handle player events here
    player.on("waiting", () => {
      console.log("player is waiting");
    });

    player.on("dispose", () => {
      console.log("player will dispose");
    });
  };
  const switchCustomMsg = (cMsg: any) => {
    const isSelfMsg = isSelf(msg.sendID);
    const isBlackUser = blackList.find((black) => black.userID === (isSelfMsg ? msg.recvID : msg.sendID));
    const getCallConfig = (mediaType: MediaType) => ({
      inviterUserID: selfID,
      inviteeUserIDList: [isSelfMsg ? msg.recvID : msg.sendID],
      groupID: "",
      roomID: uuid("rtc"),
      timeout: 30,
      mediaType,
      sessionType: SessionType.Single,
      platformID: window.electron ? window.electron.platform : 5,
    });
    if (cMsg.type) {
      return (
        <CustomCallMsgRender
          getCallConfig={msg.sessionType === SessionType.Single && !isMerge && !isBlackUser ? getCallConfig : null}
          needMargin={needMargin}
          isSelfMsg={isSelfMsg}
          cdata={cMsg}
          timestamp={msg.sendTime}
        />
      );
    }

    switch (cMsg.customType) {
      case customType.MassMsg:
        return cMsg.data.url ? (
          <VoiceMsgRender isSelfMsg={isSelfMsg} needMargin={needMargin} el={msg.soundElem} timestamp={msg.sendTime} playVoice={playVoice} />
        ) : (
          <TextMsgRender mstr={cMsg.data.text} timestamp={msg.sendTime} needMargin={needMargin} />
        );
      case customType.TextMsg:
        return null;
      case customType.emoji:
        return <img style={{ width: "160px", marginTop: "24px", marginLeft: "-32px" }} src={cMsg?.data} alt="emoji" />;
      case customType.Call:
        console.log("call", cMsg);
        return (
          <CustomCallMsgRender
            getCallConfig={msg.sessionType === SessionType.Single && !isMerge && !isBlackUser ? getCallConfig : null}
            needMargin={needMargin}
            isSelfMsg={isSelfMsg}
            cdata={cMsg.data}
            timestamp={msg.sendTime}
          />
        );
      case customType.MeetingInvitation:
        const meetingInfo = cMsg.data;
        const joinMeeting = () => {
          im.signalingJoinMeeting({
            meetingID: meetingInfo.id,
            meetingName: meetingInfo.subject,
            participantNickname: selfName,
          })
            .then(({ data }) => events.emit(JOIN_MEETING, JSON.parse(data)))
            .catch((err) => {
              const isend = err.errMsg.includes("roomIsNotExist");
              message.warning(isend ? "会议已结束！" : "加入会议失败！");
              console.log(err);
            });
        };
        return (
          <div className={`chat_bg_msg_content_text chat_bg_msg_content_meeting nick_magin`} onClick={joinMeeting}>
            <div>
              <div>{`${meetingInfo.inviterNickname}邀请你加入视频会议`}</div>
              <ul>
                <li>{`会议主题：${meetingInfo.subject}`}</li>
                <li>{`开始时间：${moment(meetingInfo.start * 1000).format("M月DD日 HH:mm")}`}</li>
                {/* @ts-ignore */}
                <li>{`会议时长：${secondsToTime[meetingInfo.duration]}`}</li>
                <li>{`会议号：${meetingInfo.id}`}</li>
              </ul>
              <div className="notice">点击此消息可直接加入会议</div>
            </div>
            <TimeTip timestamp={msg.sendTime} />
          </div>
        );
      default:
        return null;
    }
  };

  const MsgType = useMemo(() => {
    if (msg.contentType === MessageType.NOTIFICATION) {
      return switchNotification(msg.notificationElem, msg.sendTime);
    }
    const isSelfMsg = isSelf(msg.sendID);
    const progress = msgUploadProgress;
    const downloadProgress = msgDownloadProgress;
    const status = msg.status;
    const timestamp = msg.sendTime;
    switch (msg.contentType) {
      case MessageType.TEXTMESSAGE:
        // 系统消息处理自定义
        let noticeDetail;
        try {
          noticeDetail = JSON.parse(msg.content);
        } catch {}
        const isNotice = noticeDetail?.contentType && noticeCodeWidthTitle[noticeDetail.contentType];
        if (isNotice) {
          return <NoticeRender noticeDetail={noticeDetail} timestamp={timestamp} />;
        }
        // 原有逻辑
        let mstr = msg.content ?? "";
        mstr = parseEmojiFace(mstr);
        mstr = parseUrl(mstr);
        mstr = parseBr(mstr);
        return <TextMsgRender mstr={mstr} timestamp={timestamp} needMargin={needMargin} />;
      case MessageType.ATTEXTMESSAGE:
        let atMsg = parseAt(msg.atElem);
        atMsg = parseEmojiFace(atMsg);
        atMsg = parseUrl(atMsg);
        atMsg = parseBr(atMsg);
        return <TextAtMsgRender atMsg={atMsg} timestamp={timestamp} needMargin={needMargin} />;
      case MessageType.PICTUREMESSAGE:
        return (
          <PictureMsgRender
            needMargin={needMargin}
            el={msg.pictureElem}
            status={status}
            progress={progress ?? 0}
            downloadProgress={downloadProgress}
            timestamp={timestamp}
            imgClick={imgClickEmit}
          />
        );
      case MessageType.FACEMESSAGE:
        const faceData = JSON.parse(msg.faceElem.data);
        return <FaceMsgRender url={faceData.url} timestamp={timestamp} needMargin={needMargin} />;
      case MessageType.VOICEMESSAGE:
        return <VoiceMsgRender isSelfMsg={isSelfMsg} needMargin={needMargin} el={msg.soundElem} timestamp={timestamp} playVoice={playVoice} />;
      case MessageType.FILEMESSAGE:
        const fileEl = msg.fileElem;
        return (
          <FileMsgRender
            isSelfMsg={isSelfMsg}
            el={fileEl}
            msgID={msg.clientMsgID}
            progress={progress ?? 0}
            downloadProgress={downloadProgress}
            status={status}
            timestamp={timestamp}
            needMargin={needMargin}
          />
        );
      case MessageType.VIDEOMESSAGE:
        return (
          <VideoMsgRender
            needMargin={needMargin}
            el={msg.videoElem}
            status={status}
            progress={progress ?? 0}
            downloadProgress={downloadProgress}
            timestamp={timestamp}
            handlePlayerReady={handlePlayerReady}
          />
        );
      case MessageType.QUOTEMESSAGE:
        const quMsg = parseQute(msg.quoteElem.quoteMessage, isSelfMsg, playVoice);
        let replyMsg = msg.quoteElem.text;
        replyMsg = parseBr(parseUrl(parseEmojiFace(replyMsg)));
        return (
          <QuteMsgRender
            needMargin={needMargin}
            timestamp={timestamp}
            replyID={msg.quoteElem.quoteMessage.clientMsgID}
            replyName={msg.quoteElem.quoteMessage.senderNickname}
            replyMsg={replyMsg}
            quMsg={quMsg}
          />
        );
      case MessageType.MERGERMESSAGE:
        const merEl = msg.mergeElem;
        return <MergeMsgRender needMargin={needMargin} timestamp={timestamp} sender={msg.sendID} merEl={merEl} merClick={merClick} />;
      case MessageType.CARDMESSAGE:
        const ctx = JSON.parse(msg.content);
        return <CardMsgRender needMargin={needMargin} timestamp={timestamp} cardContent={ctx} />;
      case MessageType.LOCATIONMESSAGE:
        const locationEl = msg.locationElem;
        const postion = { longitude: locationEl.longitude, latitude: locationEl.latitude };
        return <MapMsgRender needMargin={needMargin} timestamp={timestamp} position={postion} />;
      case MessageType.CUSTOMMESSAGE:
        const customEl = msg.customElem;
        try {
          let customData = JSON.parse(customEl.data);
          if (customData.customType === customType.TextMsg) {
            if (typeof customData?.data === "string") customData.data = JSON.parse(customData.data);
            return (
              <div className="forward-view">
                <span className="forward-view-form">{customData?.data?.senderNickname ? t("ForwardedMessageFrom", { user: customData.data.senderNickname }) : ""}</span>
                <SwitchMsgType {...props} msg={customData.data} />
              </div>
            );
          }
          return switchCustomMsg(customData);
        } catch (error) {
          return <TextMsgRender mstr={"请前往移动端查看"} timestamp={timestamp} needMargin={needMargin} />;
        }
      case MessageType.GROUPINFOUPDATED:
        const noticeEl = JSON.parse(msg.notificationElem.detail);
        const notice = noticeEl.group.notification;
        return <GroupNoticeRender notice={notice} timestamp={timestamp} needMargin={needMargin} />;
      case MessageType.EDITMESSAGE:
        try {
          const cItem = JSON.parse(JSON.parse(msg.content).data);
          events.emit(MSG_UPDATE_CONTENT, cItem.clientMsgID, cItem.newContent, msg.createTime);
          events.emit(DELETE_MESSAGE, msg.clientMsgID, false, false);
          return null;
        } catch (error) {
          return <TextMsgRender mstr={"[请前往移动端查看]"} timestamp={timestamp} needMargin={needMargin} />;
        }
      default:
        return <div className={`chat_bg_msg_content_text nick_magin`}>{t("UnsupportedMessage")}</div>;
    }
  }, [msg.status, msg.progress, msg.content, msg.downloadProgress, msg.pictureElem?.sourcePicture?.url, needMargin, blackList]);

  return MsgType;
};

export default memo(SwitchMsgType);

// const TimeTip = memo(({ timestamp, className = "chat_bg_msg_content_time", showDetails = false }: { timestamp: number; className?: string; showDetails?: boolean }) => (
//   <Tooltip overlayClassName="msg_time_tip" placement="bottom" title={parseTime(timestamp,true)}>
//     <div className={className}>{parseTime(timestamp, showDetails)}</div>
//   </Tooltip>
// ));

export const TimeTip = (props: any) => null;

const TextMsgRender = memo(({ mstr, timestamp, needMargin }: { mstr: string; timestamp: number; needMargin: boolean }) => {
  return (
    <>
      <div className={`chat_bg_msg_content_text nick_magin`}>
        <div className="text_container" dangerouslySetInnerHTML={{ __html: mstr }}></div>
      </div>
      <TimeTip timestamp={timestamp} />
    </>
  );
});

const TextAtMsgRender = memo(({ atMsg, timestamp, needMargin }: { atMsg: string; timestamp: number; needMargin: boolean }) => {
  return (
    <div
      style={{
        paddingRight: "40px",
      }}
      className={`chat_bg_msg_content_text nick_magin`}
    >
      <div className="text_container" style={{ display: "inline-block" }} dangerouslySetInnerHTML={{ __html: atMsg }}></div>
      <TimeTip timestamp={timestamp} />
    </div>
  );
});

const FaceMsgRender = memo(({ url, timestamp, needMargin }: { url: string; timestamp: number; needMargin: boolean }) => {
  return (
    <div className={`chat_bg_msg_content_face nick_magin`}>
      <Image placeholder={true} style={{ maxHeight: 200 }} src={url} preview={false} />
      <TimeTip className="face_msg_time" timestamp={timestamp} />
    </div>
  );
});

const VoiceMsgRender = memo(
  ({ isSelfMsg, needMargin, el, timestamp, playVoice }: { isSelfMsg: boolean; needMargin: boolean; el: SoundElem; timestamp: number; playVoice: (url: string) => void }) => (
    <div
      style={{
        paddingRight: "40px",
      }}
      className={`chat_bg_msg_content_text chat_bg_msg_content_voice nick_magin`}
    >
      <div className="voice_container" style={{ flexDirection: isSelfMsg ? "row-reverse" : "row" }} onClick={() => playVoice(el.sourceUrl)}>
        <img style={isSelfMsg ? { paddingLeft: "4px" } : { paddingRight: "4px" }} src={isSelfMsg ? my_voice : other_voice} alt="" />
        {`${el.duration} ''`}
      </div>
      <TimeTip timestamp={timestamp} />
    </div>
  )
);

const PictureMsgRender = memo(
  ({
    needMargin,
    el,
    status,
    progress,
    downloadProgress,
    timestamp,
    imgClick,
  }: {
    needMargin: boolean;
    el: PictureElem;
    status: MessageStatus;
    progress: number | undefined;
    downloadProgress: number | undefined;
    timestamp: number;
    imgClick: (el: PictureElem) => void;
  }) => {
    return (
      <div className={`chat_bg_msg_content_pic nick_magin`}>
        <Spin spinning={status === MessageStatus.Sending || (downloadProgress !== undefined && downloadProgress !== 100)} indicator={antIcon} tip={progress + "%"}>
          <Image
            // placeholder={true}
            // width={200}
            // height={200}
            style={{ maxHeight: "200px" }}
            src={el.snapshotPicture.url ?? el.sourcePicture.url ?? fallback}
            preview={{ visible: false }}
            onClick={() => imgClick(el)}
            fallback={status === MessageStatus.Succeed ? undefined : fallback}
          />
        </Spin>

        <TimeTip timestamp={timestamp} className="pic_msg_time" />
      </div>
    );
  }
);

const VideoMsgRender = memo(
  ({
    needMargin,
    el,
    status,
    progress,
    downloadProgress,
    timestamp,
    handlePlayerReady,
  }: {
    needMargin: boolean;
    el: VideoElem;
    status: MessageStatus;
    progress: number | undefined;
    downloadProgress: number | undefined;
    timestamp: number;
    handlePlayerReady: (el: any) => void;
  }) => {
    const playVideo = () => {
      events.emit(SHOW_PLAYER_MODAL, el.videoUrl);
    };
    return (
      <div className={`chat_bg_msg_content_video nick_magin`}>
        <Spin
          spinning={status === MessageStatus.Sending || (downloadProgress !== undefined && downloadProgress !== 100)}
          indicator={antIcon}
          tip={(status === MessageStatus.Sending ? progress : downloadProgress) + "%"}
        >
          <Image
            // placeholder={true}
            // width={200}
            // height={200}
            style={{ maxHeight: "200px" }}
            src={el.snapshotUrl ?? fallback}
            preview={false}
            fallback={fallback}
          />
        </Spin>
        <TimeTip timestamp={timestamp} className="pic_msg_time" />
        <PlayCircleOutlined onClick={playVideo} />
      </div>
    );
  }
);

const QuteMsgRender = memo(
  ({
    needMargin,
    timestamp,
    replyName,
    replyMsg,
    quMsg,
    replyID,
  }: {
    needMargin: boolean;
    timestamp: number;
    replyName: string;
    replyMsg: string;
    quMsg: string | JSX.Element;
    replyID: string;
  }) => {
    const jump2Message = () => {
      const el = document.getElementById(`chat_${replyID}`);
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
        });
      }
    };

    return (
      <div
        style={{
          paddingRight: "40px",
        }}
        className={`chat_bg_msg_content_text chat_bg_msg_content_qute nick_magin`}
      >
        <div onClick={jump2Message} className="qute_content">
          <div>{`${t("Reply") + replyName}:`}</div>
          {quMsg}
        </div>
        <div dangerouslySetInnerHTML={{ __html: replyMsg }}></div>
        <TimeTip timestamp={timestamp} />
      </div>
    );
  }
);

const MergeMsgRender = memo(
  ({
    needMargin,
    timestamp,
    sender,
    merEl,
    merClick,
  }: {
    needMargin: boolean;
    timestamp: number;
    sender: string;
    merEl: MergeElem;
    merClick: (el: MergeElem, sender: string) => void;
  }) => {
    return (
      <div
        style={{
          paddingRight: "40px",
        }}
        onClick={() => merClick(merEl, sender)}
        className={`chat_bg_msg_content_text chat_bg_msg_content_mer nick_magin`}
      >
        <div className="title">{merEl.title}</div>
        <div className="content">
          {merEl.abstractList?.map((m, idx) => (
            <Typography.Text ellipsis={{ tooltip: m }} key={idx} className="item">
              {m}
            </Typography.Text>
          ))}
        </div>
        <TimeTip timestamp={timestamp} />
      </div>
    );
  }
);

const CardMsgRender = memo(({ needMargin, timestamp, cardContent }: { needMargin: boolean; timestamp: number; cardContent: any }) => {
  return (
    <div
      onClick={() => window.userClick(cardContent.userID)}
      style={{
        paddingRight: "40px",
      }}
      className={`chat_bg_msg_content_text chat_bg_msg_content_card nick_magin`}
    >
      <div className="desc">
        <MyAvatar src={cardContent.faceURL} size={32} />
        <Typography.Text ellipsis={{ tooltip: cardContent.nickname }} className="card_nick">
          {cardContent.nickname}
        </Typography.Text>
      </div>
      <div className="title">{t("IDCard")}</div>
      {/* <TimeTip timestamp={timestamp} /> */}
    </div>
  );
});

const MapMsgRender = memo(({ needMargin, timestamp, position }: { needMargin: boolean; timestamp: number; position: LngLat }) => {
  return (
    <div onClick={() => showInModal(position)} className={`chat_bg_msg_content_map nick_magin`}>
      <Map protocol="https" center={position} amapkey="dcdc861728801ee3410f67f6a487d3fa">
        <Marker position={position} />
      </Map>
      <TimeTip timestamp={timestamp} className="pic_msg_time" />
    </div>
  );
});

const antIcon = <LoadingOutlined style={{ fontSize: 18 }} spin />;

const FileMsgRender = memo(
  ({
    needMargin,
    isSelfMsg,
    el,
    msgID,
    status,
    progress,
    downloadProgress,
    timestamp,
  }: {
    needMargin: boolean;
    isSelfMsg: boolean;
    el: FileElem;
    msgID: string;
    status: MessageStatus;
    progress: number | undefined;
    downloadProgress: number | undefined;
    timestamp: number;
  }) => {
    const suffix = el.fileName.slice(el.fileName.lastIndexOf(".") + 1);

    const doubleClick = () => {
      const result = isFileDownloaded(msgID);
      const isSelfPath = isSelfMsg && window.electron.fileExists(el.filePath);
      const isDownLoadPath = result && window.electron.fileExists(result);
      if (isSelfPath || isDownLoadPath) {
        window.electron.openFile(isSelfPath ? el.filePath : result);
      } else {
        message.info("请先下载后阅览！");
      }
    };

    return (
      <div onDoubleClick={doubleClick} className={`chat_bg_msg_content_text chat_bg_msg_content_file nick_magin`}>
        <div className="file_container">
          <Spin spinning={status === MessageStatus.Sending} indicator={antIcon} tip={progress + "%"}>
            <img src={switchFileIcon(suffix)} alt="" />
          </Spin>

          <div className="file_info">
            <Typography.Text ellipsis={{ tooltip: el.fileName }}>{el.fileName}</Typography.Text>
            <div>{bytesToSize(el.fileSize)}</div>
          </div>
          {downloadProgress && downloadProgress !== 100 ? <Progress type="circle" percent={downloadProgress} width={32} /> : null}
        </div>
        <TimeTip timestamp={timestamp} />
      </div>
    );
  }
);

const CustomCallMsgRender = memo(
  ({
    needMargin,
    isSelfMsg,
    cdata,
    timestamp,
    getCallConfig,
  }: {
    needMargin: boolean;
    isSelfMsg: boolean;
    cdata: any;
    timestamp: number;
    getCallConfig: ((mediaType: MediaType) => any) | null;
  }) => {
    const callIcon = cdata.type === customType.VideoCall ? (isSelfMsg ? my_video_call : other_video_call) : voice_call;
    const imgStyle = isSelfMsg ? { paddingLeft: "4px" } : { paddingRight: "4px" };

    const switchCallStatus = (status: string) => {
      switch (status) {
        case "hangup":
        case "beHangup":
          return t("phoneStatus.hangup");
        case "cancel":
          return t("phoneStatus.cancel");
        case "beCanceled":
          return isSelfMsg ? t("phoneStatus.beRejected") : t("phoneStatus.cancel");
        case "rejected":
          return t("phoneStatus.rejected");
        case "beRejected":
          return isSelfMsg ? t("phoneStatus.beRejected") : t("phoneStatus.rejected");
        case "timeout":
          return t("phoneStatus.timeout");
      }
    };
    console.log("cdata", cdata);
    const callStr = switchCallStatus(cdata.status ?? cdata.state) + `${cdata.duration > 0 ? ` ${sec2Format(cdata.duration)}` : ""}`;

    const reCall = () => {
      if (getCallConfig) {
        events.emit(SIGNAL_INGINVITE, getCallConfig(cdata.type === customType.VideoCall ? "video" : "audio"));
      }
    };

    return (
      <div
        style={{
          paddingRight: "40px",
        }}
        className={`chat_bg_msg_content_text chat_bg_msg_content_call nick_magin`}
      >
        <div className="call_content" style={{ flexDirection: isSelfMsg ? "row-reverse" : "row" }} onClick={reCall}>
          <img style={imgStyle} src={callIcon} alt="" />
          {callStr}
        </div>
        <TimeTip timestamp={timestamp} />
      </div>
    );
  }
);

const GroupNoticeRender = memo(({ notice, timestamp, needMargin }: { notice: string; timestamp: number; needMargin: boolean }) => {
  const textRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div
        ref={textRef}
        // style={{
        //   paddingBottom: "16px",
        //   paddingRight: "8px",
        // }}
        className={`chat_bg_msg_content_text nick_magin`}
      >
        <div className="group_notice">
          <img src={group_notify} alt="" />
          <span>群公告</span>
        </div>
        <div className="text_container" dangerouslySetInnerHTML={{ __html: notice }}></div>
      </div>
      {/* <TimeTip timestamp={timestamp} /> */}
    </>
  );
});
