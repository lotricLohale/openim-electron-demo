const DB_NAME = "OpenIM_Store";

export const addDataInLocalStorage = (store: string, data: any) => {
  return new Promise(async (resolve, reject) => {
    const key = store;
    const oldData = localStorage.getItem(key);
    const newData = [...(oldData ? JSON.parse(oldData) : []), data];
    localStorage.setItem(key, JSON.stringify(newData));
    console.log(newData);

    resolve(newData);
  });
};

export const getDataInLocalStorage = (store: string, keyPath: any) => {
  return new Promise(async (resolve, reject) => {
    const key = store;
    const totalData = localStorage.getItem(key);
    const parsedDATA = totalData ? JSON.parse(totalData) : [];
    resolve(parsedDATA.find((item: any) => item.sourceID === keyPath));
  });
};

export const getAllDataInLocalStorage = (store: string) => {
  return new Promise(async (resolve, reject) => {
    const key = store;
    const totalData = localStorage.getItem(key);
    const parsedDATA = totalData ? JSON.parse(totalData) : [];
    resolve(parsedDATA);
  });
};
