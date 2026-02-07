
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Tactic } from '../../types';
import { chatWithTacticCopilot } from '../../services/ai/agents/tacticAgent';
import { ChatMessage, TacticAgentResponse } from '../../services/ai/types';
import { getApiKey, getSelectedModel } from '../../services/ai/config';

interface ExtendedChatMessage extends ChatMessage {
    snapshot?: Partial<Tactic>;
    changedFields?: string[];
    isError?: boolean;
    reasoning?: string; // Extracted reasoning content
    displayText?: string; // Text to show (minus reasoning)
}

interface CopilotChatProps {
    currentTactic: Partial<Tactic>;
    onApplySnapshot: (snapshot: Partial<Tactic>) => void;
    onUpdateTactic: (newTactic: Partial<Tactic>) => void;
    onOpenConfig: () => void;
    onClose?: () => void; // For desktop sidebar close
    isMaximized?: boolean;
    onToggleMaximize?: () => void;
}

// Helper to parse content with <think> tags
const parseThinkingContent = (raw: string): { reasoning: string, content: string } => {
    const thinkMatch = raw.match(/<think>([\s\S]*?)<\/think>/);
    const thinkOpenMatch = raw.match(/<think>([\s\S]*)$/); // Handle open tag stream

    let reasoning = "";
    let content = raw;

    if (thinkMatch) {
        reasoning = thinkMatch[1];
        content = raw.replace(thinkMatch[0], "");
    } else if (thinkOpenMatch) {
        reasoning = thinkOpenMatch[1];
        content = raw.replace(thinkOpenMatch[0], "");
    }
    
    // Also try to clean JSON blocks from display text if they are huge
    // content = content.replace(/```json[\s\S]*?```/g, "[建议修改已生成，请查看下方快照]");

    return { reasoning: reasoning.trim(), content: content.trim() };
};

