import { Divider } from "antd";
import clsx from "clsx";
import { memo, useState } from "react";

import emoji_pop from "@/assets/images/chatFooter/emoji_pop.png";
import emoji_pop_active from "@/assets/images/chatFooter/emoji_pop_active.png";
import favorite from "@/assets/images/chatFooter/favorite.png";
import favorite_active from "@/assets/images/chatFooter/favorite_active.png";
import favorite_add from "@/assets/images/chatFooter/favorite_add.png";
import { insertAtCursor } from "@/components/EditableDiv";
import emojis from "@/utils/emojis";

type EmojiItem = (typeof emojis)[0];

const EmojiTabPane = ({
  handleEmojiClick,
}: {
  handleEmojiClick: (emoji: EmojiItem) => void;
}) => (
  <>
    {emojis.map((emoji) => (
      <div
        className="flex h-[46px] w-[46px] cursor-pointer items-center justify-center"
        key={emoji.context}
        onClick={() => handleEmojiClick(emoji)}
      >
        <img src={emoji.src} alt={emoji.context} />
      </div>
    ))}
  </>
);

const FavoriteTabPane = () => {
  return (
    <>
      <img className="cursor-pointer" width={46} src={favorite_add} alt="" />
      {Array.from({ length: 17 }, (_, i) => i).map((item, idx) => (
        <div
          className="h-[46px] w-[46px] rounded-md bg-[var(--chat-bubble)]"
          key={idx}
        ></div>
      ))}
    </>
  );
};

const EmojiPopContent = ({ updateHtml }: { updateHtml?: () => void }) => {
  const [showFavorite, setShowFavorite] = useState(false);

  const handleEmojiClick = (emoji: EmojiItem) => {
    const image = new Image();
    image.setAttribute("class", "emoji-inline");
    image.setAttribute("alt", emoji.context);
    image.src = emoji.src;
    insertAtCursor([image]);
    updateHtml?.();
  };

  return (
    <div className="flex h-64 w-[370px] flex-col">
      <div className="my-5 grid flex-1 grid-cols-6 gap-3 overflow-auto px-5">
        {showFavorite ? (
          <FavoriteTabPane />
        ) : (
          <EmojiTabPane handleEmojiClick={handleEmojiClick} />
        )}
      </div>
      <Divider className="border-1 m-0 border-[var(--gap-text)]" />
      <div className="flex px-4 py-2">
        <div
          className={clsx(
            "flex cursor-pointer items-center justify-center rounded-md px-3 py-1",
            { "bg-[rgba(19,31,65,0.05)]": !showFavorite },
          )}
          onClick={() => setShowFavorite(false)}
        >
          <img width={20} src={showFavorite ? emoji_pop : emoji_pop_active} alt="" />
        </div>
        {/* <div
          className={clsx(
            "flex cursor-pointer items-center justify-center rounded-md px-3 py-1",
            { "bg-[rgba(19,31,65,0.05)]": showFavorite },
          )}
          onClick={() => setShowFavorite(true)}
        >
          <img width={20} src={showFavorite ? favorite_active : favorite} alt="" />
        </div> */}
      </div>
    </div>
  );
};

export default memo(EmojiPopContent);
