
import { ContentGroup } from '../types';

const DB_NAME = 'tacbook_db';
const DB_VERSION = 1;
const STORE_NAME = 'groups';
const KEY = 'all_groups';

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
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

export const saveGroupsToDB = async (groups: ContentGroup[]): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            // We use a fixed key to store the entire array for compatibility with current architecture.
            // Storing objects in IDB avoids JSON.stringify cost.
            const request = store.put(groups, KEY);

            request.onsuccess = () => resolve();
            request.onerror = () => {
                const error = request.error;
                window.dispatchEvent(new CustomEvent('tacbook_db_error', { detail: { message: error?.message || '未知 IndexedDB 错误' } }));
                reject(error);
            };
        });
    } catch (e: any) {
        console.error("IndexedDB Save Error:", e);
        window.dispatchEvent(new CustomEvent('tacbook_db_error', { detail: { message: e?.message || '未知的存储引擎错误' } }));
    }
};

export const loadGroupsFromDB = async (): Promise<ContentGroup[] | null> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(KEY);

            request.onsuccess = () => {
                resolve(request.result as ContentGroup[] || null);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("IndexedDB Load Error:", e);
        return null;
    }
};
