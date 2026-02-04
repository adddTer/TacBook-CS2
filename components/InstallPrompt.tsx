
import React from 'react';

interface InstallPromptProps {
    isOpen: boolean;
    onClose: () => void;
    onInstall: () => void;
    isIos: boolean;
    isStandalone: boolean;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({ 
    isOpen, 
    onClose, 
    onInstall, 
    isIos,
    isStandalone
}) => {
  if (isStandalone || !isOpen) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-neutral-900/95 dark:bg-neutral-800/95 backdrop-blur-md border border-neutral-700/50 p-4 rounded-2xl shadow-2xl flex flex-col gap-3 relative ring-1 ring-white/10">
        <button 
            onClick={onClose}
            className="absolute top-2 right-2 text-neutral-400 hover:text-white p-1"
        >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            </div>
            <div>
                <h3 className="font-bold text-white text-sm">安装 TacBook</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                    {isIos ? "添加到主屏幕，体验原生 App 般的流畅。" : "一键安装到桌面，离线也能用。"}
                </p>
            </div>
        </div>

        {isIos ? (
             <div className="bg-neutral-800 rounded-lg p-3 text-xs text-neutral-300 space-y-2 border border-neutral-700">
                 <div className="flex items-center gap-2">
                    <span>1. 点击底部浏览器的</span>
                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    <span>分享按钮</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span>2. 向下滑动选择</span>
                    <span className="font-bold text-white bg-neutral-700 px-1.5 py-0.5 rounded border border-neutral-600">添加到主屏幕</span>
                 </div>
             </div>
        ) : (
            <button 
                onClick={onInstall}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-blue-600/20 active:scale-95"
            >
                立即安装
            </button>
        )}
      </div>
    </div>
  );
};
