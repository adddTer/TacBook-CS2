
import React from 'react';
import { MapId, Side } from '../types';
import { MapSelector } from './MapSelector';
import { Switch } from './Switch';

interface HeaderProps {
  currentMapId: MapId;
  currentSide: Side;
  onMapChange: (id: MapId) => void;
  onSideChange: (side: Side) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isFilterOpen: boolean;
  toggleFilter: () => void;
  filterActive: boolean;
  onAdd?: () => void; 
}

export const Header: React.FC<HeaderProps> = ({ 
  currentMapId, 
  currentSide, 
  onMapChange, 
  onSideChange,
  toggleTheme,
  isDark,
  isFilterOpen,
  toggleFilter,
  filterActive,
}) => {
  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-900 shadow-sm transition-colors duration-300"
    >
      {/* Row 1: Logo & Global Controls (Height 50px) */}
      <div className="h-[50px] flex items-center justify-between px-4">
        
        {/* Logo */}
        <div className="flex items-center gap-2">
            <span className="font-black italic text-xl text-neutral-900 dark:text-white tracking-tighter">TacBook</span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
             <Switch side={currentSide} onChange={onSideChange} />
             
             <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-800 mx-1"></div>

             <button 
                onClick={toggleTheme}
                className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
             >
                 {isDark ? (
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                 ) : (
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                 )}
            </button>

            <button 
                onClick={toggleFilter}
                className={`
                    p-2 rounded-lg transition-all relative
                    ${isFilterOpen || filterActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                        : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}
                `}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {filterActive && !isFilterOpen && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-neutral-900"></span>
                )}
            </button>
        </div>
      </div>

      {/* Row 2: Map Selector (Height 50px) */}
      <div className="h-[50px] flex items-center">
         <MapSelector currentMap={currentMapId} onChange={onMapChange} />
      </div>
    </header>
  );
};
