
import React from 'react';
import { MapId, Side } from '../types';
import { MapSelector } from './MapSelector';
import { Switch } from './Switch';

interface HeaderProps {
  currentMapId: MapId;
  currentSide: Side;
  onMapChange: (id: MapId) => void;
  onSideChange: (side: Side) => void;
  onOpenSettings: () => void;
  viewMode: 'tactics' | 'utilities' | 'weapons' | 'tbtv';
}

export const Header: React.FC<HeaderProps> = ({ 
  currentMapId, 
  currentSide, 
  onMapChange, 
  onSideChange,
  onOpenSettings,
  viewMode
}) => {
  // Determine if we should show map and side controls
  const showControls = viewMode === 'tactics' || viewMode === 'utilities';

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-900 shadow-sm transition-colors duration-300 h-[56px] flex items-center px-4 gap-3"
    >
        {/* Logo */}
        <div className="shrink-0 flex items-center">
            <span className="font-black italic text-xl text-neutral-900 dark:text-white tracking-tighter">TacBook</span>
        </div>

        {/* Middle: Map Selector (Only for Tactics/Utils) */}
        <div className="flex-1 min-w-0 h-full flex items-center justify-center">
             {showControls ? (
                 <MapSelector currentMap={currentMapId} onChange={onMapChange} />
             ) : (
                 <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest opacity-30 select-none">
                     CS2 Tactics
                 </div>
             )}
        </div>

        {/* Right: Controls & Settings */}
        <div className="shrink-0 flex items-center gap-2">
             {showControls && (
                 <Switch side={currentSide} onChange={onSideChange} />
             )}
             
             <button 
                onClick={onOpenSettings}
                className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
             >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
             </button>
        </div>
    </header>
  );
};
