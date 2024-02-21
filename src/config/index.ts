export const REGISTER_URL = "https://web.rentsoft.cn/chat"
export const WS_URL = "wss://web.rentsoft.cn/msg_gateway"
export const API_URL = "https://web.rentsoft.cn/api"
export const CONFIG_URL = "https://web.rentsoft.cn/complete_admin"

// 高德地图 appKey  需自行申请
export const AMapKey = ''

export const AXIOSTIMEOUT = 60000

export const OBJECTSTORAGE: "cos" | "minio" = "minio"
export const PICMESSAGETHUMOPTION = "?imageView2/1/w/200/h/200/rq/80"
export const LANGUAGE = "zh-cn"

export const getIMWsUrl = () => localStorage.getItem("IMWsUrl")?localStorage.getItem("IMWsUrl")!:WS_URL
export const getIMRegisterUrl = () => localStorage.getItem("IMRegisterUrl")?localStorage.getItem("IMRegisterUrl")!:REGISTER_URL
export const getIMApiUrl = () => localStorage.getItem("IMApiUrl")?localStorage.getItem("IMApiUrl")!:API_URL
export const getIMConfigUrl = () => localStorage.getItem("IMConfigUrl")?localStorage.getItem("IMConfigUrl")!:CONFIG_URL
export const getLanguage = () => localStorage.getItem("IMLanguage")?localStorage.getItem("IMLanguage")!:LANGUAGE