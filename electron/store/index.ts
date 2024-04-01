const Store = require("electron-store");

const store = new Store();


export const setAppStatus = (status: boolean) => store.set("AppStatus", status);
export const setAppCloseAction = (close: boolean) => store.set("AppCloseAction", close);

export const setStoreKey = (key: string, value: string) => {
  store.set(key, value);
};

export const getAppStatus = () => store.get("AppStatus") ?? true;
export const getAppCloseAction = () => store.get("AppCloseAction") ?? false;

export const getStoreKey = (key: string) => store.get(key);


export const removeStoreKey = (key: string) => store.delete(key);