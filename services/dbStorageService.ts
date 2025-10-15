
const DB_NAME = 'HPVAnalysisDB';
const STORE_NAME = 'sqliteStore';
const DB_KEY = 'databaseFile';

function getDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject("Error opening IndexedDB");
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export const saveDb = async (dbBlob: Uint8Array): Promise<void> => {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(dbBlob, DB_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(`Error saving database to IndexedDB: ${(event.target as IDBRequest).error}`);
  });
};

export const loadDb = async (): Promise<Uint8Array | null> => {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(DB_KEY);
    request.onsuccess = () => {
      resolve(request.result ? request.result as Uint8Array : null);
    };
    request.onerror = (event) => reject(`Error loading database from IndexedDB: ${(event.target as IDBRequest).error}`);
  });
};

export const deleteDb = async (): Promise<void> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(DB_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(`Error deleting database from IndexedDB: ${(event.target as IDBRequest).error}`);
    });
};
