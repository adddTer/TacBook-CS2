
import React from 'react';
import { Theme } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: Theme;
  onThemeChange: (t: Theme) => void;
  isInstallable: boolean;
  onInstall: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onThemeChange,
  isInstallable,
  onInstall
}) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-neutral-900 w-full max-w-xs rounded-2xl p-5 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <h3 className="font-bold text-lg text-neutral-900 dark:text-white">设置</h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Theme Selector */}
        <div className="space-y-3">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">外观模式</label>
            <div className="grid grid-cols-3 gap-2 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                {(['light', 'system', 'dark'] as const).map(theme => (
                    <button
                        key={theme}
                        onClick={() => onThemeChange(theme)}
                        className={`
                            py-2 rounded-lg text-xs font-bold transition-all capitalize
                            ${currentTheme === theme 
                                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' 
                                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}
                        `}
                    >
                        {theme === 'system' ? '系统' : theme === 'light' ? '浅色' : '深色'}
                    </button>
                ))}
            </div>
        </div>

        {/* Install Button (If applicable) */}
        {isInstallable && (
            <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">应用安装</label>
                <button
                    onClick={() => { onInstall(); onClose(); }}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    添加到桌面
                </button>
                <p className="text-[10px] text-neutral-400 text-center">获得更流畅的全屏体验</p>
            </div>
        )}
        
        <div className="pt-4 text-center">
            <p className="text-[10px] text-neutral-300">TacBook CS2 v1.0.0</p>
        </div>

      </div>
    </div>
  );
};
