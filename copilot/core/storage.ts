import { get, set } from 'idb-keyval';
import { CopilotThread, CopilotMessage, DataSnapshot } from './types';

const THREADS_KEY = 'tacbook_copilot_threads';
const SNAPSHOTS_KEY = 'tacbook_copilot_snapshots';

// --- Mutex / Lock for DB ---
let dbLock = Promise.resolve();

const withDbLock = <T>(task: () => Promise<T>): Promise<T> => {
    const result = dbLock.then(task);
    dbLock = result.catch(() => {}) as unknown as Promise<void>;
    return result;
};

// --- Threads Management ---

export const getThreads = async (): Promise<CopilotThread[]> => {
    try {
        const data = await get(THREADS_KEY);
        if (!data) return [];
        return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
        console.error("Failed to parse copilot threads", e);
        return [];
    }
};

export const saveThreads = (threads: CopilotThread[]) => {
    return withDbLock(async () => {
        await set(THREADS_KEY, threads);
    });
};

export const getThread = async (id: string): Promise<CopilotThread | undefined> => {
    const threads = await getThreads();
    return threads.find(t => t.id === id);
};

export const createThread = (): Promise<CopilotThread> => {
    return withDbLock(async () => {
        const newThread: CopilotThread = {
            id: `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: '新对话',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: [],
            memory: {}
        };
        const threads = await getThreads();
        await set(THREADS_KEY, [newThread, ...threads]);
        return newThread;
    });
};

export const updateThread = (id: string, updates: Partial<CopilotThread>) => {
    return withDbLock(async () => {
        const threads = await getThreads();
        const index = threads.findIndex(t => t.id === id);
        if (index !== -1) {
            threads[index] = { ...threads[index], ...updates, updatedAt: Date.now() };
            await set(THREADS_KEY, threads);
        }
    });
};

export const deleteThread = (id: string) => {
    return withDbLock(async () => {
        const threads = await getThreads();
        await set(THREADS_KEY, threads.filter(t => t.id !== id));
    });
};

export const addMessageToThread = (threadId: string, message: CopilotMessage) => {
    return withDbLock(async () => {
        const threads = await getThreads();
        const index = threads.findIndex(t => t.id === threadId);
        if (index !== -1) {
            const thread = threads[index];
            let title = thread.title;
            if (title === '新对话' && message.role === 'user' && message.text) {
                title = message.text.slice(0, 20) + (message.text.length > 20 ? '...' : '');
            }
            threads[index] = {
                ...thread,
                title,
                messages: [...thread.messages, message],
                updatedAt: Date.now()
            };
            await set(THREADS_KEY, threads);
        }
    });
};

export const upsertMessageInThread = (threadId: string, message: CopilotMessage) => {
    return withDbLock(async () => {
        const threads = await getThreads();
        const index = threads.findIndex(t => t.id === threadId);
        if (index !== -1) {
            const thread = threads[index];
            const msgIndex = thread.messages.findIndex(m => m.id === message.id);
            let newMessages = [...thread.messages];
            if (msgIndex !== -1) {
                newMessages[msgIndex] = { ...newMessages[msgIndex], ...message };
            } else {
                newMessages.push(message);
            }
            threads[index] = { ...thread, messages: newMessages, updatedAt: Date.now() };
            await set(THREADS_KEY, threads);
        }
    });
};

// --- Snapshots Management ---

export const getSnapshots = async (): Promise<DataSnapshot[]> => {
    try {
        const data = await get(SNAPSHOTS_KEY);
        if (!data) return [];
        return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
        console.error("Failed to parse snapshots", e);
        return [];
    }
};

export const saveSnapshot = async (snapshot: DataSnapshot) => {
    const snapshots = await getSnapshots();
    await set(SNAPSHOTS_KEY, [snapshot, ...snapshots]);
};

export const getSnapshot = async (id: string): Promise<DataSnapshot | undefined> => {
    const snapshots = await getSnapshots();
    return snapshots.find(s => s.id === id);
};