export const CopilotChat: React.FC<CopilotChatProps> = ({ 
    currentTactic, 
    onApplySnapshot, 
    onUpdateTactic,
    onOpenConfig,
    onClose,
    isMaximized,
    onToggleMaximize
}) => {
    const [chatHistory, setChatHistory] = useState<ExtendedChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll (only if near bottom or streaming)
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, isAiLoading]);

    // Auto-focus on mount
    useEffect(() => {
        if(inputRef.current) inputRef.current.focus();
    }, []);

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;
        if (!getApiKey()) {
            onOpenConfig();
            return;
        }

        const userText = chatInput;
        const userMsg: ExtendedChatMessage = { role: 'user', text: userText, displayText: userText };
        
        setChatHistory(prev => [...prev, userMsg]);
        setChatInput('');
        setIsAiLoading(true);

        // Placeholder for AI message
        const aiMsgId = Date.now();
        setChatHistory(prev => [...prev, { role: 'model', text: '', displayText: '', reasoning: '' }]);

        try {
            const apiHistory: ChatMessage[] = chatHistory.map(m => ({ role: m.role, text: m.text }));
            
            // Callback for streaming updates
            const onStreamUpdate = (fullText: string) => {
                 setChatHistory(prev => {
                     const newHistory = [...prev];
                     const lastMsg = newHistory[newHistory.length - 1];
                     if (lastMsg.role === 'model') {
                         const parsed = parseThinkingContent(fullText);
                         lastMsg.text = fullText;
                         lastMsg.reasoning = parsed.reasoning;
                         lastMsg.displayText = parsed.content;
                     }
                     return newHistory;
                 });
            };

            const result: TacticAgentResponse = await chatWithTacticCopilot(apiHistory, currentTactic, userText, onStreamUpdate);
            
            // Finalize message with structured data if available
            setChatHistory(prev => {
                const newHistory = [...prev];
                const lastMsg = newHistory[newHistory.length - 1];
                if (lastMsg.role === 'model') {
                    // Re-parse final text to ensure everything is clean
                    const parsed = parseThinkingContent(lastMsg.text);
                    // If the model returned a specific "reply" field in JSON, use that, otherwise use streamed text
                    const finalDisplay = result.reply && result.reply.length < lastMsg.text.length ? result.reply : parsed.content;

                    lastMsg.displayText = finalDisplay;
                    lastMsg.reasoning = result.reasoning || parsed.reasoning;

                    if (result.modifiedTactic) {
                        const diff: string[] = [];
                        if (result.modifiedTactic.title !== currentTactic.title) diff.push('标题');
                        if (JSON.stringify(result.modifiedTactic.actions) !== JSON.stringify(currentTactic.actions)) diff.push('步骤');
                        if (JSON.stringify(result.modifiedTactic.loadout) !== JSON.stringify(currentTactic.loadout)) diff.push('配装');
                        
                        lastMsg.snapshot = result.modifiedTactic;
                        lastMsg.changedFields = diff;
                        
                        // Auto-update parent state
                        onUpdateTactic(result.modifiedTactic);
                    }
                }
                return newHistory;
            });

        } catch (error: any) {
            console.error("Copilot Error:", error);
            const errorMsg = error.message || "请求失败，请检查网络或配置";
            setChatHistory(prev => {
                 const newHistory = [...prev];
                 const lastMsg = newHistory[newHistory.length - 1];
                 lastMsg.text = `出错啦: ${errorMsg}`;
                 lastMsg.displayText = `出错啦: ${errorMsg}`;
                 lastMsg.isError = true;
                 return newHistory;
            });
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <div className={`flex flex-col h-full bg-neutral-50 dark:bg-neutral-950 shadow-xl transition-all duration-300 ${isMaximized ? 'fixed inset-0 z-[200]' : 'border-l border-neutral-200 dark:border-neutral-800'}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-neutral-900 dark:text-white">TacBook Copilot</h3>
                        <p className="text-[10px] text-neutral-400">{getSelectedModel()}</p>
                    </div>
                </div>
                <div className="flex gap-1">
                     {onToggleMaximize && (
                        <button onClick={onToggleMaximize} className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 hidden md:block">
                            {isMaximized ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0l5 0M4 4l0 5M15 15l5 5m0 0l-5 0m5 0l0-5" /></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                            )}
                        </button>
                    )}
                    <button onClick={onOpenConfig} className="p-2 text-neutral-400 hover:text-purple-600 transition-colors rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-6">
                {/* Empty State */}
                {chatHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4 opacity-60">
                        <div className="bg-neutral-100 dark:bg-neutral-900 p-4 rounded-full mb-4">
                            <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        </div>
                        <p className="text-sm text-neutral-500 max-w-xs">
                            试着问："这局是经济局，帮我设计一个A区快攻战术" 或 "给狙击手配一颗过点烟"。
                        </p>
                    </div>
                )}

                {/* Message List - Information Flow Style */}
                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-neutral-200 dark:bg-neutral-800' : 'bg-purple-600 text-white'}`}>
                            {msg.role === 'user' ? (
                                <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            )}
                        </div>

                        {/* Content */}
                        <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            {/* Reasoning Block (For Thinking Models) */}
                            {msg.reasoning && (
                                <details className="w-full mb-1 group" open>
                                    <summary className="text-[10px] text-neutral-400 cursor-pointer list-none font-bold flex items-center gap-1 select-none hover:text-purple-500 transition-colors">
                                        <span className="group-open:rotate-90 transition-transform">▸</span> 深度思考 (Chain of Thought)
                                    </summary>
                                    <div className="mt-2 pl-3 border-l-2 border-purple-200 dark:border-purple-900/50 text-xs text-neutral-500 dark:text-neutral-400 italic leading-relaxed">
                                        {msg.reasoning}
                                        {/* Typing cursor for reasoning if it's the last message and loading */}
                                        {isAiLoading && i === chatHistory.length - 1 && !msg.displayText && (
                                            <span className="inline-block w-1.5 h-3 ml-1 bg-purple-400 animate-pulse align-middle"></span>
                                        )}
                                    </div>
                                </details>
                            )}

                            {/* Main Text Body */}
                            {(msg.displayText || msg.isError) && (
                                <div className={`text-sm leading-7 ${msg.role === 'user' ? 'bg-neutral-100 dark:bg-neutral-800 px-4 py-2 rounded-2xl rounded-tr-none' : 'text-neutral-900 dark:text-neutral-100'}`}>
                                    {msg.isError ? (
                                        <span className="text-red-500">{msg.displayText}</span>
                                    ) : (
                                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.displayText}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Loading Indicator (if no text yet) */}
                            {isAiLoading && i === chatHistory.length - 1 && !msg.displayText && !msg.reasoning && (
                                <div className="flex gap-1 py-2">
                                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce delay-75"></div>
                                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce delay-150"></div>
                                </div>
                            )}
                            
                            {/* Snapshot Card */}
                            {msg.snapshot && (
                                <div className="w-full mt-1 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/50 rounded-xl p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            建议修改:
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {msg.changedFields?.map(f => (
                                            <span key={f} className="text-[10px] bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 shadow-sm">
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                    <button 
                                        onClick={() => onApplySnapshot(msg.snapshot!)}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 rounded-lg transition-colors shadow-sm active:scale-[0.98]"
                                    >
                                        恢复此版本
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-white/80 dark:bg-neutral-950/80 backdrop-blur border-t border-neutral-200 dark:border-neutral-800">
                <div className="relative flex items-end gap-2 bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-2 border border-transparent focus-within:border-purple-500/50 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all shadow-inner">
                    <textarea 
                        ref={inputRef}
                        rows={1}
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (!isAiLoading) handleSendMessage();
                            }
                        }}
                        placeholder="输入指令..."
                        className="flex-1 bg-transparent border-none py-2 px-3 text-sm resize-none focus:ring-0 outline-none dark:text-white max-h-32"
                        disabled={isAiLoading}
                        style={{ minHeight: '24px' }}
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim() || isAiLoading}
                        className="p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 transition-colors shadow-sm mb-0.5"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
