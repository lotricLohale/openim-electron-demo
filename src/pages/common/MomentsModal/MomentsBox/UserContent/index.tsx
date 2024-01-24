import dayjs from "dayjs";
import { FC } from "react";

import { WorkMoments } from "@/types/moment";

type UserContent = {
  userItems: WorkMoments[];
  setWorkMomentID: (workMomentsID: string) => void;
};

const index: FC<UserContent> = ({ userItems, setWorkMomentID }) => {
  const groupsMap = new Map<string, WorkMoments[]>();
  const currentDate = dayjs().format("YYYY-MM-DD");

  userItems.forEach((obj) => {
    const objDate = dayjs.unix(obj.createTime / 1000);

    if (objDate.format("YYYY-MM-DD") === currentDate) {
      const todayKey = "今日";
      if (!groupsMap.has(todayKey)) {
        groupsMap.set(todayKey, []);
      }
      groupsMap.get(todayKey)?.push(obj);
    } else if (objDate.add(1, "day").format("YYYY-MM-DD") === currentDate) {
      const yesterdayKey = "昨日";
      if (!groupsMap.has(yesterdayKey)) {
        groupsMap.set(yesterdayKey, []);
      }
      groupsMap.get(yesterdayKey)?.push(obj);
    } else {
      const otherKey = objDate.format("MM-DD");
      if (!groupsMap.has(otherKey)) {
        groupsMap.set(otherKey, []);
      }
      groupsMap.get(otherKey)?.push(obj);
    }
  });

  // 将map转换为数组
  const groups = Array.from(groupsMap, ([date, objects]) => ({ date, objects }));

  return (
    <>
      {(groups || []).map((group, groupIndex) => (
        <div key={groupIndex}>
          {(group.objects || []).map((item, i) => {
            return (
              <div
                className="flex cursor-pointer flex-row py-3"
                key={item.workMomentID}
                onClick={() => setWorkMomentID(item.workMomentID)}
              >
                <div className="w-16 text-center text-base font-semibold">
                  {i === 0 ? group.date : ""}
                </div>
                {Boolean(item.content.metas?.length) && (
                  <img
                    src={item.content.metas?.[0].thumb}
                    alt=""
                    style={{ width: "80px", height: "80px" }}
                    className="mx-1"
                  />
                )}
                {Boolean(item.content.metas?.length) && (
                  <div className="ml-2 flex flex-col items-start justify-between">
                    <p className="line-clamp-2 max-w-[340px] overflow-ellipsis">
                      {item.content.text}
                    </p>
                    <div className="mt-2 text-xs" style={{ color: "#8E9AB0" }}>
                      {item.content.metas?.length
                        ? `共${item.content.metas?.length}张`
                        : ""}
                    </div>
                  </div>
                )}
                {!item.content.metas?.length && (
                  <div
                    className="ml-2 flex flex-1 flex-col items-start justify-between rounded-sm p-2"
                    style={{ background: "#F6F6F7" }}
                  >
                    <p className="line-clamp-2 max-w-[340px] overflow-ellipsis">
                      {item.content.text}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {userItems.length <= 0 && (
        <div className="flex h-80 w-full items-center justify-center text-base">
          暂无动态
        </div>
      )}
    </>
  );
};

export default index;
