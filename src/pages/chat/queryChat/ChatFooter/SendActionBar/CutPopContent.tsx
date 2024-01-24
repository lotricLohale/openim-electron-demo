import { memo } from "react";

const CutPopConent = ({ cutWithoutWindow }: { cutWithoutWindow?: () => void }) => {
  return (
    <div className="p-1">
      <div
        className="cursor-pointer rounded px-2 py-1 text-xs hover:bg-[var(--primary-active)]"
        onClick={cutWithoutWindow}
      >
        {"隐藏当前窗口截图"}
      </div>
    </div>
  );
};

export default memo(CutPopConent);
