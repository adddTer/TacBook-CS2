
import React from 'react';

interface ShareOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onShareFile: () => void;
    onShareImage: () => void;
    title?: string;
    isGenerating?: boolean;
}

export const ShareOptionsModal: React.FC<ShareOptionsModalProps> = ({
    isOpen, onClose, onShareFile, onShareImage, title = "分享", isGenerating = false
}) => {
    if (!isOpen) return null;
    
    return (
        <div 
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end justify-center sm:items-center p-4 animate-in fade-in"
            onClick={!isGenerating ? onClose : undefined}
        >
            <div 
                className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-2xl p-4 shadow-2xl space-y-3 animate-in slide-in-from-bottom-10"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-center text-sm font-bold text-neutral-500 dark:text-neutral-400 mb-2">{title}</h3>
                
                {isGenerating ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-bold text-neutral-600 dark:text-neutral-300">正在生成图片...</span>
                    </div>
                ) : (
                    <>
                        <button 
                            onClick={() => { onShareFile(); onClose(); }}
                            className="w-full py-3.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl font-bold text-neutral-900 dark:text-white flex items-center justify-center gap-3 active:scale-95 transition-transform"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            分享原始文件 (.json/.tactic)
                        </button>
                        <button 
                            onClick={onShareImage}
                            className="w-full py-3.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl font-bold text-neutral-900 dark:text-white flex items-center justify-center gap-3 active:scale-95 transition-transform"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            分享长图 (.png)
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-full py-3.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl font-bold mt-2 active:scale-95 transition-transform"
                        >
                            取消
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
