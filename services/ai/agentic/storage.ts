import { get, set } from 'idb-keyval';
import { CopilotThread, CopilotMessage, DataSnapshot } from './types';

const THREADS_KEY = 'tacbook_copilot_threads';
const SNAPSHOTS_KEY = 'tacbook_copilot_snapshots';

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

export const saveThreads = async (threads: CopilotThread[]) => {
    await set(THREADS_KEY, threads);
};

export const getThread = async (id: string): Promise<CopilotThread | undefined> => {
    const threads = await getThreads();
    return threads.find(t => t.id === id);
};

export const createThread = async (): Promise<CopilotThread> => {
    const newThread: CopilotThread = {
        id: `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: '新对话',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        memory: {}
    };
    const threads = await getThreads();
    await saveThreads([newThread, ...threads]);
    return newThread;
};

export const updateThread = async (id: string, updates: Partial<CopilotThread>) => {
    const threads = await getThreads();
    const index = threads.findIndex(t => t.id === id);
    if (index !== -1) {
        threads[index] = { ...threads[index], ...updates, updatedAt: Date.now() };
        await saveThreads(threads);
    }
};

export const deleteThread = async (id: string) => {
    const threads = await getThreads();
    await saveThreads(threads.filter(t => t.id !== id));
};

export const addMessageToThread = async (threadId: string, message: CopilotMessage) => {
    const thread = await getThread(threadId);
    if (thread) {
        // Auto-generate title from first user message if it's still "新对话"
        let title = thread.title;
        if (title === '新对话' && message.role === 'user' && message.text) {
            title = message.text.slice(0, 20) + (message.text.length > 20 ? '...' : '');
        }
        
        await updateThread(threadId, {
            title,
            messages: [...thread.messages, message]
        });
    }
};

export const updateMessageInThread = async (threadId: string, messageId: string, updates: Partial<CopilotMessage>) => {
    const thread = await getThread(threadId);
    if (thread) {
        const messages = thread.messages.map(m => 
            m.id === messageId ? { ...m, ...updates } : m
        );
        await updateThread(threadId, { messages });
    }
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
