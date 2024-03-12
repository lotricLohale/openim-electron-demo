// const url = "172.16.0.188";
// export const REGISTER_URL = `http://${url}:10008`;
// export const WS_URL = `ws://${url}:10001`;
// export const API_URL = `http://${url}:10002`;
// export const CONFIG_URL = `http://${url}:10009`;

const url = "im.chatlightly.com";
export const REGISTER_URL = `https://${url}/chat`;
export const WS_URL = `wss://${url}/msg_gateway`;
export const API_URL = `https://${url}/api`;
export const CONFIG_URL = `https://${url}/complete_admin`;

// 高德地图 appKey  需自行申请
export const AMapKey = "";

export const AXIOSTIMEOUT = 60000;

export const OBJECTSTORAGE: "cos" | "minio" = "minio";
export const PICMESSAGETHUMOPTION = "?imageView2/1/w/200/h/200/rq/80";
export const LANGUAGE = "zh-cn";

export const getIMWsUrl = () => (localStorage.getItem("IMWsUrl") ? localStorage.getItem("IMWsUrl")! : WS_URL);
export const getIMRegisterUrl = () => (localStorage.getItem("IMRegisterUrl") ? localStorage.getItem("IMRegisterUrl")! : REGISTER_URL);
export const getIMApiUrl = () => (localStorage.getItem("IMApiUrl") ? localStorage.getItem("IMApiUrl")! : API_URL);
export const getIMConfigUrl = () => (localStorage.getItem("IMConfigUrl") ? localStorage.getItem("IMConfigUrl")! : CONFIG_URL);
export const getLanguage = () => (localStorage.getItem("IMLanguage") ? localStorage.getItem("IMLanguage")! : LANGUAGE);
