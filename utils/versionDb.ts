import { Tactic, Utility, Match } from '../types';

const DB_NAME = 'tacbook_versions_db';
const DB_VERSION = 1;
const STORE_NAME = 'versions';

export interface VersionRecord {
    id: string; // The ID of the item (tactic.id)
    timestamp: number;
    author: string;
    description?: string;
    data: any; // The whole snapshot
}

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: ['id', 'timestamp'] });
                store.createIndex('id', 'id', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            reject((event.target as IDBOpenDBRequest).error);
        };
    });
};

export const saveVersion = async (item: any, author: string = 'User', description: string = 'Save'): Promise<void> => {
    if (!item || !item.id) return;
    try {
        const db = await openDB();
        const record: VersionRecord = {
            id: item.id,
            timestamp: Date.now(),
            author,
            description,
            data: JSON.parse(JSON.stringify(item)) // Deep copy
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(record);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("IndexedDB Version Save Error:", e);
    }
};

export const getVersions = async (id: string): Promise<VersionRecord[]> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('id');
            const request = index.getAll(id);

            request.onsuccess = () => {
                const results = (request.result || []).sort((a, b) => b.timestamp - a.timestamp);
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("IndexedDB Version Load Error:", e);
        return [];
    }
};
