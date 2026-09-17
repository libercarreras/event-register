// Envoltorio mínimo de IndexedDB (sin dependencias externas).

export const DB_NAME = "foga-eventos";
export const DB_VERSION = 1;
export const STORES = ["products", "sessions", "orders", "order_items", "settings"] as const;
export type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB no disponible en este entorno"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("products")) db.createObjectStore("products", { keyPath: "id" });
        if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions", { keyPath: "id" });
        if (!db.objectStoreNames.contains("orders")) {
          const s = db.createObjectStore("orders", { keyPath: "id" });
          s.createIndex("bySession", "sessionId");
        }
        if (!db.objectStoreNames.contains("order_items")) {
          const s = db.createObjectStore("order_items", { keyPath: "id" });
          s.createIndex("byOrder", "orderId");
        }
        if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function tx<T>(
  stores: StoreName[],
  mode: IDBTransactionMode,
  run: (t: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  const db = await openDb();
  const transaction = db.transaction(stores, mode);
  const done = new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error("Transacción abortada"));
  });
  const result = await run(transaction);
  await done;
  return result;
}

export function getAll<T>(t: IDBTransaction, store: StoreName): Promise<T[]> {
  return wrap(t.objectStore(store).getAll() as IDBRequest<T[]>);
}

export function getAllByIndex<T>(
  t: IDBTransaction,
  store: StoreName,
  index: string,
  key: IDBValidKey,
): Promise<T[]> {
  return wrap(t.objectStore(store).index(index).getAll(key) as IDBRequest<T[]>);
}

export function get<T>(t: IDBTransaction, store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return wrap(t.objectStore(store).get(key) as IDBRequest<T | undefined>);
}

export function put(t: IDBTransaction, store: StoreName, value: unknown): Promise<IDBValidKey> {
  return wrap(t.objectStore(store).put(value) as IDBRequest<IDBValidKey>);
}

export function clear(t: IDBTransaction, store: StoreName): Promise<undefined> {
  return wrap(t.objectStore(store).clear() as IDBRequest<undefined>);
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
