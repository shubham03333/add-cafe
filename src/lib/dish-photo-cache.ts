const DB_NAME = 'adda-dish-photos';
const STORE = 'photos';
const URL_MAP_KEY = 'adda-dish-photo-urls';

type PhotoRecord = { id: number; url: string; blob: Blob };

let dbPromise: Promise<IDBDatabase> | null = null;
const objectUrls = new Map<number, { url: string; src: string }>();

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('no idb'));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

function readRecord(id: number): Promise<PhotoRecord | undefined> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
        request.onsuccess = () => resolve(request.result as PhotoRecord | undefined);
        request.onerror = () => reject(request.error);
      })
  );
}

function writeRecord(record: PhotoRecord): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
  );
}

export function readStoredPhotoUrls(): Record<number, string> {
  try {
    const raw = localStorage.getItem(URL_MAP_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const next: Record<number, string> = {};
    for (const [key, value] of Object.entries(parsed || {})) {
      const id = Number(key);
      if (Number.isInteger(id) && typeof value === 'string') next[id] = value;
    }
    return next;
  } catch {
    return {};
  }
}

export function storePhotoUrls(photos: Record<string, string>) {
  try {
    localStorage.setItem(URL_MAP_KEY, JSON.stringify(photos));
  } catch {
    // quota
  }
}

function objectUrlFor(id: number, src: string, blob: Blob) {
  const existing = objectUrls.get(id);
  if (existing?.src === src) return existing.url;
  if (existing) URL.revokeObjectURL(existing.url);
  const url = URL.createObjectURL(blob);
  objectUrls.set(id, { url, src });
  return url;
}

export async function loadDishPhoto(id: number, src: string): Promise<string | null> {
  if (!src) return null;
  try {
    const cached = await readRecord(id);
    if (cached?.url === src && cached.blob) {
      return objectUrlFor(id, src, cached.blob);
    }
    const response = await fetch(src, { mode: 'cors', cache: 'force-cache' });
    if (!response.ok) return src;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return src;
    await writeRecord({ id, url: src, blob });
    return objectUrlFor(id, src, blob);
  } catch {
    return src;
  }
}
