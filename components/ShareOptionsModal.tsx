
import React, { useEffect, useState } from 'react';

interface ShareOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    
    // File Actions
    onShareFile?: () => void;      // Call navigator.share with file
    onDownloadFile?: () => void;   // Trigger file download
    
    // Image Actions
    onShareImage?: () => void;     // Generate and share image
    onDownloadImage?: () => void;  // Generate and download image
    
    title?: string;
    isGenerating?: boolean;
}

export const ShareOptionsModal: React.FC<ShareOptionsModalProps> = ({
    isOpen, onClose, 
    onShareFile, onDownloadFile, 
    onShareImage, onDownloadImage,
    title = "分享与导出", isGenerating = false
}) => {
    const [canShare, setCanShare] = useState(false);

    useEffect(() => {
        // Simple check for Web Share API support
        if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
            setCanShare(true);
        } else {
            setCanShare(false);
        }
    }, []);

    if (!isOpen) return null;
    
    const hasFileActions = onShareFile || onDownloadFile;
    const hasImageActions = onShareImage || onDownloadImage;

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
                    <div className="space-y-3">
                        {/* File Section */}
                        {hasFileActions && (
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1">原始数据</div>
                                <div className="flex gap-2">
                                    {canShare && onShareFile && (
                                        <button 
                                            onClick={() => { onShareFile(); onClose(); }}
                                            className="flex-1 py-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl font-bold text-neutral-900 dark:text-white flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
                                        >
                                            <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                            <span className="text-xs">发送文件</span>
                                        </button>
                                    )}
                                    {onDownloadFile && (
                                        <button 
                                            onClick={() => { onDownloadFile(); onClose(); }}
                                            className="flex-1 py-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl font-bold text-neutral-900 dark:text-white flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
                                        >
                                            <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            <span className="text-xs">下载/保存</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Image Section */}
                        {hasImageActions && (
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1">图片快照</div>
                                <div className="flex gap-2">
                                    {canShare && onShareImage && (
                                        <button 
                                            onClick={onShareImage}
                                            className="flex-1 py-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl font-bold text-neutral-900 dark:text-white flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
                                        >
                                            <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            <span className="text-xs">发送长图</span>
                                        </button>
                                    )}
                                    {onDownloadImage && (
                                        <button 
                                            onClick={onDownloadImage}
                                            className="flex-1 py-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl font-bold text-neutral-900 dark:text-white flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
                                        >
                                            <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            <span className="text-xs">保存图片</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={onClose}
                            className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl font-bold text-sm mt-2 active:scale-95 transition-transform"
                        >
                            取消
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
