import { RcFile } from "antd/lib/upload";
import { CheckUpdateType, OnLineResType, RegistersType } from "../@types/open_im";
import { getIMConfigUrl, getIMApiUrl } from "../config";
import { request } from "../utils";
import { uuid } from "../utils/open_im_sdk";
import { UploadRequestOption } from "rc-upload/lib/interface";
import store from "../store";

export const getAuthToken = (uid?: string, secret?: string) =>
  request.post(
    "/auth/user_token",
    JSON.stringify({
      secret: secret ?? "tuoyun",
      platform: 8,
      userID: uid ?? "openIM123456",
      OperationID: uuid(uid ?? "uuid"),
    }),
    {
      baseURL: getIMApiUrl(),
    }
  );

export const getOnline = (userIDList: string[], opid?: string): Promise<OnLineResType> => {
  return request.post(
    "/user/get_users_online_status",
    JSON.stringify({
      operationID: opid ?? uuid("uuid"),
      userIDList,
    }),
    {
      baseURL: getIMApiUrl(),
      headers: {
        token: window.electron?.getStoreKey("IMProfile") ?? localStorage.getItem(`improfile-${store.getState().user.selfInfo.userID}`),
      },
    }
  );
};

export const getRegisters = (opid?: string): Promise<RegistersType> => {
  return request.post(
    "/manager/get_all_users_uid",
    JSON.stringify({
      operationID: opid ?? uuid("uuid"),
    }),
    {
      baseURL: getIMApiUrl(),
      headers: {
        token: localStorage.getItem("IMAdminToken"),
      },
    }
  );
};

export const getUpdateStatus = (version: string, opid?: string): Promise<CheckUpdateType> => {
  return request.post(
    "/third/get_download_url",
    JSON.stringify({
      operationID: opid ?? uuid("uuid"),
      type: window.electron.platform,
      version,
    }),
    {
      baseURL: getIMApiUrl(),
      headers: {
        token: localStorage.getItem("IMAdminToken"),
        "Content-Type": "application/json",
      },
    }
  );
};

export enum minioUploadType {
  file = "1",
  video = "2",
  picture = "3",
}

export const minioUpload = (
  uploadData: UploadRequestOption,
  fileType: minioUploadType,
  snapShot?: RcFile,
  onProgress?: (progress: number) => void,
  opid?: string
): Promise<{ data: { URL: string; newName: string } }> => {
  const data = new FormData();
  data.append("file", uploadData.file);
  data.append("fileType", fileType);
  data.append("operationID", opid ?? uuid("uuid"));
  snapShot && data.append("snapShot", snapShot);
  return request.post("/third/minio_upload", data, {
    baseURL: getIMApiUrl(),
    headers: {
      "Content-Type": "multipart/form-data; boundary=<calculated when request is sent>",
      token: window.electron?.getStoreKey("IMProfile") ?? localStorage.getItem(`improfile-${store.getState().user.selfInfo.userID}`),
    },
    onUploadProgress: function (progressEvent) {
      let complete = ((progressEvent.loaded / progressEvent.total) * 100) | 0;
      onProgress && onProgress(complete);
    },
  });
};

export const getAppConfig = () =>
  request.post(
    "/admin/init/get_client_config",
    JSON.stringify({
      OperationID: uuid("uuid"),
    }),
    {
      baseURL: getIMConfigUrl(),
    }
  );
