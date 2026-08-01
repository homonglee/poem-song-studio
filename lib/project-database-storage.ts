const DATABASE_NAME = "poem-song-studio";
const STORE_NAME = "sqlite";
const DATABASE_KEY = "project-database";

function openStorage(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProjectDatabase(bytes: Uint8Array): Promise<void> {
  const database = await openStorage();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(bytes, DATABASE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  database.close();
}

export async function loadProjectDatabase(): Promise<Uint8Array | null> {
  const database = await openStorage();
  const result = await new Promise<Uint8Array | ArrayBuffer | undefined>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(DATABASE_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  database.close();
  if (!result) return null;
  return result instanceof Uint8Array ? result : new Uint8Array(result);
}
