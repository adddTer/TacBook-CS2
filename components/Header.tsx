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
  viewMode: 'tactics' | 'utilities';
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
            ${isSearchFocused ? 'w-0 opacity-0 -mr-2 scale-x-90' : 'w-[110px] opacity-100 scale-x-100'}
        `}>
            <span className="font-black italic text-lg text-neutral-900 dark:text-white tracking-tighter">TacBook CS2</span>
        </div>

        {/* Search Input (Expandable) */}
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
                placeholder={isSearchFocused ? (viewMode === 'tactics' ? "搜索战术..." : "搜索道具...") : ""} 
                className={`
                    block w-full py-2 bg-neutral-100 dark:bg-neutral-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all font-medium
                    pl-[90px] /* Reserve space for badge */
                `}
            />
            
            {/* Clear Button (only when has query) */}
            {searchQuery && (
                <button 
                    onClick={() => onSearchUpdate('')}
                    className="absolute inset-y-0 right-2 flex items-center text-neutral-400 hover:text-neutral-600"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                </button>
            )}
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1 shrink-0">
            {/* Filter Toggle */}
            <button 
                onClick={toggleFilter}
                className={`
                    p-2 rounded-xl transition-all active:scale-95 relative
                    ${isFilterOpen 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : 'bg-transparent text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}
                `}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
            </button>

            {/* Settings/Menu Toggle */}
            <button 
                onClick={toggleSettings}
                className={`
                    p-2 rounded-xl transition-all active:scale-95
                    ${isSettingsOpen
                        ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white' 
                        : 'bg-transparent text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}
                `}
            >
                 <svg 
                    className={`w-5 h-5 transition-transform duration-300 ${isSettingsOpen ? 'rotate-180' : ''}`} 
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                 >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                 </svg>
            </button>
        </div>
      </div>

      {/* 2. Expanded Control Panel (Settings + Create) */}
      <div 
        className={`
            overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
            ${isSettingsOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="pb-4 space-y-4">
            
            {/* Map Selector */}
            <div className="pt-2">
                <MapSelector currentMap={currentMapId} onChange={onMapChange} />
            </div>

            {/* Bottom Row: Controls */}
            <div className="px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">阵营</span>
                    <Switch side={currentSide} onChange={onSideChange} />
                </div>
                
                <button 
                    onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-xs font-bold text-neutral-600 dark:text-neutral-300"
                >
                    {isDark ? '🌙 Dark' : '☀️ Light'}
                </button>
            </div>

            {/* Create Actions */}
            <div className="px-4 pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800 flex gap-2">
                <button 
                    onClick={() => { toggleSettings(); onCreateTactic(); }}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20 text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    新建战术
                </button>
                <button 
                    onClick={() => { toggleSettings(); onCreateUtility(); }}
                    className="flex-1 py-2.5 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 hover:bg-purple-600/20 text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    新建道具
                </button>
            </div>
            
            <div className="h-2"></div>
        </div>
      </div>
    </header>
  );
};