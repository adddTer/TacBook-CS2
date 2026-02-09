
import React from 'react';

export interface ParseError {
    filename: string;
    error: string;
}

interface ParseErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    errors: ParseError[];
}

export const ParseErrorModal: React.FC<ParseErrorModalProps> = ({ isOpen, onClose, errors }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-500 shrink-0">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-neutral-900 dark:text-white">解析异常</h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">以下 {errors.length} 个文件无法识别或格式错误</p>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-6">
                    {errors.map((err, idx) => (
                        <div key={idx} className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-3 rounded-xl flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200 truncate" title={err.filename}>
                                    {err.filename}
                                </span>
                            </div>
                            <div className="text-[10px] text-red-500 font-mono leading-tight pl-6 break-all">
                                Error: {err.error}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="shrink-0">
                    <button 
                        onClick={onClose}
                        className="w-full py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-xl font-bold text-sm transition-colors"
                    >
                        知道了
                    </button>
                </div>
            </div>
        </div>
    );
};
