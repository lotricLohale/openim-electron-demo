import empty from "@/assets/images/searchModal/empty.png";

const Empty = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <img src={empty} alt="empty" />
      <div className="text-[var(--sub-text)]">没有更多搜索结果</div>
    </div>
  );
};

export default Empty;
