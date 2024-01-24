import { v4 as uuidv4 } from "uuid";

import { USER_URL } from "@/config";
import createAxiosInstance from "@/utils/request";

import { BusinessUserInfo } from "./login";

const request = createAxiosInstance(USER_URL, false);

export interface MemberInDepartment {
  userID: string;
  departmentID: string;
  position: string;
  station: string;
  order: number;
  entryTime: number;
  terminationTime: number;
  createTime: number;
  department: Department;
}

export interface Department {
  departmentID: string;
  faceURL: string;
  name: string;
  parentDepartmentID: string;
  order: number;
  createTime: number;
  memberNum: number;
}

export const getUserJoinedDep = (userIDs: string[]) => {
  return request.post<{
    members: Array<{ user: BusinessUserInfo; members: MemberInDepartment[] }>;
  }>(
    "/organization/user/department",
    {
      userIDs,
    },
    {
      headers: {
        operationID: uuidv4(),
      },
    },
  );
};

export const getDepartmentInfo = (departmentIDs: string[]) => {
  return request.post<{
    departments: Department[];
  }>(
    "/organization/department/find",
    { departmentIDs },
    {
      headers: {
        operationID: uuidv4(),
      },
    },
  );
};

export type SubDepartmentAndMemberResult = {
  departments?: Department[];
  parents?: Department[];
  current: Department;
  members?: BusinessUserInfoWithDepartment[];
};
export type BusinessUserInfoWithDepartment = {
  member: MemberInDepartment;
  user: BusinessUserInfo;
};

export const getSubDepartmentAndMember = (departmentID: string) => {
  return request.post<SubDepartmentAndMemberResult>(
    "/organization/department/child",
    { departmentID },
    {
      headers: {
        operationID: uuidv4(),
      },
    },
  );
};

export interface OrganizationInfo {
  logoURL: string;
  name: string;
  homepage: string;
  introduction: string;
  createTime: number;
}
export const getOrgnizationInfo = () => {
  return request.post<OrganizationInfo>(
    "/organization/info",
    {},
    {
      headers: {
        operationID: uuidv4(),
      },
    },
  );
};
