import { addDataInLocalStorage, getAllDataInLocalStorage, getDataInLocalStorage } from "./localStorage";

let db: IDBDatabase | undefined;
const DB_NAME = "OpenIM_Store";

const storeList = [
  {
    name: "CommonContacts",
    keyPath: "sourceID",
    index: [
      // {
      //     indexName: "",
      //     unique: false,
      // }
    ],
  },
  {
    name: "AccessApplication",
    keyPath: "sourceID",
    index: [],
  },
];

export const initialIndexDB = (version = 1, uid = "") => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(uid + DB_NAME, version);
    req.onsuccess = (ev: any) => {
      db = ev.target.result;
      resolve(ev.target.result);
    };
    req.onerror = (ev: any) => {
      reject(ev.target.error);
    };
    req.onupgradeneeded = (ev: any) => {
      const reqDb = ev.target.result;
      storeList.forEach((store) => {
        if (!reqDb?.objectStoreNames.contains(store.name)) {
          reqDb?.createObjectStore(store.name, { keyPath: store.keyPath });
        }
      });
    };
  });
};

export const addData = (store: string, data: any) => {
  if (window.electron) {
    return addDataInLocalStorage(store, data);
  }
  return new Promise(async (resolve, reject) => {
    await checkDb(reject);
    const req = db?.transaction([store], "readwrite").objectStore(store).add(data);
    req!.onsuccess = (ev) => {
      resolve("");
    };
    req!.onerror = (ev: any) => {
      reject(ev.target.error);
    };
  });
};

export const updateData = (store: string, data: any) => {
  return new Promise(async (resolve, reject) => {
    await checkDb(reject);
    const req = db?.transaction([store], "readwrite").objectStore(store).put(data);
    req!.onsuccess = (ev) => {
      resolve("");
    };
    req!.onerror = (ev: any) => {
      reject(ev.target.error);
    };
  });
};

export const getData = (store: string, keyPath: any) => {
  if (window.electron) {
    return getDataInLocalStorage(store, keyPath);
  }
  return new Promise(async (resolve, reject) => {
    await checkDb(reject);
    const req = db?.transaction([store], "readwrite").objectStore(store).get(keyPath);
    req!.onsuccess = (ev: any) => {
      resolve(ev.target.result);
    };
    req!.onerror = (ev: any) => {
      reject(ev.target.error);
    };
  });
};

export const getAllData = (store: string) => {
  if (window.electron) {
    return getAllDataInLocalStorage(store);
  }
  return new Promise(async (resolve, reject) => {
    await checkDb(reject);
    const req = db?.transaction([store]).objectStore(store).getAll();
    req!.onsuccess = (ev: any) => {
      resolve(ev.target.result);
    };
    req!.onerror = (ev: any) => {
      reject(ev.target.error);
    };
  });
};

export const deleteData = (store: string, keyPath: any) => {
  return new Promise(async (resolve, reject) => {
    await checkDb(reject);
    const req = db?.transaction([store], "readwrite").objectStore(store).delete(keyPath);
    req!.onsuccess = (ev: any) => {
      resolve(ev.target.result);
    };
    req!.onerror = (ev: any) => {
      reject(ev.target.error);
    };
  });
};

export const deleteStore = async (store: string) => {
  await checkDb();
  db?.deleteObjectStore(store);
};

export const checkDb = async (reject?: (reason?: any) => void) => {
  if (!db) {
    try {
      await initialIndexDB();
    } catch (error) {
      if (reject) {
        reject(error);
      }
      return error;
    }
  }
};
