
const DB_NAME = 'LicenseKeyStoreDB';
const STORE_NAME = 'usedKeysStore';
const DB_VERSION = 1;

function getStoreDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject("Error opening License Key Store DB");
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

export const addUsedKey = async (key: string): Promise<void> => {
  const db = await getStoreDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ key: key.toUpperCase() });
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(`Error saving used key: ${(event.target as IDBRequest).error}`);
  });
};

export const isKeyUsed = async (key: string): Promise<boolean> => {
  const db = await getStoreDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key.toUpperCase());
    request.onsuccess = () => {
      resolve(!!request.result);
    };
    request.onerror = (event) => reject(`Error checking used key: ${(event.target as IDBRequest).error}`);
  });
};
