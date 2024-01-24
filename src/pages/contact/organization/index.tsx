import { useLatest } from "ahooks";
import { Breadcrumb, Divider, Spin } from "antd";
import { ItemType } from "antd/es/breadcrumb/Breadcrumb";
import { useEffect, useState } from "react";
import {
  LoaderFunctionArgs,
  useLoaderData,
  useNavigate,
  useNavigation,
  useParams,
} from "react-router-dom";
import { Virtuoso } from "react-virtuoso";

import {
  BusinessUserInfoWithDepartment,
  Department,
  getSubDepartmentAndMember,
  SubDepartmentAndMemberResult,
} from "@/api/organization";
import arrow_right from "@/assets/images/contact/arrow_right.png";
import OIMAvatar from "@/components/OIMAvatar";
import { useUserStore } from "@/store";

type LoaderResult = { data: SubDepartmentAndMemberResult };

export const Organization = () => {
  const { id } = useParams();
  const organizationInfo = useUserStore((state) => state.organizationInfo);
  const { data } = useLoaderData() as LoaderResult;
  const navigation = useNavigation();
  const dataLoading = navigation.state === "loading";

  const [breadcrumbItems, setBreadcrumbItems] = useState<ItemType[]>([]);
  const latestBreadcrumbItems = useLatest(breadcrumbItems);

  const navigate = useNavigate();

  useEffect(() => {
    const breadcrumbs: ItemType[] = [...(data.parents ?? []), data.current].map(
      (dep, idx) => ({
        title: dep.name,
        href: "",
        key: dep.departmentID || "0",
        onClick: (e) => breadcrumbClick(e, dep.departmentID, idx),
      }),
    );
    setBreadcrumbItems([...breadcrumbs]);
  }, [data.current.departmentID]);

  const breadcrumbClick = (
    e: React.MouseEvent<HTMLAnchorElement | HTMLSpanElement, MouseEvent>,
    departmentID: string,
    idx: number,
  ) => {
    e.preventDefault();
    if (idx === latestBreadcrumbItems.current.length - 1) return;
    toSubDepartment(departmentID || "0");
    setBreadcrumbItems((prev) => prev.slice(0, idx + 1));
  };

  const toSubDepartment = (id: string) => {
    navigate(`/contact/organization/${id}`);
  };

  const renderList = [...(data.members ?? []), ...(data.departments ?? [])] as Partial<
    BusinessUserInfoWithDepartment & Department
  >[];

  return (
    <div className="mx-2 my-4 flex w-full flex-col">
      <div className="mx-3 mb-6 flex items-center">
        <OIMAvatar src={organizationInfo.logoURL} isdepartment />
        <div className="ml-3 truncate">{organizationInfo.name}</div>
      </div>
      <Breadcrumb className="mx-3 mb-2 text-xs" separator=">" items={breadcrumbItems} />
      <Spin wrapperClassName="flex-1 overflow-hidden" spinning={dataLoading}>
        <Virtuoso
          className="h-full overflow-x-hidden"
          data={renderList}
          computeItemKey={(_, item) => item.departmentID || item.user?.userID || ""}
          itemContent={(idx, item) => {
            if (item.user) {
              const needGap =
                idx === (data.members?.length ?? 0) - 1 &&
                Boolean(data.departments?.length);
              return (
                <MemberItem
                  needGap={needGap}
                  item={item as BusinessUserInfoWithDepartment}
                />
              );
            }
            return (
              <DepartmentItem
                department={item as Department}
                toSubDepartment={toSubDepartment}
              />
            );
          }}
        />
      </Spin>
    </div>
  );
};

const DepartmentItem = ({
  department,
  toSubDepartment,
}: {
  department: Department;
  toSubDepartment: (depID: string) => void;
}) => {
  return (
    <div
      className="flex items-center rounded-md px-3 py-2 hover:bg-[var(--primary-active)]"
      onClick={() => toSubDepartment(department.departmentID)}
    >
      <div className="flex flex-1 items-center">
        <OIMAvatar src={department.faceURL} isdepartment />
        <div className="ml-3 flex items-center">
          <div className="mr-2 truncate">{department.name}</div>
          <div>{`(${department.memberNum})`}</div>
        </div>
      </div>
      <img width={20} src={arrow_right} alt="" />
    </div>
  );
};

const MemberItem = ({
  item,
  needGap,
}: {
  item: BusinessUserInfoWithDepartment;
  needGap: boolean;
}) => {
  return (
    <>
      <div
        className="flex items-center rounded-md px-3 py-2 hover:bg-[var(--primary-active)]"
        onClick={() => window.userClick(item.user.userID)}
      >
        <div className="flex flex-1 items-center">
          <OIMAvatar src={item.user.faceURL} text={item.user.nickname} />
          <div className="ml-3 truncate">{item.user.nickname}</div>
          {Boolean(item.member.position) && (
            <span className="ml-2 rounded border border-[#0289FA] px-1 text-xs text-[#0289FA]">
              {item.member.position}
            </span>
          )}
        </div>
        <img width={20} src={arrow_right} alt="" />
      </div>
      {needGap && <Divider className="border-1 m-2 border-[var(--gap-text)]" />}
    </>
  );
};

export async function loader({ params: { id } }: LoaderFunctionArgs) {
  let data = {
    departments: [],
    members: [],
    parents: [],
    current: {},
  };
  if (id) {
    if (id === "0") id = "";

    try {
      // @ts-ignore
      data = (await getSubDepartmentAndMember(id)).data;
    } catch (error) {
      console.error("getSubDepartmentAndMember error");
      console.log(error);
    }
  }
  return { data };
}
