
import React, { useState, useEffect } from 'react';
import { Theme } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: Theme;
  onThemeChange: (t: Theme) => void;
  isInstallable: boolean;
  onInstall: () => void;
  utilityViewMode: 'detail' | 'accordion';
  onUtilityViewModeChange: (mode: 'detail' | 'accordion') => void;
  onOpenGroupManager?: () => void;
  onOpenAiConfig?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onThemeChange,
  isInstallable,
  onInstall,
  utilityViewMode,
  onUtilityViewModeChange,
  onOpenGroupManager,
  onOpenAiConfig
}) => {
  const [defaultAuthor, setDefaultAuthor] = useState('');

  useEffect(() => {
      const saved = localStorage.getItem('tacbook_default_author');
      if (saved) setDefaultAuthor(saved);
  }, [isOpen]);

  const handleAuthorChange = (val: string) => {
      setDefaultAuthor(val);
      localStorage.setItem('tacbook_default_author', val);
  };

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

        {/* Data Management */}
        <div className="space-y-3">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">数据管理</label>
            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={onOpenGroupManager}
                    className="py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors flex flex-col items-center justify-center gap-1"
                >
                    <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    战术包管理
                </button>
                <button 
                    onClick={() => { if(onOpenAiConfig) onOpenAiConfig(); }}
                    className="py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors flex flex-col items-center justify-center gap-1"
                >
                    <svg className="w-5 h-5 mb-0.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    API 设置
                </button>
            </div>
        </div>

        {/* Default Author */}
        <div className="space-y-3">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">默认作者 (自动填充)</label>
            <input 
                type="text"
                value={defaultAuthor}
                onChange={(e) => handleAuthorChange(e.target.value)}
                placeholder="你的昵称..."
                className="w-full bg-neutral-100 dark:bg-neutral-800 border border-transparent focus:border-blue-500 rounded-xl p-3 text-sm dark:text-white outline-none font-bold"
            />
        </div>

        {/* Utility View Mode */}
        <div className="space-y-3">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">道具浏览方式</label>
            <div className="grid grid-cols-2 gap-2 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                <button
                    onClick={() => onUtilityViewModeChange('detail')}
                    className={`
                        py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1
                        ${utilityViewMode === 'detail' 
                            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' 
                            : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}
                    `}
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                    详情页
                </button>
                <button
                    onClick={() => onUtilityViewModeChange('accordion')}
                    className={`
                        py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1
                        ${utilityViewMode === 'accordion' 
                            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' 
                            : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}
                    `}
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    折叠展开
                </button>
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
            <p className="text-[10px] text-neutral-300">TacBook CS2 v1.3.1</p>
        </div>

      </div>
    </div>
  );
};
