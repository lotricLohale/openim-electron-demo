import { FC } from "react";

import { formatBr } from "@/utils/common";
import { formatEmoji } from "@/utils/emojis";
import { formatAtText, formatLink } from "@/utils/imCommon";
import { MessageType } from "@/utils/open-im-sdk-wasm/types/enum";

import { IMessageItemProps } from ".";
import styles from "./message-item.module.scss";

const MassMessageRenderer: FC<IMessageItemProps> = ({ message }) => {
  const content = JSON.parse(message.customElem?.data).data;
  return <div className={styles.bubble}>{content.textElem.content}</div>;
};

export default MassMessageRenderer;
