import { message } from "antd";
import axios, { AxiosError } from "axios";
import { AXIOSTIMEOUT, getIMRegisterUrl } from "../config";

const request = axios.create({
  withCredentials: true,
  timeout: AXIOSTIMEOUT,
  baseURL: getIMRegisterUrl(),
});

request.interceptors.request.use(
  (config) => {
    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

request.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res.errCode === 0 || res.code === 200) {
      return res;
    } else {
      message.error(res.errMsg || "操作失败，请稍后再试！");
      // return Promise.reject(new Error(res.errMsg || '操作失败，请稍后再试！'))
      return Promise.reject(res);
    }
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

export type requestParams = {
  url: string;
  data?: any;
  header?: Headers;
  [name: string]: any;
};

export const myPost = async (url: string, params?: any) => {
  try {
    const res = await request.post(url, params ? JSON.stringify(params) : undefined);
    return res;
  } catch (error) {
    return null as any;
  }
};

export default request;
