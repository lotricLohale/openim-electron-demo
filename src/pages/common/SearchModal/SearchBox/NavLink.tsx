import { RightOutlined } from "@ant-design/icons";

type NavLinkProps = {
  title: string;
  hasMore: boolean;
  callback: () => void;
};

const NavLink = ({ title, hasMore, callback }: NavLinkProps) => {
  return (
    <div className="flex flex-row items-center justify-between px-3.5 pb-1">
      <span className="font-semibold">{title}</span>
      {hasMore && (
        <span className="cursor-pointer text-xs text-blue-400" onClick={callback}>
          查看更多
          <RightOutlined className="text-xs" rev={undefined} />
        </span>
      )}
    </div>
  );
};

export default NavLink;
