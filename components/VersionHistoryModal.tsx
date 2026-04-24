import React, { useEffect, useState } from 'react';
import { getVersions, VersionRecord } from '../utils/versionDb';

interface VersionHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemId: string;
    currentItem: any;
    onRestore: (data: any, timestamp: number) => void;
}

const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}`;
};

const getRelativeTime = (ts: number) => {
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    return null;
};

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ isOpen, onClose, itemId, currentItem, onRestore }) => {
    const [versions, setVersions] = useState<VersionRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pendingRestore, setPendingRestore] = useState<VersionRecord | null>(null);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            getVersions(itemId).then((data) => {
                setVersions(data);
                setIsLoading(false);
            });
        }
    }, [isOpen, itemId]);

    if (!isOpen) return null;

    // Determine which version is active
    const activeVersionTs = currentItem?._restoredFromTimestamp || (versions.length > 0 ? versions[0].timestamp : null);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/60 dark:bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-2xl shadow-2xl z-10 flex flex-col max-h-[85vh] overflow-hidden border border-neutral-200 dark:border-neutral-800">
                <div className="flex justify-between items-center p-5 border-b border-neutral-100 dark:border-neutral-800/50 bg-neutral-50/50 dark:bg-neutral-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-neutral-900 dark:text-white leading-tight">版本历史与时光机</h3>
                            <p className="text-xs text-neutral-500 font-medium">随时穿梭回档，无惧修改</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:text-neutral-300 dark:hover:bg-neutral-800 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 relative">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mb-4"></div>
                            <span className="text-sm font-medium text-neutral-500">正在开启时光机...</span>
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="text-center py-12 text-neutral-500 flex flex-col items-center">
                            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                            </div>
                            <p className="font-bold mb-1">暂无历史版本记录</p>
                            <p className="text-xs">之后保存的修改都会存在这里</p>
                        </div>
                    ) : (
                        <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-[19px] before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-800">
                            {versions.map((ver, idx) => {
                                const isCurrent = ver.timestamp === activeVersionTs;
                                const isAI = ver.author.toLowerCase().includes('copilot') || ver.author.toLowerCase().includes('ai');
                                const isSystem = ver.author.toLowerCase().includes('system') || ver.author.toLowerCase().includes('系统');
                                const relTime = getRelativeTime(ver.timestamp);
                                
                                return (
                                    <div key={`${ver.timestamp}-${idx}`} className={`relative flex gap-5 group ${isCurrent ? 'opacity-100' : 'opacity-80 hover:opacity-100'} transition-opacity`}>
                                        <div className="relative z-10 flex flex-col items-center mt-1">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-white dark:border-neutral-900 ${
                                                isCurrent ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 
                                                isAI ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/50 dark:text-cyan-400' :
                                                isSystem ? 'bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400' :
                                                'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                                            }`}>
                                                {isCurrent ? (
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                ) : isAI ? (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                ) : isSystem ? (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className={`flex-1 p-4 rounded-xl border transition-all ${
                                            isCurrent ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/50' : 
                                            'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-sm'
                                        }`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-sm text-neutral-900 dark:text-white">
                                                            {ver.description || '已保存'}
                                                        </span>
                                                        {isCurrent && (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 uppercase tracking-wider">
                                                                当前版本
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                                                        <span className={`font-mono font-medium ${isAI ? 'text-cyan-600 dark:text-cyan-400' : ''}`}>{ver.author}</span>
                                                        <span>•</span>
                                                        <span>{formatTime(ver.timestamp)}</span>
                                                        {relTime && <span className="hidden sm:inline opacity-70">({relTime})</span>}
                                                    </div>
                                                </div>
                                                
                                                {!isCurrent && (
                                                    <button
                                                        onClick={() => setPendingRestore(ver)}
                                                        className="shrink-0 px-4 py-2 bg-neutral-900 hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black text-xs font-bold rounded-lg transition-transform active:scale-95 shadow-sm ml-4"
                                                    >
                                                        回档
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            
            {pendingRestore && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-neutral-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setPendingRestore(null)}>
                    <div className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col items-center text-center" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h4 className="font-bold text-neutral-900 dark:text-white mb-2 text-lg">时光机启动确认</h4>
                        <p className="text-sm text-neutral-500 mb-6">
                            恢复到此版本将覆盖当前的数据。<br/>
                            尚未保存的其他修改将会丢失！是否继续？
                        </p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setPendingRestore(null)} className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition-colors">
                                取消
                            </button>
                            <button onClick={() => { onRestore(pendingRestore.data, pendingRestore.timestamp); setPendingRestore(null); onClose(); }} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-sm shadow-red-500/20">
                                确认回档
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
