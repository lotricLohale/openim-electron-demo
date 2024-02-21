import { API, APIKey, RTCAPI, RTCAPIKey } from "./api";

declare global {
	interface Window {
	  require: (module: 'electron') => {
		ipcRenderer: IpcRenderer
	  };
		userClick: (id: string,groupID?: string,allowFriend?: AllowType) => void;
		urlClick: (id: string) => void;
	}
	interface Window extends Record<APIKey,API>{}
	interface Window extends Record<RTCAPIKey,RTCAPI>{}
	class Go {
		exited: boolean;
		importObject: WebAssembly.Imports;
		run: (instance: WebAssembly.Instance) => Promise<void>;
	  }
}
