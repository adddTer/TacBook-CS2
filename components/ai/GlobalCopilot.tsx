import React, { useState, useEffect, useRef } from 'react';
import { CopilotThread, CopilotMessage } from '../../services/ai/agentic/types';
import { getThreads, createThread, getThread, addMessageToThread, updateThread, deleteThread } from '../../services/ai/agentic/storage';
import { AgenticEngine } from '../../services/ai/agentic/engine';
import { getApiKey } from '../../services/ai/config';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface GlobalCopilotProps {
    allTactics: any[];
    allUtilities: any[];
    allMatches: any[];
    allTournaments: any[];
    allBons: any[];
}

export const GlobalCopilot: React.FC<GlobalCopilotProps> = ({ allTactics, allUtilities, allMatches, allTournaments, allBons }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [threads, setThreads] = useState<CopilotThread[]>([]);
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [inputText, setInputText] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [isAdmin, setIsAdmin] = useState(true); // Permission toggle for demo
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load threads on mount
    useEffect(() => {
        const loadedThreads = getThreads();
        setThreads(loadedThreads);
        if (loadedThreads.length > 0) {
            const lastThread = loadedThreads[0];
            setCurrentThreadId(lastThread.id);
            
            // Resume if last message was a tool call or user message without response
            const lastMsg = lastThread.messages[lastThread.messages.length - 1];
            if (lastMsg && (lastMsg.role === 'user' || lastMsg.toolCalls)) {
                // We don't auto-trigger on mount to avoid unexpected API calls, 
                // but we could if we wanted true "seamless" resume.
                // For now, the status will show it's pending.
            }
        } else {
            const newThread = createThread();
            setThreads([newThread]);
            setCurrentThreadId(newThread.id);
        }
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [currentThreadId, threads, isOpen]);

    const currentThread = threads.find(t => t.id === currentThreadId);

    const handleSend = async () => {
        if (!inputText.trim() || !currentThreadId) return;

        const apiKey = getApiKey();
        if (!apiKey) {
            alert('请先在 API 管理器中配置 API Key');
            return;
        }

        const userMsg: CopilotMessage = {
            id: `msg_${Date.now()}`,
            role: 'user',
            text: inputText.trim(),
            timestamp: Date.now(),
            status: 'completed'
        };

        addMessageToThread(currentThreadId, userMsg);
        setThreads(getThreads());
        setInputText('');
        setIsThinking(true);

        // Get fresh thread data after adding user message
        const freshThread = getThread(currentThreadId);
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
            isAdmin // Use the current state
        });

        // Process Loop
        try {
            await engine.process(
                (msgUpdate) => {
                    const thread = getThread(currentThreadId);
                    if (thread) {
                        const existingMsgIndex = thread.messages.findIndex(m => m.id === msgUpdate.id);
                        let newMessages;
                        
                        if (existingMsgIndex !== -1) {
                            // Update existing message
                            newMessages = [...thread.messages];
                            newMessages[existingMsgIndex] = { 
                                ...newMessages[existingMsgIndex], 
                                ...msgUpdate,
                                timestamp: Date.now() // Update timestamp for sorting if needed
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

                        updateThread(currentThreadId, { messages: newMessages });
                        setThreads(getThreads());
                    }
                },
                (threadUpdate) => {
                    updateThread(currentThreadId, threadUpdate);
                    setThreads(getThreads());
                }
            );
        } catch (e) {
            console.error("Copilot Error:", e);
        } finally {
            setIsThinking(false);
        }
    };

    const handleNewChat = () => {
        const newThread = createThread();
        setThreads(getThreads());
        setCurrentThreadId(newThread.id);
    };

    const handleDeleteThread = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        deleteThread(id);
        const remaining = getThreads();
        setThreads(remaining);
        if (currentThreadId === id) {
            setCurrentThreadId(remaining.length > 0 ? remaining[0].id : null);
        }
    };

    const handleRenameThread = (id: string) => {
        const thread = getThread(id);
        if (!thread) return;
        const newTitle = prompt('重命名对话', thread.title);
        if (newTitle && newTitle.trim()) {
            updateThread(id, { title: newTitle.trim() });
            setThreads(getThreads());
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
                className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center z-50 ring-4 ring-white dark:ring-neutral-900"
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
                        : 'bottom-24 right-6 w-[400px] h-[650px] rounded-2xl max-w-[calc(100vw-48px)] max-h-[calc(100vh-120px)]'
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
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{isThinking ? 'Thinking...' : 'Agentic Engine'}</p>
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
                        <button onClick={handleNewChat} className="p-2 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all" title="新对话">
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
                                    <button
                                        onClick={() => setCurrentThreadId(thread.id)}
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
                                            onClick={(e) => { e.stopPropagation(); handleRenameThread(thread.id); }}
                                            className={`p-1.5 rounded-lg transition-all ${currentThreadId === thread.id ? 'hover:bg-blue-500 text-white' : 'hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400'}`}
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteThread(e, thread.id)}
                                            className={`p-1.5 rounded-lg transition-all ${currentThreadId === thread.id ? 'hover:bg-red-500 text-white' : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-neutral-400 hover:text-red-500'}`}
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
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
                            
                            {currentThread?.messages.map((msg) => (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={msg.id} 
                                    className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                                >
                                    {msg.text && (
                                        <div className={`w-full max-w-full rounded-xl px-2 py-1 text-sm leading-relaxed ${
                                            msg.role === 'user' 
                                                ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-blue-600 pl-4 py-3' 
                                                : 'text-neutral-900 dark:text-neutral-100'
                                        }`}>
                                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Render Tool Calls & Results (Grouped) */}
                                    {(msg.toolCalls || msg.toolResults) && (
                                        <div className="space-y-2 w-full mt-2">
                                            {msg.toolCalls?.map(tc => {
                                                const result = msg.toolResults?.find(tr => tr.id === tc.id);
                                                return (
                                                    <div key={tc.id} className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2 px-3 py-2 bg-neutral-100/50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50">
                                                            <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                                                <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                            </div>
                                                            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">执行工具: {tc.name}</span>
                                                            {result && (
                                                                <div className="ml-auto flex items-center gap-1.5">
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${result.error ? 'bg-red-500' : 'bg-green-500'}`} />
                                                                    <span className={`text-[9px] font-bold uppercase tracking-widest ${result.error ? 'text-red-500' : 'text-green-600'}`}>
                                                                        {result.error ? '失败' : '成功'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {result?.error && (
                                                            <div className="px-3 py-2 bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20 text-[10px] text-red-600 font-medium">
                                                                {result.error}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {msg.role !== 'user' && <div className="w-full border-b border-neutral-100 dark:border-neutral-800/50 my-2" />}
                                </motion.div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800">
                            <div className="relative flex items-end gap-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-2 border border-neutral-200 dark:border-neutral-700 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                                <textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="输入指令，按 Enter 发送..."
                                    className="flex-1 max-h-40 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none py-3 px-4 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
                                    rows={1}
                                />
                                <button 
                                    onClick={handleSend}
                                    disabled={!inputText.trim() || isThinking}
                                    className="w-11 h-11 shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-200 dark:disabled:bg-neutral-800 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                                >
                                    {isThinking ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                    )}
                                </button>
                            </div>
                            <p className="text-[10px] text-center text-neutral-400 mt-3 font-medium uppercase tracking-widest">
                                Powered by Gemini 3.1 Pro
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
