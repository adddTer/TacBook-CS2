import React, { useState, useEffect, useRef } from 'react';
import { CopilotThread, CopilotMessage } from '../../services/ai/agentic/types';
import { getThreads, createThread, getThread, addMessageToThread, updateThread, deleteThread, saveThreads } from '../../services/ai/agentic/storage';
import { AgenticEngine } from '../../services/ai/agentic/engine';
import { getApiKey, getSelectedModel, getThinkingLevel } from '../../services/ai/config';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { AiConfigModal } from '../AiConfigModal';
import { FunctionDeclaration } from '@google/genai';
import { Gamepad2, User, Lightbulb, Target, ArrowRight } from 'lucide-react';
import mermaid from 'mermaid';

// Global lock for DB writes to prevent IDB races
let dbSavePromise: Promise<void> = Promise.resolve();
const queueSaveThreads = (threadsToSave: CopilotThread[]) => {
    dbSavePromise = dbSavePromise.then(async () => {
        try {
            await saveThreads(threadsToSave);
        } catch (e) {
            console.error("Failed to save threads in queue:", e);
        }
    });
};

const CopyableWrapper = ({ children, isCode = false }: { children: React.ReactNode, isCode?: boolean }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!contentRef.current) return;
        
        let textToCopy = '';
        if (isCode) {
            textToCopy = contentRef.current.innerText;
        } else {
            // For tables, read TSV formatted text to preserve structure in Excel/Sheets
            const table = contentRef.current.querySelector('table');
            if (table) {
                const rows = Array.from(table.rows);
                textToCopy = rows.map(row => {
                    const cells = Array.from(row.cells);
                    return cells.map(cell => cell.innerText.trim()).join('\t');
                }).join('\n');
            } else {
                textToCopy = contentRef.current.innerText;
            }
        }

        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group/copyable mt-3 mb-3 w-full max-w-full min-w-0">
            <div className="absolute right-2 top-2 z-10 transition-opacity opacity-100 md:opacity-0 md:group-hover/copyable:opacity-100">
                <button 
                    onClick={handleCopy}
                    className="p-1.5 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 rounded-md shadow-sm text-neutral-500 hover:text-blue-500 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all"
                    title="复制内容"
                >
                    {copied ? (
                        <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    )}
                </button>
            </div>
            <div ref={contentRef} className={`w-full max-w-full min-w-0 ${isCode ? '' : 'overflow-x-auto overflow-y-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 slim-scrollbar'}`}>
                {children}
            </div>
        </div>
    );
};

mermaid.initialize({ startOnLoad: false, theme: 'default' });

const MermaidBlock = ({ chart }: { chart: string }) => {
    const [svg, setSvg] = useState<string>('');
    const id = React.useMemo(() => `mermaid-${Math.random().toString(36).substring(2, 9)}`, []);

    useEffect(() => {
        mermaid.render(id, chart).then((result) => {
            setSvg(result.svg);
        }).catch((e) => {
            console.error('Mermaid render error', e);
        });
    }, [chart, id]);

    if (!svg) return <div className="p-4 flex justify-center text-neutral-500 text-xs">渲染图表中...</div>;
    return <div className="p-4 flex justify-center bg-white dark:bg-neutral-800 rounded-b-2xl overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />;
};

const SmartCodeBlock = ({ language, code, ...props }: { language: string, code: string, [key: string]: any }) => {
    const [viewMode, setViewMode] = useState<'render' | 'raw'>('render');
    const isRenderable = language === 'mermaid' || language === 'hlml';

    if (!isRenderable) {
        return (
            <CopyableWrapper isCode={true}>
                <code className={`language-${language} block overflow-x-auto p-3`} {...props}>{code}</code>
            </CopyableWrapper>
        );
    }

    return (
        <div className="my-4 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden bg-neutral-50 dark:bg-neutral-900 shadow-sm">
            <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950/80">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{language} 预览</span>
                <button 
                    onClick={() => setViewMode(v => v === 'render' ? 'raw' : 'render')}
                    className="text-[10px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-1 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition"
                >
                    {viewMode === 'render' ? '查看原始代码' : '查看渲染效果'}
                </button>
            </div>
            {viewMode === 'render' ? (
                language === 'mermaid' ? <MermaidBlock chart={code} /> : <div className="p-4 bg-white dark:bg-neutral-800 rounded-b-2xl overflow-x-auto" dangerouslySetInnerHTML={{ __html: code }} />
            ) : (
                <CopyableWrapper isCode={true}>
                    <code className={`language-${language} block overflow-x-auto p-4`} {...props}>{code}</code>
                </CopyableWrapper>
            )}
        </div>
    );
};

const MessageCopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex justify-start mt-2 opacity-100 md:opacity-0 md:group-hover/msg:opacity-100 transition-opacity">
            <button 
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors uppercase tracking-widest"
                title="复制内容"
            >
                {copied ? (
                    <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                )}
                {copied ? '已复制' : '复制'}
            </button>
        </div>
    );
};

const ItemDiffViewer = ({ snapshot, updated, onRollback }: { snapshot: any, updated: any, onRollback: () => void }) => {
    // Determine which fields changed
    const changedKeys = Object.keys(updated).filter(k => JSON.stringify(snapshot[k]) !== JSON.stringify(updated[k]));

    return (
        <div className="mt-2 w-full flex flex-col gap-2 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 relative group/diff">
            <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    数据已更改 ({changedKeys.length} 项)
                </span>
                {snapshot && (
                    <button 
                        onClick={onRollback}
                        className="px-2 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-lg transition-colors border border-red-200 dark:border-red-900"
                    >
                        撤销此时修改
                    </button>
                )}
            </div>
            {changedKeys.length > 0 && (
                <div className="text-[10px] text-neutral-500 flex flex-wrap gap-1">
                    {changedKeys.map(k => (
                        <span key={k} className="px-1.5 py-0.5 bg-white dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-700">
                            {k}
                        </span>
                    ))}
                </div>
            )}
            <div className="absolute top-full left-0 mt-1 w-[280px] sm:w-[400px] z-50 hidden group-hover/diff:block shadow-2xl rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
                <div className="flex bg-neutral-100 dark:bg-neutral-800/50 px-3 py-1.5 border-b border-neutral-200 dark:border-neutral-800">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Diff 直观显示</span>
                </div>
                <div className="grid grid-cols-2 text-[10px] max-h-[300px] overflow-y-auto slim-scrollbar">
                    <div className="p-2 border-r border-neutral-200 dark:border-neutral-800">
                        <div className="font-bold text-red-500 mb-1 border-b border-red-100 dark:border-red-900/30 pb-1">旧快照</div>
                        <pre className="text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap word-break-all font-mono">
                            {JSON.stringify(changedKeys.reduce((acc, k) => ({ ...acc, [k]: snapshot[k] }), {}), null, 2)}
                        </pre>
                    </div>
                    <div className="p-2">
                        <div className="font-bold text-green-500 mb-1 border-b border-green-100 dark:border-green-900/30 pb-1">新更改</div>
                        <pre className="text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap word-break-all font-mono">
                            {JSON.stringify(changedKeys.reduce((acc, k) => ({ ...acc, [k]: updated[k] }), {}), null, 2)}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
};

export interface CopilotUIProps {
    toolDeclarations: FunctionDeclaration[];
    createHandlers: (context: any) => any;
    systemInstructionBase: string;
    context: any; // Additional context to pass to handlers
    title?: string;
    toolNameMap?: Record<string, (args: any) => string>;
    emptyStateTitle?: string;
    emptyStateDescription?: string;
}

export const CopilotUI: React.FC<CopilotUIProps> = ({ 
    toolDeclarations,
    createHandlers,
    systemInstructionBase,
    context,
    title = "TacBook Copilot",
    toolNameMap = {},
    emptyStateTitle = "我是你的智能助手",
    emptyStateDescription = "你可以问我任何问题。我会通过 Agentic Workflow 为你提供最专业的建议。"
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
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
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

    const handleRollback = (collection: string, snapshot: any) => {
        const text = `请调用 update_database_item 恢复 ${collection} 集合中的项目为以下快照：\n\`\`\`json\n${JSON.stringify({collection, item: snapshot}, null, 2)}\n\`\`\``;
        setInputText(text);
        setTimeout(() => handleSend(), 100);
    };

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
        const handlers = createHandlers({
            ...context,
            isAdmin,
            threadMemory: freshThread.memory || {},
            updateMemory: (key: string, value: any) => {
                if (!freshThread.memory) freshThread.memory = {};
                freshThread.memory[key] = value;
            },
            updateTaskState: (state: any) => {
                freshThread.taskState = state;
            }
        });

        const engine = new AgenticEngine(
            apiKey, 
            freshThread, 
            handlers, 
            toolDeclarations, 
            systemInstructionBase, 
            model, 
            thinkingLevel
        );

        // Process Loop
        try {
            abortControllerRef.current = new AbortController();
            await engine.process(
                async (msgUpdate) => {
                    setThreads(prevThreads => {
                        let isUpdated = false;
                        const newThreads = prevThreads.map(t => {
                            if (t.id === targetThreadId) {
                                const existingMsgIndex = t.messages.findIndex(m => m.id === msgUpdate.id);
                                let newMessages;
                                
                                if (existingMsgIndex !== -1) {
                                    newMessages = [...t.messages];
                                    newMessages[existingMsgIndex] = { 
                                        ...newMessages[existingMsgIndex], 
                                        ...msgUpdate,
                                        timestamp: Date.now() 
                                    };
                                } else {
                                    const newMsg = { 
                                        ...msgUpdate, 
                                        id: msgUpdate.id || `msg_${Date.now()}`, 
                                        timestamp: Date.now() 
                                    } as CopilotMessage;
                                    newMessages = [...t.messages, newMsg];
                                }
                                isUpdated = true;
                                return { ...t, messages: newMessages };
                            }
                            return t;
                        });

                        if (isUpdated && msgUpdate.status !== 'aborted') {
                            queueSaveThreads(newThreads);
                        }
                        
                        return newThreads;
                    });
                },
                async (threadUpdate) => {
                    setThreads(prevThreads => {
                        const newThreads = prevThreads.map(t => {
                            if (t.id === targetThreadId) {
                                return { ...t, ...threadUpdate, updatedAt: Date.now() };
                            }
                            return t;
                        });
                        queueSaveThreads(newThreads);
                        return newThreads;
                    });
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
        
        // Find the message in local state first, because aborted messages aren't in DB
        const currentThreadLocal = threads.find(t => t.id === currentThreadId);
        if (!currentThreadLocal) return;

        const messageIndex = currentThreadLocal.messages.findIndex(m => m.id === msgId);
        if (messageIndex === -1) return;

        // Only allow retry if it's the last message in the thread
        if (messageIndex !== currentThreadLocal.messages.length - 1) {
            console.warn("Can only retry the latest message.");
            return;
        }

        const msg = currentThreadLocal.messages[messageIndex];
        
        // If it was aborted, we need to save it to DB first so engine can resume it
        if (msg.status === 'aborted') {
            await updateThread(currentThreadId, { messages: currentThreadLocal.messages });
        }

        handleSend(msgId);
    };

    const handleNewChat = async () => {
        setCurrentThreadId(null);
        setShowMobileSidebar(false);
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

    const markdownComponents = {
        table: ({node, ...props}: any) => (
            <CopyableWrapper>
                <table className="w-full text-left text-xs md:text-sm !m-0 min-w-max" {...props} />
            </CopyableWrapper>
        ),
        code: ({node, inline, className, children, ...props}: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            if (inline) {
                return <code className={`${className} bg-neutral-100 dark:bg-neutral-800 rounded px-1 py-0.5`} {...props}>{children}</code>;
            }

            if (language === 'scoreboard') {
                try {
                    const data = JSON.parse(String(children).replace(/\n$/, ''));
                    return (
                        <div className="my-4 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
                            <div className="bg-neutral-100/50 dark:bg-neutral-800/50 px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center text-xs text-neutral-500 font-bold uppercase tracking-widest">
                                <span>{data.event || 'CS2 Match'}</span>
                                {data.mapName && <span className="bg-neutral-200 dark:bg-neutral-700 px-2 py-0.5 rounded-md text-[10px]">{data.mapName}</span>}
                            </div>
                            <div className="p-4 md:p-6 flex items-center justify-between">
                                <div className="flex-1 flex flex-col items-center">
                                    <span className="text-sm md:text-lg font-black text-neutral-900 dark:text-white text-center truncate w-full px-2">{data.teamA || 'Team A'}</span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 px-2 md:px-4">
                                    <span className={`text-3xl md:text-5xl font-black tabular-nums transition-colors ${data.scoreA > data.scoreB ? 'text-blue-600 dark:text-blue-500' : 'text-neutral-400 dark:text-neutral-600'}`}>{data.scoreA || 0}</span>
                                    <span className="text-neutral-300 dark:text-neutral-700 font-bold text-xl">:</span>
                                    <span className={`text-3xl md:text-5xl font-black tabular-nums transition-colors ${data.scoreB > data.scoreA ? 'text-blue-600 dark:text-blue-500' : 'text-neutral-400 dark:text-neutral-600'}`}>{data.scoreB || 0}</span>
                                </div>
                                <div className="flex-1 flex flex-col items-center">
                                    <span className="text-sm md:text-lg font-black text-neutral-900 dark:text-white text-center truncate w-full px-2">{data.teamB || 'Team B'}</span>
                                </div>
                            </div>
                        </div>
                    );
                } catch (e) {
                    return <code className={className} {...props}>{children}</code>;
                }
            }
            
            if (language === 'mermaid' || language === 'hlml') {
                return <SmartCodeBlock language={language} code={String(children).replace(/\n$/, '')} {...props} />;
            }
            
            return <code className={`${className} block overflow-x-auto`} {...props}>{children}</code>;
        },
        pre: ({node, ...props}: any) => {
            // Check if this pre contains our special code block
            const childClassName = String(node?.children?.[0]?.properties?.className || '');
            if (childClassName.includes('language-scoreboard') || childClassName.includes('language-mermaid') || childClassName.includes('language-hlml')) {
                return <>{props.children}</>;
            }
            return (
                <CopyableWrapper isCode={true}>
                    <pre className="!m-0 !bg-transparent p-4 overflow-x-auto text-[13px] leading-relaxed" {...props} />
                </CopyableWrapper>
            );
        },
        th: ({node, ...props}: any) => <th className="bg-neutral-50 dark:bg-neutral-800/50 p-1.5 md:p-2 font-bold text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-800 whitespace-nowrap" {...props} />,
        td: ({node, ...props}: any) => <td className="p-1.5 md:p-2 border-b border-neutral-100 dark:border-neutral-800/50 text-neutral-600 dark:text-neutral-300 min-w-[80px]" {...props} />,
        a: ({node, href, children, ...props}: any) => {
            if (href?.startsWith('#match/')) {
                const matchId = href.replace('#match/', '');
                const isValid = context?.allMatches ? context.allMatches.some((m: any) => m.id === matchId) : true;
                return (
                    <a 
                        href={href}
                        onClick={(e) => {
                            e.preventDefault();
                            if (!isValid) return;
                            window.location.hash = `match/${matchId}`;
                            setIsOpen(false);
                        }}
                        className={`flex items-center justify-between p-4 my-3 border rounded-xl no-underline group transition-all duration-200 ${
                            isValid 
                                ? 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow hover:border-blue-300 dark:hover:border-blue-600/50 cursor-pointer overflow-hidden relative' 
                                : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 opacity-60 cursor-not-allowed'
                        }`}
                        title={!isValid ? '目标数据已失效或被删除' : ''}
                    >
                        {/* Accent left border */}
                        {isValid && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl"></div>}
                        
                        <div className="flex flex-1 items-center gap-4 w-0 min-w-0 pl-1">
                            <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center ${isValid ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'}`}>
                                <Gamepad2 className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className={`text-sm font-semibold truncate transition-colors ${isValid ? 'text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400' : 'text-neutral-500 line-through'}`}>{children}</span>
                                <span className="text-[11px] text-neutral-500 font-medium tracking-wide mt-0.5">{isValid ? '查看比赛数据' : '数据已失效'}</span>
                            </div>
                        </div>
                        {isValid && <div className="w-8 h-8 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-500/20 transition-colors ml-2 shrink-0">
                            <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-blue-500 transition-colors" />
                        </div>}
                    </a>
                );
            }
            if (href?.startsWith('#player/')) {
                const playerId = href.replace('#player/', '');
                // Player matching might be hard, so assume valid or we can do a quick check if possible
                const isValid = true; 
                return (
                    <a 
                        href={href}
                        onClick={(e) => {
                            e.preventDefault();
                            if (!isValid) return;
                            window.location.hash = `player/${playerId}`;
                            setIsOpen(false);
                        }}
                        className={`flex items-center justify-between p-4 my-3 border rounded-xl no-underline group transition-all duration-200 ${
                            isValid 
                                ? 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow hover:border-amber-300 dark:hover:border-amber-600/50 cursor-pointer overflow-hidden relative' 
                                : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 opacity-60 cursor-not-allowed'
                        }`}
                        title={!isValid ? '目标数据已失效或被删除' : ''}
                    >
                        {/* Accent left border */}
                        {isValid && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-l-xl"></div>}
                        
                        <div className="flex flex-1 items-center gap-4 w-0 min-w-0 pl-1">
                            <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center ${isValid ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'}`}>
                                <User className="w-5 h-5 focus:outline-none" />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className={`text-sm font-semibold truncate transition-colors ${isValid ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 line-through'}`}>{children}</span>
                                <span className="text-[11px] text-neutral-500 font-medium tracking-wide mt-0.5">{isValid ? '查看玩家数据' : '数据已失效'}</span>
                            </div>
                        </div>
                        {isValid && <div className="w-8 h-8 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center group-hover:bg-amber-50 dark:group-hover:bg-amber-500/20 transition-colors ml-2 shrink-0">
                            <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-amber-500 transition-colors" />
                        </div>}
                    </a>
                );
            }
            if (href?.startsWith('#tactic/')) {
                const tacticId = href.replace('#tactic/', '');
                const isValid = context?.allTactics ? context.allTactics.some((m: any) => m.id === tacticId) : true;
                return (
                    <a 
                        href={href}
                        onClick={(e) => {
                            e.preventDefault();
                            if (!isValid) return;
                            window.dispatchEvent(new CustomEvent('open-tactic', { detail: tacticId }));
                            setIsOpen(false);
                        }}
                        className={`flex items-center justify-between p-4 my-3 border rounded-xl no-underline group transition-all duration-200 ${
                            isValid 
                                ? 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow hover:border-emerald-300 dark:hover:border-emerald-600/50 cursor-pointer overflow-hidden relative' 
                                : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 opacity-60 cursor-not-allowed'
                        }`}
                        title={!isValid ? '目标数据已失效或被删除' : ''}
                    >
                        {/* Accent left border */}
                        {isValid && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-xl"></div>}
                        
                        <div className="flex flex-1 items-center gap-4 w-0 min-w-0 pl-1">
                            <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center ${isValid ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'}`}>
                                <Lightbulb className="w-5 h-5 focus:outline-none" />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className={`text-sm font-semibold truncate transition-colors ${isValid ? 'text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400' : 'text-neutral-500 line-through'}`}>{children}</span>
                                <span className="text-[11px] text-neutral-500 font-medium tracking-wide mt-0.5">{isValid ? '查看战术板' : '数据已失效'}</span>
                            </div>
                        </div>
                        {isValid && <div className="w-8 h-8 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/20 transition-colors ml-2 shrink-0">
                            <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-500 transition-colors" />
                        </div>}
                    </a>
                );
            }
            if (href?.startsWith('#utility/')) {
                const utilityId = href.replace('#utility/', '');
                const isValid = context?.allUtilities ? context.allUtilities.some((m: any) => m.id === utilityId) : true;
                return (
                    <a 
                        href={href}
                        onClick={(e) => {
                            e.preventDefault();
                            if (!isValid) return;
                            window.dispatchEvent(new CustomEvent('open-utility', { detail: utilityId }));
                            setIsOpen(false);
                        }}
                        className={`flex items-center justify-between p-4 my-3 border rounded-xl no-underline group transition-all duration-200 ${
                            isValid 
                                ? 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow hover:border-purple-300 dark:hover:border-purple-600/50 cursor-pointer overflow-hidden relative' 
                                : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 opacity-60 cursor-not-allowed'
                        }`}
                        title={!isValid ? '目标数据已失效或被删除' : ''}
                    >
                        {/* Accent left border */}
                        {isValid && <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 rounded-l-xl"></div>}
                        
                        <div className="flex flex-1 items-center gap-4 w-0 min-w-0 pl-1">
                            <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center ${isValid ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'}`}>
                                <Target className="w-5 h-5 focus:outline-none" />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className={`text-sm font-semibold truncate transition-colors ${isValid ? 'text-neutral-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400' : 'text-neutral-500 line-through'}`}>{children}</span>
                                <span className="text-[11px] text-neutral-500 font-medium tracking-wide mt-0.5">{isValid ? '查看投掷道具' : '数据已失效'}</span>
                            </div>
                        </div>
                        {isValid && <div className="w-8 h-8 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center group-hover:bg-purple-50 dark:group-hover:bg-purple-500/20 transition-colors ml-2 shrink-0">
                            <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-purple-500 transition-colors" />
                        </div>}
                    </a>
                );
            }
            if (href?.startsWith('match://')) {
                // Legacy URL format adaptation
                const matchId = href.replace('match://', '');
                return (
                    <a 
                        href={`#match/${matchId}`}
                        onClick={(e) => {
                            e.preventDefault();
                            window.location.hash = `match/${matchId}`;
                            setIsOpen(false);
                        }}
                        className="flex items-center justify-between p-3 my-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors no-underline group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{children}</span>
                                <span className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">点击查看比赛 (旧版链接)</span>
                            </div>
                        </div>
                        <svg className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </a>
                );
            }
            return <a href={href} {...props} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>;
        },
        p: ({node, ...props}: any) => <div className="mb-4 last:mb-0" {...props} />
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

    // Compute dynamic progress text
    let progressText = 'Thinking...';
    if (isThinking && currentThread) {
        const lastMsg = currentThread.messages[currentThread.messages.length - 1];
        if (lastMsg && lastMsg.role === 'model') {
            if (lastMsg.steps && lastMsg.steps.length > 0) {
                const lastStep = lastMsg.steps[lastMsg.steps.length - 1];
                if (lastStep.type === 'action' && lastStep.toolCalls && lastStep.toolCalls.length > 0) {
                    const tc = lastStep.toolCalls[lastStep.toolCalls.length - 1];
                    progressText = (toolNameMap && toolNameMap[tc.name]) ? toolNameMap[tc.name](tc.args) : `执行 ${tc.name}...`;
                } else if (lastStep.type === 'think') {
                    progressText = '深度思考中...';
                }
            }
        }
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                layout
                initial={isFullScreen ? { opacity: 0, scale: 0.98 } : { opacity: 0, y: 50, scale: 0.9, transformOrigin: 'bottom right' }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={isFullScreen ? { opacity: 0, scale: 0.98 } : { opacity: 0, y: 50, scale: 0.9, transformOrigin: 'bottom right' }}
                transition={{ type: 'spring', damping: 20, stiffness: 400 }}
                className={`fixed z-[9999] flex flex-col bg-white dark:bg-neutral-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-neutral-200 dark:border-neutral-800 overflow-hidden transition-[inset,border-radius] duration-300 ease-in-out
                    ${isFullScreen 
                        ? 'inset-0 md:inset-6 md:rounded-2xl' 
                        : 'inset-0 md:inset-auto md:bottom-24 md:right-6 w-full h-full md:w-[400px] md:h-[650px] rounded-none md:rounded-2xl md:max-w-[calc(100vw-48px)] md:max-h-[calc(100vh-120px)]'
                    }
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 md:px-5 py-3 md:py-4 border-b border-neutral-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shrink-0">
                    <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                        <button 
                            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                            className="p-2 -ml-2 text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all md:hidden shrink-0"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <div className="min-w-0">
                            <h3 className="font-black text-xs md:text-sm tracking-tight text-neutral-900 dark:text-white uppercase truncate">Copilot</h3>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isThinking ? 'bg-blue-500 animate-ping' : 'bg-green-500'}`}></span>
                                <p className="text-[9px] md:text-[10px] font-bold text-neutral-400 uppercase tracking-widest truncate">
                                    {isThinking ? progressText : `${currentModelName} ${currentModelName.includes('gemini-3') && currentThinkingLevel ? `· ${currentThinkingLevel}` : ''}`}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
                        <button 
                            onClick={() => setIsAdmin(!isAdmin)} 
                            className={`hidden sm:block px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all mr-1 md:mr-2 ${
                                isAdmin 
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30' 
                                    : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'
                            }`}
                            title={isAdmin ? "管理员模式 (可编辑)" : "普通用户模式 (只读)"}
                        >
                            {isAdmin ? 'Admin' : 'User'}
                        </button>
                        <button onClick={() => setShowConfig(true)} className="p-1.5 md:p-2 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all" title="API 设置">
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        <button onClick={handleNewChat} disabled={isThinking} className="p-1.5 md:p-2 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed" title="新对话">
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                        <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-1.5 md:p-2 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all hidden md:block" title={isFullScreen ? "退出全屏" : "全屏模式"}>
                            {isFullScreen ? (
                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            ) : (
                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                            )}
                        </button>
                        <button onClick={() => setIsOpen(false)} className="p-1.5 md:p-2 text-neutral-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all" title="关闭">
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden bg-neutral-50/50 dark:bg-neutral-950/50 relative">
                    {/* Sidebar (Thread List) */}
                    {(isFullScreen || showMobileSidebar) && (
                        <div className={`border-r border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-y-auto p-3 shrink-0 transition-all z-20 ${
                            isFullScreen ? 'hidden md:block md:w-72' : 'hidden'
                        } ${
                            showMobileSidebar ? '!block absolute inset-0 w-full md:relative md:w-72 md:z-auto' : ''
                        }`}>
                            <div className="mb-4 px-2 flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">历史对话</h4>
                                {showMobileSidebar && !isFullScreen && (
                                    <button onClick={() => setShowMobileSidebar(false)} className="md:hidden p-1 text-neutral-400 hover:text-neutral-600">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                )}
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
                                                    if (!isThinking) {
                                                        setCurrentThreadId(thread.id);
                                                        setShowMobileSidebar(false);
                                                    }
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
                                            <div className="absolute right-2 top-3 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-all">
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
                    <div className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-4 md:space-y-6 scrollbar-hide">
                            {currentThread?.messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center px-8">
                                    <h2 className="text-xl font-black text-neutral-900 dark:text-white mb-2">{emptyStateTitle}</h2>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                        {emptyStateDescription}
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
                                    className={`flex flex-col gap-2 w-full min-w-0 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                                >
                                    {msg.role === 'model' && (
                                        <div className="w-full flex flex-col gap-3 mb-2 min-w-0 overflow-hidden">
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
                                                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
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
                                                                                                className="pl-3.5 border-l-2 border-blue-100 dark:border-blue-900/30 overflow-hidden"
                                                                                            >
                                                                                                <div className="text-xs text-neutral-500 dark:text-neutral-400 italic py-1 prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-1 prose-pre:p-2 prose-pre:bg-neutral-100 dark:prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-200 dark:prose-pre:border-neutral-800 prose-table:my-0">
                                                                                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]} components={markdownComponents}>{step.content || ''}</ReactMarkdown>
                                                                                                </div>
                                                                                            </motion.div>
                                                                                        )}
                                                                                    </AnimatePresence>
                                                                                </div>
                                                                            );
                                                                        } else if (step.type === 'action' && step.toolCalls) {
                                                                            return step.toolCalls.map((tc, tcIdx) => {
                                                                                const result = step.toolResults?.find(tr => tr.id === tc.id);
                                                                                let actionText = (toolNameMap && toolNameMap[tc.name]) ? toolNameMap[tc.name](tc.args) : tc.name;

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
                                                                                        {result?.logs && (
                                                                                            <div className="pl-3.5 border-l border-neutral-200 dark:border-neutral-800 ml-0.5 mt-1">
                                                                                                <pre className="text-[9px] text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 p-1.5 rounded overflow-x-auto">
                                                                                                    {result.logs}
                                                                                                </pre>
                                                                                            </div>
                                                                                        )}
                                                                                        {tc.name === 'update_database_item' && result?.result?.snapshot && result?.result?.updated && (
                                                                                            <div className="pl-3.5 border-l border-neutral-200 dark:border-neutral-800 ml-0.5 mt-1">
                                                                                                <ItemDiffViewer 
                                                                                                    snapshot={result.result.snapshot} 
                                                                                                    updated={result.result.updated} 
                                                                                                    onRollback={() => handleRollback(tc.args.collection, result.result.snapshot)} 
                                                                                                />
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
                                                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
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
                                                                                            className="pl-3.5 border-l-2 border-blue-100 dark:border-blue-900/30 overflow-hidden"
                                                                                        >
                                                                                            <div className="text-xs text-neutral-500 dark:text-neutral-400 italic py-1 prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-1 prose-pre:p-2 prose-pre:bg-neutral-100 dark:prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-200 dark:prose-pre:border-neutral-800 prose-table:my-0">
                                                                                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]} components={markdownComponents}>{msg.reasoningContent}</ReactMarkdown>
                                                                                            </div>
                                                                                        </motion.div>
                                                                                    )}
                                                                                </AnimatePresence>
                                                                            </div>
                                                                        )}
                                                                        {msg.toolCalls?.map(tc => {
                                                                            const result = msg.toolResults?.find(tr => tr.id === tc.id);
                                                                            
                                                                            // Convert tool call to natural language
                                                                            let actionText = (toolNameMap && toolNameMap[tc.name]) ? toolNameMap[tc.name](tc.args) : tc.name;

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
                                                                                    {result?.logs && (
                                                                                        <div className="pl-3.5 border-l border-neutral-200 dark:border-neutral-800 ml-0.5 mt-1">
                                                                                            <pre className="text-[9px] text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 p-1.5 rounded overflow-x-auto">
                                                                                                {result.logs}
                                                                                            </pre>
                                                                                        </div>
                                                                                    )}
                                                                                    {tc.name === 'update_database_item' && result?.result?.snapshot && result?.result?.updated && (
                                                                                        <div className="pl-3.5 border-l border-neutral-200 dark:border-neutral-800 ml-0.5 mt-1">
                                                                                            <ItemDiffViewer 
                                                                                                snapshot={result.result.snapshot} 
                                                                                                updated={result.result.updated} 
                                                                                                onRollback={() => handleRollback(tc.args.collection, result.result.snapshot)} 
                                                                                            />
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
                                        <div className={`group/msg max-w-full min-w-0 ${
                                            msg.role === 'user' 
                                                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[90%] md:max-w-[85%]' 
                                                : 'text-neutral-900 dark:text-neutral-100 w-full overflow-hidden'
                                        }`}>
                                            <div className={`prose dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-1 prose-pre:p-2 prose-pre:bg-neutral-100 dark:prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-200 dark:prose-pre:border-neutral-800 prose-table:my-0 text-[13px] md:text-sm leading-relaxed ${msg.role === 'user' ? 'prose-p:last:mb-0 prose-p:first:mt-0' : ''}`}>
                                                <ReactMarkdown 
                                                    remarkPlugins={[remarkGfm, remarkMath]} 
                                                    rehypePlugins={[rehypeKatex, rehypeRaw]}
                                                    components={markdownComponents}
                                                >
                                                    {msg.text}
                                                </ReactMarkdown>
                                            </div>
                                            {msg.role === 'model' && (
                                                <MessageCopyButton text={msg.text || ''} />
                                            )}
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
                                if (!isThinking && lastMsg && lastMsg.role === 'model' && (lastMsg.status === 'interrupted' || lastMsg.status === 'aborted' || lastMsg.status === 'streaming' || lastMsg.status === 'pending')) {
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
                                return null;
                            })()}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Task State Display */}
                        {currentThread?.taskState && (
                            <div className="px-4 py-2 bg-blue-50/50 dark:bg-blue-900/10 border-t border-blue-100 dark:border-blue-900/30">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                        长任务进度
                                    </span>
                                    <span className="text-[10px] text-blue-500/70">
                                        {currentThread.taskState.currentStepIndex + 1} / {currentThread.taskState.plan.length}
                                    </span>
                                </div>
                                <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-1.5 mb-2 overflow-hidden">
                                    <div 
                                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                                        style={{ width: `${Math.min(100, Math.max(0, ((currentThread.taskState.currentStepIndex) / Math.max(1, currentThread.taskState.plan.length)) * 100))}%` }}
                                    />
                                </div>
                                <div className="text-[10px] text-blue-600/80 dark:text-blue-400/80 truncate">
                                    当前: {currentThread.taskState.plan[currentThread.taskState.currentStepIndex] || '完成'}
                                </div>
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="p-3 md:p-4 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800">
                            <div className="relative flex items-end gap-2 md:gap-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-1.5 md:p-2 border border-neutral-200 dark:border-neutral-700 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
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
                                    className={`flex-1 min-h-[40px] md:min-h-[44px] bg-transparent border-none focus:ring-0 resize-none py-2.5 md:py-3 px-3 md:px-4 text-[13px] md:text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 ${isInputExpanded ? 'max-h-[50vh]' : 'max-h-40'}`}
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
                                        className="w-10 h-10 md:w-11 md:h-11 shrink-0 bg-red-500 hover:bg-red-600 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-red-500/20 active:scale-95"
                                        title="停止生成"
                                    >
                                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleSend()}
                                        disabled={!inputText.trim()}
                                        className="w-10 h-10 md:w-11 md:h-11 shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-200 dark:disabled:bg-neutral-800 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                                    >
                                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
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
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
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
