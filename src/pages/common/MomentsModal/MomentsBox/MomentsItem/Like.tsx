import liked from "@/assets/images/moments/liked.png";
import { Users } from "@/types/moment";

type LikeProps = {
  likeUsers: Users[];
};

const Like = ({ likeUsers }: LikeProps) => {
  if (likeUsers.length <= 0) {
    return null;
  }

  return (
    <p className="mb-2 mt-1 flex items-center text-xs text-blue-400">
      <img src={liked} width={12} className="mr-1.5" alt="" />
      {likeUsers.slice(0, 5).map((item, i) => (
        <span key={item.userID}>
          {i === 0 ? "" : "、"}
          {item.nickname}
        </span>
      ))}
      {likeUsers.length > 5 ? `等${likeUsers.length}人点赞` : ""}
    </p>
  );
};

export default Like;
