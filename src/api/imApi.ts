import { v4 as uuidv4 } from "uuid";

import { API_URL } from "@/config";
import createAxiosInstance from "@/utils/request";

const request = createAxiosInstance(API_URL);

export enum minioUploadType {
  file = "1",
  video = "2",
  picture = "3",
}

interface UploadRes {
  URL: string;
  newName: string;
  snapshotName?: string;
  snapshotURL?: string;
}
export const minioUpload = (file: File, fileType: minioUploadType, snapShot: File) => {
  const data = new FormData();
  data.append("file", file);
  data.append("fileType", fileType);
  snapShot && data.append("snapShot", snapShot);

  return request<UploadRes>({
    url: "/third/minio_upload",
    method: "POST",
    data,
    headers: {
      "Content-Type": "multipart/form-data",
      operationID: uuidv4(),
    },
  });
};
