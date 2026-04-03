import { safeStorage } from '../../../utils/storage';
import { CopilotThread, CopilotMessage, DataSnapshot } from './types';

const THREADS_KEY = 'tacbook_copilot_threads';
const SNAPSHOTS_KEY = 'tacbook_copilot_snapshots';

// --- Threads Management ---

export const getThreads = (): CopilotThread[] => {
    const data = safeStorage.getItem(THREADS_KEY);
    if (!data) return [];
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error("Failed to parse copilot threads", e);
        return [];
    }
};

export const saveThreads = (threads: CopilotThread[]) => {
    safeStorage.setItem(THREADS_KEY, JSON.stringify(threads));
};

export const getThread = (id: string): CopilotThread | undefined => {
    return getThreads().find(t => t.id === id);
};

export const createThread = (): CopilotThread => {
    const newThread: CopilotThread = {
        id: `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: '新对话',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        memory: {}
    };
    const threads = getThreads();
    saveThreads([newThread, ...threads]);
    return newThread;
};

export const updateThread = (id: string, updates: Partial<CopilotThread>) => {
    const threads = getThreads();
    const index = threads.findIndex(t => t.id === id);
    if (index !== -1) {
        threads[index] = { ...threads[index], ...updates, updatedAt: Date.now() };
        saveThreads(threads);
    }
};

export const deleteThread = (id: string) => {
    const threads = getThreads();
    saveThreads(threads.filter(t => t.id !== id));
};

export const addMessageToThread = (threadId: string, message: CopilotMessage) => {
    const thread = getThread(threadId);
    if (thread) {
        // Auto-generate title from first user message if it's still "新对话"
        let title = thread.title;
        if (title === '新对话' && message.role === 'user' && message.text) {
            title = message.text.slice(0, 20) + (message.text.length > 20 ? '...' : '');
        }
        
        updateThread(threadId, {
            title,
            messages: [...thread.messages, message]
        });
    }
};

export const updateMessageInThread = (threadId: string, messageId: string, updates: Partial<CopilotMessage>) => {
    const thread = getThread(threadId);
    if (thread) {
        const messages = thread.messages.map(m => 
            m.id === messageId ? { ...m, ...updates } : m
        );
        updateThread(threadId, { messages });
    }
};

// --- Snapshots Management ---

export const getSnapshots = (): DataSnapshot[] => {
    const data = safeStorage.getItem(SNAPSHOTS_KEY);
    if (!data) return [];
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error("Failed to parse snapshots", e);
        return [];
    }
};

export const saveSnapshot = (snapshot: DataSnapshot) => {
    const snapshots = getSnapshots();
    safeStorage.setItem(SNAPSHOTS_KEY, JSON.stringify([snapshot, ...snapshots]));
};

export const getSnapshot = (id: string): DataSnapshot | undefined => {
    return getSnapshots().find(s => s.id === id);
};
