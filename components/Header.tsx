
import React, { useState } from 'react';
import { MapId, Side, MapInfo } from '../types';
import { MAPS } from '../constants';
import { MapSelector } from './MapSelector';
import { Switch } from './Switch';

interface HeaderProps {
  currentMapId: MapId;
  currentSide: Side;
  onMapChange: (id: MapId) => void;
  onSideChange: (side: Side) => void;
  toggleTheme: () => void;
  isDark: boolean;
  searchQuery: string;
  onSearchUpdate: (q: string) => void;
  viewMode: 'tactics' | 'utilities' | 'weapons' | 'tbtv';
  isFilterOpen: boolean;
  toggleFilter: () => void;
  isSettingsOpen: boolean;
  toggleSettings: () => void;
  onCreateTactic: () => void;
  onCreateUtility: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentMapId, 
  currentSide, 
  onMapChange, 
  onSideChange,
  toggleTheme,
  isDark,
  searchQuery,
  onSearchUpdate,
  viewMode,
  isFilterOpen,
  toggleFilter,
  isSettingsOpen,
  toggleSettings,
  onCreateTactic,
  onCreateUtility
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const currentMap = MAPS.find(m => m.id === currentMapId) || MAPS[0];

  const getPlaceholder = () => {
      if (viewMode === 'tactics') return "搜索战术...";
      if (viewMode === 'utilities') return "搜索道具...";
      if (viewMode === 'weapons') return "搜索武器...";
      return "搜索比赛/队员...";
  };

  return (
    <header 
      className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] border-b
        ${isSettingsOpen 
          ? 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-xl' 
          : 'bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-neutral-200 dark:border-neutral-900 shadow-sm h-[60px]'}
      `}
    >
      {/* 1. Main Bar */}
      <div className="h-[60px] flex items-center justify-between px-3 gap-3">
        
        {/* Logo Title (Animated) */}
        <div className={`
            shrink-0 flex items-center overflow-hidden whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] origin-left
            ${isSearchFocused ? 'w-0 opacity-0 -mr-2 scale-x-90' : 'w-[80px] opacity-100 scale-x-100'}
        `}>
            <span className="font-black italic text-lg text-neutral-900 dark:text-white tracking-tighter">TacBook</span>
        </div>

        {/* Search Input (Expandable) */}
        {viewMode !== 'weapons' && viewMode !== 'tbtv' ? (
            <div className="flex-1 relative group transition-all duration-300">
                {/* Map Context Badge */}
                <div className="absolute inset-y-0 left-1.5 flex items-center pointer-events-none z-10">
                    <div className={`
                        flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-200/50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50 backdrop-blur-sm transition-all duration-200
                        ${isSearchFocused || searchQuery ? 'opacity-30 grayscale' : 'opacity-100'}
                    `}>
                        <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300 whitespace-nowrap">{currentMap.name}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${currentSide === 'T' ? 'bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]' : 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]'}`}></div>
                    </div>
                </div>

                <input
                    type="text"
                    value={searchQuery}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    onChange={(e) => onSearchUpdate(e.target.value)}
                    placeholder={isSearchFocused ? getPlaceholder() : ""} 
                    className={`
                        block w-full py-2 bg-neutral-100 dark:bg-neutral-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all font-medium
                        pl-[90px] /* Reserve space for badge */
                    `}
                />
                
                {/* Clear Button */}
                {searchQuery && (
                    <button 
                        onClick={() => onSearchUpdate('')}
                        className="absolute inset-y-0 right-2 flex items-center text-neutral-400 hover:text-neutral-600"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    </button>
                )}
            </div>
        ) : (
             <div className="flex-1 flex items-center justify-center text-sm font-bold text-neutral-400">
                {viewMode === 'tbtv' ? 'Team Battle TV' : '武器装备库'}
            </div>
        )}

        {/* Action Icons */}
        <div className="flex items-center gap-1 shrink-0">
            {/* Filter Toggle */}
            <button 
                onClick={toggleFilter}
                className={`
                    p-2 rounded-xl transition-all active:scale-95 relative
                    ${isFilterOpen 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}
                `}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
            </button>

            {/* Settings Toggle */}
            <button 
                onClick={toggleSettings}
                className={`
                    p-2 rounded-xl transition-all active:scale-95 relative
                    ${isSettingsOpen
                        ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black rotate-90' 
                        : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}
                `}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
            </button>
        </div>
      </div>

      {/* 2. Expanded Settings Panel */}
      <div 
        className={`
            overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
            ${isSettingsOpen ? 'max-h-[400px] opacity-100 border-t border-neutral-100 dark:border-neutral-800' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="p-4 space-y-5">
            {/* Row 1: Map Selector */}
            <div>
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1">选择地图</div>
                <MapSelector currentMap={currentMapId} onChange={onMapChange} />
            </div>

            {/* Row 2: Side & Actions */}
            <div className="flex items-center justify-between gap-4">
                 <div className="flex items-center gap-4">
                    <Switch side={currentSide} onChange={onSideChange} />
                    <button 
                        onClick={toggleTheme}
                        className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-600 dark:text-neutral-400"
                    >
                         {isDark ? (
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                         ) : (
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                         )}
                    </button>
                 </div>
            </div>

            {/* Row 3: Editor Entry Points */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                <button 
                    onClick={onCreateTactic}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                >
                    <span className="text-lg">+</span> 新建战术
                </button>
                <button 
                    onClick={onCreateUtility}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                >
                    <span className="text-lg">+</span> 新建道具
                </button>
            </div>
        </div>
      </div>
    </header>
  );
};
