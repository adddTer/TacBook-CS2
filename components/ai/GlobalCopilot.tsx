import React, { useState, useEffect, useRef } from 'react';
import { CopilotThread, CopilotMessage } from '../../services/ai/agentic/types';
import { getThreads, createThread, getThread, addMessageToThread, updateThread, deleteThread } from '../../services/ai/agentic/storage';
import { AgenticEngine } from '../../services/ai/agentic/engine';
import { getApiKey, getSelectedModel, getThinkingLevel } from '../../services/ai/config';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AiConfigModal } from '../AiConfigModal';

interface GlobalCopilotProps {
    allTactics: any[];
    allUtilities: any[];
    allMatches: any[];
    allTournaments: any[];
    allBons: any[];
    onSaveTactic?: (tactic: any) => void;
    onSaveUtility?: (utility: any) => void;
    onSaveMatch?: (match: any) => void;
    onDeleteTactic?: (tactic: any) => void;
    onDeleteUtility?: (utility: any) => void;
    onDeleteMatch?: (match: any) => void;
}

export const GlobalCopilot: React.FC<GlobalCopilotProps> = ({ 
    allTactics, allUtilities, allMatches, allTournaments, allBons,
    onSaveTactic, onSaveUtility, onSaveMatch, onDeleteTactic, onDeleteUtility, onDeleteMatch
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [threads, setThreads] = useState<CopilotThread[]>([]);
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [inputText, setInputText] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [isAdmin, setIsAdmin] = useState(true); // Permission toggle for demo
    const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
    const [showActionHistory, setShowActionHistory] = useState<Record<string, boolean>>({});
    const [showReasoningContent, setShowReasoningContent] = useState<Record<string, boolean>>({});
    const [currentModelName, setCurrentModelName] = useState<string>('');
    const [currentThinkingLevel, setCurrentThinkingLevel] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isInputExpanded, setIsInputExpanded] = useState(false);
    const [showExpandButton, setShowExpandButton] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputText(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            setShowExpandButton(textareaRef.current.scrollHeight > 160);
        }
    };

    // Reset textarea height when input is cleared
    useEffect(() => {
        if (inputText === '' && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            setShowExpandButton(false);
        }
    }, [inputText]);

    const updateConfigStates = () => {
        setCurrentModelName(getSelectedModel());
        setCurrentThinkingLevel(getThinkingLevel());
    };

    // Load threads on mount
    useEffect(() => {
        updateConfigStates();
        const initThreads = async () => {
            const loadedThreads = await getThreads();
            setThreads(loadedThreads);
            if (loadedThreads.length > 0) {
                const lastThread = loadedThreads[0];
                setCurrentThreadId(lastThread.id);
            } else {
                setCurrentThreadId(null);
            }
        };
        initThreads();
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [currentThreadId, threads, isOpen]);

    const currentThread = threads.find(t => t.id === currentThreadId);

    const handleSend = async (resumeId?: string) => {
        const apiKey = getApiKey();
        const model = getSelectedModel();
        const thinkingLevel = getThinkingLevel();
        if (!apiKey) {
            alert('请先在 API 管理器中配置 API Key');
            setShowConfig(true);
            return;
        }

        let targetThreadId = currentThreadId;

        if (!resumeId) {
            if (!inputText.trim()) return;

            if (!targetThreadId) {
                const newThread = await createThread();
                targetThreadId = newThread.id;
                setCurrentThreadId(targetThreadId);
                setThreads(await getThreads());
            }

            const userMsg: CopilotMessage = {
                id: `msg_${Date.now()}`,
                role: 'user',
                text: inputText.trim(),
                timestamp: Date.now(),
                status: 'completed'
            };

            await addMessageToThread(targetThreadId, userMsg);
            setThreads(await getThreads());
            setInputText('');
        }

        if (!targetThreadId) return;

        setIsThinking(true);

        // Get fresh thread data
        const freshThread = await getThread(targetThreadId);
        if (!freshThread) {
            setIsThinking(false);
            return;
        }

        // Initialize Engine
        const engine = new AgenticEngine(apiKey, freshThread, {
            allTactics,
            allUtilities,
            allMatches,
            allTournaments,
            allBons,
            isAdmin, // Use the current state
            onSaveTactic,
            onSaveUtility,
            onSaveMatch,
            onDeleteTactic,
            onDeleteUtility,
            onDeleteMatch
        }, model, thinkingLevel);

        // Process Loop
        try {
            abortControllerRef.current = new AbortController();
            await engine.process(
                async (msgUpdate) => {
                    const thread = await getThread(targetThreadId!);
                    if (thread) {
                        const existingMsgIndex = thread.messages.findIndex(m => m.id === msgUpdate.id);
                        let newMessages;
                        
                        if (existingMsgIndex !== -1) {
                            // Update existing message
                            newMessages = [...thread.messages];
                            newMessages[existingMsgIndex] = { 
                                ...newMessages[existingMsgIndex], 
                                ...msgUpdate,
                                timestamp: Date.now() 
                            };
                        } else {
                            // Append new message
                            const newMsg = { 
                                ...msgUpdate, 
                                id: msgUpdate.id || `msg_${Date.now()}`, 
                                timestamp: Date.now() 
                            } as CopilotMessage;
                            newMessages = [...thread.messages, newMsg];
                        }

                        await updateThread(targetThreadId!, { messages: newMessages });
                        setThreads(await getThreads());
                    }
                },
                async (threadUpdate) => {
                    await updateThread(targetThreadId!, threadUpdate);
                    setThreads(await getThreads());
                },
                resumeId,
                abortControllerRef.current.signal
            );
        } catch (e: any) {
            if (e.name === 'AbortError') {
                console.log('Copilot aborted by user');
            } else {
                console.error("Copilot Error:", e);
            }
        } finally {
            setIsThinking(false);
            abortControllerRef.current = null;
        }
    };

    const handleRetry = async (msgId: string) => {
        if (!currentThreadId) return;
        const thread = await getThread(currentThreadId);
        if (!thread) return;

        const messageIndex = thread.messages.findIndex(m => m.id === msgId);
        if (messageIndex === -1) return;

        // Only allow retry if it's the last message in the thread
        if (messageIndex !== thread.messages.length - 1) {
            console.warn("Can only retry the latest message.");
            return;
        }

        handleSend(msgId);
    };

    const handleNewChat = async () => {
        setCurrentThreadId(null);
    };

    const handleDeleteThread = async (id: string) => {
        await deleteThread(id);
        const remaining = await getThreads();
        setThreads(remaining);
        setDeletingThreadId(null);
        if (currentThreadId === id) {
            setCurrentThreadId(remaining.length > 0 ? remaining[0].id : null);
        }
    };

    const handleStartRename = (thread: CopilotThread) => {
        setEditingThreadId(thread.id);
        setEditTitle(thread.title);
    };

    const handleSaveRename = async () => {
        if (editingThreadId && editTitle.trim()) {
            await updateThread(editingThreadId, { title: editTitle.trim() });
            setThreads(await getThreads());
            setEditingThreadId(null);
        }
    };

    if (!isOpen) {
        return (
            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(true)}
                className="fixed bottom-20 right-4 md:bottom-24 md:right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center z-50 ring-4 ring-white dark:ring-neutral-900"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </motion.button>
        );
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                layout
                initial={isFullScreen ? { opacity: 0, scale: 0.98 } : { opacity: 0, y: 50, scale: 0.9, transformOrigin: 'bottom right' }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={isFullScreen ? { opacity: 0, scale: 0.98 } : { opacity: 0, y: 50, scale: 0.9, transformOrigin: 'bottom right' }}
                transition={{ type: 'spring', damping: 20, stiffness: 400 }}
                className={`fixed z-50 flex flex-col bg-white dark:bg-neutral-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-neutral-200 dark:border-neutral-800 overflow-hidden transition-[inset,border-radius] duration-300 ease-in-out
                    ${isFullScreen 
                        ? 'inset-0 md:inset-6 md:rounded-3xl' 
                        : 'bottom-20 right-4 md:bottom-24 md:right-6 w-[400px] h-[650px] rounded-2xl max-w-[calc(100vw-32px)] md:max-w-[calc(100vw-48px)] max-h-[calc(100vh-100px)] md:max-h-[calc(100vh-120px)]'
                    }
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-black text-sm tracking-tight text-neutral-900 dark:text-white uppercase">Copilot</h3>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${isThinking ? 'bg-blue-500 animate-ping' : 'bg-green-500'}`}></span>
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                                    {isThinking ? 'Thinking...' : `${currentModelName} ${currentModelName.includes('gemini-3') && currentThinkingLevel ? `· ${currentThinkingLevel}` : ''}`}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => setIsAdmin(!isAdmin)} 
                            className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all mr-2 ${
                                isAdmin 
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30' 
                                    : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'
                            }`}
                            title={isAdmin ? "管理员模式 (可编辑)" : "普通用户模式 (只读)"}
                        >
                            {isAdmin ? 'Admin' : 'User'}
                        </button>
                        <button onClick={() => setShowConfig(true)} className="p-2 text-neutral-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all" title="API 设置">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        <button onClick={handleNewChat} disabled={isThinking} className="p-2 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed" title="新对话">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                        <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all hidden md:block">
                            {isFullScreen ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                            )}
                        </button>
                        <button onClick={() => setIsOpen(false)} className="p-2 text-neutral-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden bg-neutral-50/50 dark:bg-neutral-950/50">
                    {/* Sidebar (Thread List) */}
                    {isFullScreen && (
                        <div className="w-72 border-r border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-y-auto p-3">
                            <div className="mb-4 px-2">
                                <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-2">历史对话</h4>
                            </div>
                            {threads.map(thread => (
                                <div key={thread.id} className="relative group/item">
                                    {editingThreadId === thread.id ? (
                                        <div className="px-4 py-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 mb-2 border border-blue-200 dark:border-blue-800">
                                            <input 
                                                autoFocus
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveRename();
                                                    if (e.key === 'Escape') setEditingThreadId(null);
                                                }}
                                                className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-blue-700 dark:text-blue-400 p-0"
                                            />
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button onClick={() => setEditingThreadId(null)} className="text-[10px] font-bold text-neutral-400 hover:text-neutral-600 uppercase tracking-widest">取消</button>
                                                <button onClick={handleSaveRename} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest">保存</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => {
                                                    if (!isThinking) setCurrentThreadId(thread.id);
                                                }}
                                                disabled={isThinking}
                                                className={`w-full text-left px-4 py-3 rounded-2xl text-sm mb-2 group transition-all ${
                                                    currentThreadId === thread.id 
                                                        ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20' 
                                                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                                }`}
                                            >
                                                <div className="truncate pr-8">{thread.title}</div>
                                                <div className={`text-[10px] mt-1 opacity-60 ${currentThreadId === thread.id ? 'text-white' : 'text-neutral-400'}`}>
                                                    {new Date(thread.updatedAt).toLocaleDateString()}
                                                </div>
                                            </button>
                                            <div className="absolute right-2 top-3 flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-all">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleStartRename(thread); }}
                                                    className={`p-1.5 rounded-lg transition-all ${currentThreadId === thread.id ? 'hover:bg-blue-500 text-white' : 'hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400'}`}
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setDeletingThreadId(thread.id); }}
                                                    className={`p-1.5 rounded-lg transition-all ${currentThreadId === thread.id ? 'hover:bg-red-500 text-white' : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-neutral-400 hover:text-red-500'}`}
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Chat Feed */}
                    <div className="flex-1 flex flex-col relative">
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                            {currentThread?.messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center px-8">
                                    <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center mb-6 rotate-3">
                                        <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-black text-neutral-900 dark:text-white mb-2">我是你的战术助手</h2>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                        你可以问我关于战术、道具投掷、比赛复盘的任何问题。我会通过 Agentic Workflow 为你提供最专业的建议。
                                    </p>
                                </div>
                            )}
                            
                            {currentThread?.messages.map((msg, index) => {
                                const isLastMessage = index === currentThread.messages.length - 1;
                                return (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={msg.id} 
                                    className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                                >
                                    {msg.role === 'model' && (
                                        <div className="w-full flex flex-col gap-3 mb-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                                        {msg.modelName || 'AI Model'} {msg.modelName?.includes('gemini-3') && msg.thinkingLevel ? `· ${msg.thinkingLevel}` : ''}
                                                    </span>
                                                    {(msg.runningTime !== undefined || (msg.startTime && msg.endTime)) && (
                                                        <span className="text-[10px] font-bold text-neutral-400">
                                                            (运行 {Math.round((msg.runningTime || (msg.endTime! - msg.startTime!)) / 1000)}s)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action History Summary */}
                                            {((msg.steps && msg.steps.length > 0) || (msg.toolCalls && msg.toolCalls.length > 0) || msg.reasoningContent) && (
                                                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-sm">
                                                    <button 
                                                        onClick={() => setShowActionHistory(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                                                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                                                                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-xs font-black text-neutral-900 dark:text-white tracking-widest">行动历史</p>
                                                                <p className="text-[10px] text-neutral-400 font-bold tracking-widest">
                                                                    {msg.steps ? `Copilot 执行了 ${msg.steps.length} 个步骤` : (msg.toolCalls && msg.toolCalls.length > 0 ? `Copilot 采取了 ${msg.toolCalls.length} 项关键措施` : 'Copilot 进行了深度思考')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <svg className={`w-4 h-4 text-neutral-400 transition-transform duration-300 ${showActionHistory[msg.id] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                    </button>

                                                    <AnimatePresence>
                                                        {showActionHistory[msg.id] && (
                                                            <motion.div 
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 px-4 py-3 space-y-3"
                                                            >
                                                                {msg.steps ? (
                                                                    msg.steps.map((step, stepIdx) => {
                                                                        if (step.type === 'think') {
                                                                            return (
                                                                                <div key={step.id} className="flex flex-col gap-1.5">
                                                                                    <button 
                                                                                        onClick={() => setShowReasoningContent(prev => ({ ...prev, [step.id]: !prev[step.id] }))}
                                                                                        className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left"
                                                                                    >
                                                                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                                                        <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 tracking-widest flex items-center gap-1">
                                                                                            思考 {step.duration ? Math.round(step.duration / 1000) : 0}s
                                                                                            <svg className={`w-3 h-3 transition-transform duration-300 ${showReasoningContent[step.id] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                                                        </span>
                                                                                    </button>
                                                                                    <AnimatePresence>
                                                                                        {showReasoningContent[step.id] && (
                                                                                            <motion.div
                                                                                                initial={{ height: 0, opacity: 0 }}
                                                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                                                exit={{ height: 0, opacity: 0 }}
                                                                                                className="pl-3.5 border-l-2 border-purple-100 dark:border-purple-900/30 overflow-hidden"
                                                                                            >
                                                                                                <div className="text-xs text-neutral-500 dark:text-neutral-400 italic py-1 prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-1 prose-pre:p-2 prose-pre:bg-neutral-100 dark:prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-200 dark:prose-pre:border-neutral-800 prose-table:border-collapse prose-td:border prose-td:border-neutral-200 dark:prose-td:border-neutral-800 prose-td:p-2 prose-th:border prose-th:border-neutral-200 dark:prose-th:border-neutral-800 prose-th:p-2 prose-th:bg-neutral-100 dark:prose-th:bg-neutral-800">
                                                                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{step.content || ''}</ReactMarkdown>
                                                                                                </div>
                                                                                            </motion.div>
                                                                                        )}
                                                                                    </AnimatePresence>
                                                                                </div>
                                                                            );
                                                                        } else if (step.type === 'action' && step.toolCalls) {
                                                                            return step.toolCalls.map((tc, tcIdx) => {
                                                                                const result = step.toolResults?.find(tr => tr.id === tc.id);
                                                                                let actionText = tc.name;
                                                                                if (tc.name === 'memory_save') actionText = `记录了新的记忆`;
                                                                                else if (tc.name === 'memory_retrieve') actionText = `检索了相关的记忆`;
                                                                                else if (tc.name === 'query_tactics') actionText = `查询了战术列表`;
                                                                                else if (tc.name === 'query_utilities') actionText = `查询了道具列表`;
                                                                                else if (tc.name === 'query_matches') actionText = `查询了比赛记录`;
                                                                                else if (tc.name === 'get_match_details') actionText = `获取了比赛详细信息 (${tc.args?.matchId || '未知'})`;
                                                                                else if (tc.name === 'get_match_rounds') actionText = `获取了比赛回合数据 (${tc.args?.matchId || '未知'})`;
                                                                                else if (tc.name === 'get_match_players') actionText = `获取了比赛选手数据 (${tc.args?.matchId || '未知'})`;
                                                                                else if (tc.name === 'query_player_stats') actionText = `查询了玩家统计数据 (${tc.args?.playerId || tc.args?.steamid || '未知'})`;
                                                                                else if (tc.name === 'query_player_matches') actionText = `查询了玩家比赛记录 (${tc.args?.playerId || tc.args?.steamid || '未知'})`;
                                                                                else if (tc.name === 'query_tournaments') actionText = `查询了赛事列表`;
                                                                                else if (tc.name === 'query_series') actionText = `查询了系列赛信息`;
                                                                                else if (tc.name === 'query_team_stats') actionText = `查询了队伍统计数据 (${tc.args?.teamName || '未知'})`;
                                                                                else if (tc.name === 'query_economy_data') actionText = `查询了经济数据`;
                                                                                else if (tc.name === 'aggregate_player_stats') actionText = `聚合了玩家统计数据`;
                                                                                else if (tc.name === 'run_data_analysis') actionText = `执行了数据分析脚本`;
                                                                                else if (tc.name === 'update_database_item') actionText = `更新了数据库项目 (${tc.args?.collection || '未知'})`;
                                                                                else if (tc.name === 'delete_database_item') actionText = `删除了数据库项目 (${tc.args?.collection || '未知'})`;
                                                                                else if (tc.name === 'finish') actionText = `标记对话完成`;

                                                                                return (
                                                                                    <div key={`${step.id}_${tc.id || tcIdx}`} className="flex flex-col gap-1.5">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className={`w-1.5 h-1.5 rounded-full ${result ? (result.error ? 'bg-red-500' : 'bg-green-500') : 'bg-blue-500 animate-pulse'}`} />
                                                                                            <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 tracking-widest">{actionText}</span>
                                                                                            {result?.error && (
                                                                                                <span className="text-[9px] font-black text-red-500 tracking-widest ml-auto">失败</span>
                                                                                            )}
                                                                                        </div>
                                                                                        {result?.error && (
                                                                                            <div className="pl-3.5 border-l border-neutral-200 dark:border-neutral-800 ml-0.5">
                                                                                                <p className="text-[9px] text-red-500 mt-1 font-medium">{result.error}</p>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            });
                                                                        } else if (step.type === 'reply') {
                                                                            return (
                                                                                <div key={step.id} className="flex items-center gap-2">
                                                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                                                    <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 tracking-widest">回复</span>
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })
                                                                ) : (
                                                                    /* Fallback for old messages without steps */
                                                                    <>
                                                                        {msg.reasoningContent && (
                                                                            <div className="flex flex-col gap-1.5">
                                                                                <button 
                                                                                    onClick={() => setShowReasoningContent(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                                                                                    className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left"
                                                                                >
                                                                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                                                    <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 tracking-widest flex items-center gap-1">
                                                                                        思考 {Math.round((msg.runningTime || (msg.endTime && msg.startTime ? msg.endTime - msg.startTime : 0)) / 1000)}s
                                                                                        <svg className={`w-3 h-3 transition-transform duration-300 ${showReasoningContent[msg.id] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                                                    </span>
                                                                                </button>
                                                                                <AnimatePresence>
                                                                                    {showReasoningContent[msg.id] && (
                                                                                        <motion.div
                                                                                            initial={{ height: 0, opacity: 0 }}
                                                                                            animate={{ height: 'auto', opacity: 1 }}
                                                                                            exit={{ height: 0, opacity: 0 }}
                                                                                            className="pl-3.5 border-l-2 border-purple-100 dark:border-purple-900/30 overflow-hidden"
                                                                                        >
                                                                                            <div className="text-xs text-neutral-500 dark:text-neutral-400 italic py-1 prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-1 prose-pre:p-2 prose-pre:bg-neutral-100 dark:prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-200 dark:prose-pre:border-neutral-800 prose-table:border-collapse prose-td:border prose-td:border-neutral-200 dark:prose-td:border-neutral-800 prose-td:p-2 prose-th:border prose-th:border-neutral-200 dark:prose-th:border-neutral-800 prose-th:p-2 prose-th:bg-neutral-100 dark:prose-th:bg-neutral-800">
                                                                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.reasoningContent}</ReactMarkdown>
                                                                                            </div>
                                                                                        </motion.div>
                                                                                    )}
                                                                                </AnimatePresence>
                                                                            </div>
                                                                        )}
                                                                        {msg.toolCalls?.map(tc => {
                                                                            const result = msg.toolResults?.find(tr => tr.id === tc.id);
                                                                            
                                                                            // Convert tool call to natural language
                                                                            let actionText = tc.name;
                                                                            if (tc.name === 'memory_save') actionText = `记录了新的记忆`;
                                                                            else if (tc.name === 'memory_retrieve') actionText = `检索了相关的记忆`;
                                                                            else if (tc.name === 'query_tactics') actionText = `查询了战术列表`;
                                                                            else if (tc.name === 'query_utilities') actionText = `查询了道具列表`;
                                                                            else if (tc.name === 'query_matches') actionText = `查询了比赛记录`;
                                                                            else if (tc.name === 'get_match_details') actionText = `获取了比赛详细信息 (${tc.args?.matchId || '未知'})`;
                                                                            else if (tc.name === 'get_match_rounds') actionText = `获取了比赛回合数据 (${tc.args?.matchId || '未知'})`;
                                                                            else if (tc.name === 'get_match_players') actionText = `获取了比赛选手数据 (${tc.args?.matchId || '未知'})`;
                                                                            else if (tc.name === 'query_player_stats') actionText = `查询了玩家统计数据 (${tc.args?.playerId || tc.args?.steamid || '未知'})`;
                                                                            else if (tc.name === 'query_player_matches') actionText = `查询了玩家比赛记录 (${tc.args?.playerId || tc.args?.steamid || '未知'})`;
                                                                            else if (tc.name === 'query_tournaments') actionText = `查询了赛事列表`;
                                                                            else if (tc.name === 'query_series') actionText = `查询了系列赛信息`;
                                                                            else if (tc.name === 'query_team_stats') actionText = `查询了队伍统计数据 (${tc.args?.teamName || '未知'})`;
                                                                            else if (tc.name === 'query_economy_data') actionText = `查询了经济数据`;
                                                                            else if (tc.name === 'aggregate_player_stats') actionText = `聚合了玩家统计数据`;
                                                                            else if (tc.name === 'run_data_analysis') actionText = `执行了数据分析脚本`;
                                                                            else if (tc.name === 'update_database_item') actionText = `更新了数据库项目 (${tc.args?.collection || '未知'})`;
                                                                            else if (tc.name === 'delete_database_item') actionText = `删除了数据库项目 (${tc.args?.collection || '未知'})`;
                                                                            else if (tc.name === 'finish') actionText = `标记对话完成`;

                                                                            return (
                                                                                <div key={tc.id} className="flex flex-col gap-1.5">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className={`w-1.5 h-1.5 rounded-full ${result ? (result.error ? 'bg-red-500' : 'bg-green-500') : 'bg-blue-500 animate-pulse'}`} />
                                                                                        <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 tracking-widest">{actionText}</span>
                                                                                        {result?.error && (
                                                                                            <span className="text-[9px] font-black text-red-500 tracking-widest ml-auto">失败</span>
                                                                                        )}
                                                                                    </div>
                                                                                    {result?.error && (
                                                                                        <div className="pl-3.5 border-l border-neutral-200 dark:border-neutral-800 ml-0.5">
                                                                                            <p className="text-[9px] text-red-500 mt-1 font-medium">{result.error}</p>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </>
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {msg.text && (
                                        <div className={`w-full max-w-full rounded-xl px-2 py-1 text-sm leading-relaxed ${
                                            msg.role === 'user' 
                                                ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-blue-600 pl-4 py-3' 
                                                : 'text-neutral-900 dark:text-neutral-100'
                                        }`}>
                                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-1 prose-pre:p-2 prose-pre:bg-neutral-100 dark:prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-200 dark:prose-pre:border-neutral-800 prose-table:border-collapse prose-td:border prose-td:border-neutral-200 dark:prose-td:border-neutral-800 prose-td:p-2 prose-th:border prose-th:border-neutral-200 dark:prose-th:border-neutral-800 prose-th:p-2 prose-th:bg-neutral-100 dark:prose-th:bg-neutral-800">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.text}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Grouped Tool results are now inside Action History above for model messages */}
                                    {msg.role === 'tool' && (
                                        <div className="space-y-2 w-full mt-2">
                                            {msg.toolResults?.map(tr => (
                                                <div key={tr.id} className="flex items-center gap-2 px-3 py-2 bg-neutral-100/50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50">
                                                    <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                                        <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    </div>
                                                    <span className="text-[10px] font-black text-neutral-500 tracking-widest">工具结果: {tr.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {msg.status === 'error' && (
                                        <div className={`w-full mt-2 p-3 border rounded-xl flex flex-col gap-2 ${
                                            msg.errorType === 'retryable' 
                                                ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/30' 
                                                : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
                                        }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {msg.errorType === 'retryable' ? (
                                                        <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                    ) : (
                                                        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    )}
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                        msg.errorType === 'retryable' ? 'text-yellow-600 dark:text-yellow-500' : 'text-red-600 dark:text-red-400'
                                                    }`}>
                                                        {msg.errorType === 'retryable' ? '可重试错误' : '致命错误'}
                                                    </span>
                                                </div>
                                                {isLastMessage && (
                                                    <button 
                                                        onClick={() => handleRetry(msg.id)}
                                                        className={`px-3 py-1 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm ${
                                                            msg.errorType === 'retryable' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-red-600 hover:bg-red-700'
                                                        }`}
                                                    >
                                                        重试
                                                    </button>
                                                )}
                                            </div>
                                            {msg.errorMessage && (
                                                <span className={`text-xs font-medium break-all ${
                                                    msg.errorType === 'retryable' ? 'text-yellow-700/80 dark:text-yellow-500/80' : 'text-red-600/80 dark:text-red-400/80'
                                                }`}>
                                                    {msg.errorMessage}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {msg.role !== 'user' && <div className="w-full border-b border-neutral-100 dark:border-neutral-800/50 my-2" />}
                                </motion.div>
                                );
                            })}
                            
                            {(() => {
                                const lastMsg = currentThread?.messages[currentThread.messages.length - 1];
                                if (!isThinking && lastMsg && lastMsg.role === 'model' && lastMsg.status !== 'error') {
                                    const hasFinish = lastMsg.apiSequence?.some(s => s.role === 'model' && s.toolCalls?.some(tc => tc.name === 'finish'));
                                    if (!hasFinish) {
                                        return (
                                            <div className="flex justify-center mt-2 mb-4">
                                                <button 
                                                    onClick={() => handleRetry(lastMsg.id)}
                                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                    继续运行
                                                </button>
                                            </div>
                                        );
                                    }
                                }
                                return null;
                            })()}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800">
                            <div className="relative flex items-end gap-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-2 border border-neutral-200 dark:border-neutral-700 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                                <textarea
                                    ref={textareaRef}
                                    value={inputText}
                                    onChange={handleInput}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="输入指令，按 Enter 发送..."
                                    className={`flex-1 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none py-3 px-4 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 ${isInputExpanded ? 'max-h-[50vh]' : 'max-h-40'}`}
                                    rows={1}
                                />
                                {showExpandButton && (
                                    <button
                                        onClick={() => setIsInputExpanded(!isInputExpanded)}
                                        className="absolute right-16 bottom-3 p-1 text-neutral-400 hover:text-blue-500 bg-white dark:bg-neutral-800 rounded-md shadow-sm border border-neutral-200 dark:border-neutral-700"
                                        title={isInputExpanded ? "收起" : "展开"}
                                    >
                                        <svg className={`w-4 h-4 transition-transform ${isInputExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                        </svg>
                                    </button>
                                )}
                                {isThinking ? (
                                    <button 
                                        onClick={() => abortControllerRef.current?.abort()}
                                        className="w-11 h-11 shrink-0 bg-red-500 hover:bg-red-600 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-red-500/20 active:scale-95"
                                        title="停止生成"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleSend()}
                                        disabled={!inputText.trim()}
                                        className="w-11 h-11 shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-200 dark:disabled:bg-neutral-800 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {showConfig && (
                <AiConfigModal 
                    onClose={() => setShowConfig(false)} 
                    onSave={() => {
                        setShowConfig(false);
                        updateConfigStates();
                    }} 
                />
            )}

            {deletingThreadId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 border border-neutral-200 dark:border-neutral-800"
                    >
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">删除对话</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">确定要删除这个对话吗？此操作无法撤销。</p>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setDeletingThreadId(null)}
                                className="px-4 py-2 rounded-xl text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            >
                                取消
                            </button>
                            <button 
                                onClick={() => handleDeleteThread(deletingThreadId)}
                                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
                            >
                                确定删除
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
