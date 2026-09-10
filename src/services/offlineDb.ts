export type OfflineStore = 'scans' | 'alerts' | 'locations' | 'babies' | 'parents' | 'hospitals' | 'syncQueue';

export interface OfflineScan {
  id: string;
  babyId: string;
  imageData: string;
  imagePath: string;
  location: {
    lat: number;
    lng: number;
    accuracy: number;
    address: string;
  } | null;
  riskLevel: 'High' | 'Medium' | 'Low';
  confidenceScore: number;
  scanDate: string;
  isSynced: boolean;
  syncAttempts: number;
  lastSyncAttempt: string | null;
  parentId: string;
}

export interface OfflineAlert {
  id: string;
  scanId: string;
  parentId: string;
  location: OfflineScan['location'];
  riskLevel: string;
  hospitalId: string | null;
  createdAt: string;
  sentAt: string | null;
  isSent: boolean;
  retryCount: number;
  lastRetry: string | null;
}

export interface SyncQueueItem {
  id: string;
  type: 'scan' | 'alert' | 'location';
  recordId: string;
  attempts: number;
  nextAttemptAt: string;
  createdAt: string;
}

const DB_NAME = 'jaundicecare-offline';
const DB_VERSION = 1;
const STORES: OfflineStore[] = ['scans', 'alerts', 'locations', 'babies', 'parents', 'hospitals', 'syncQueue'];

let dbPromise: Promise<IDBDatabase> | null = null;

export function openOfflineDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Offline storage is not available in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      STORES.forEach((store) => {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' });
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Offline storage could not be opened.'));
  });
  return dbPromise;
}

export async function putStoreItem<T extends { id: string }>(store: OfflineStore, value: T): Promise<void> {
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(store, 'readwrite').objectStore(store).put(value);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Offline record could not be saved.'));
  });
}

export async function getStoreItem<T>(store: OfflineStore, id: string): Promise<T | null> {
  const db = await openOfflineDb();
  return new Promise<T | null>((resolve, reject) => {
    const request = db.transaction(store, 'readonly').objectStore(store).get(id);
    request.onsuccess = () => resolve((request.result as T | undefined) || null);
    request.onerror = () => reject(request.error || new Error('Offline record could not be read.'));
  });
}

export async function getStoreItems<T>(store: OfflineStore): Promise<T[]> {
  const db = await openOfflineDb();
  return new Promise<T[]>((resolve, reject) => {
    const request = db.transaction(store, 'readonly').objectStore(store).getAll();
    request.onsuccess = () => resolve((request.result as T[]) || []);
    request.onerror = () => reject(request.error || new Error('Offline records could not be read.'));
  });
}

export async function deleteStoreItem(store: OfflineStore, id: string): Promise<void> {
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(store, 'readwrite').objectStore(store).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Offline record could not be deleted.'));
  });
}
