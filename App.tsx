
import React, { useState, useEffect, useMemo } from 'react';
import { TacticCard } from './components/TacticCard';
import { UtilityCard } from './components/UtilityCard';
import { Header } from './components/Header';
import { FilterPanel } from './components/FilterPanel';
import { TacticEditor } from './components/TacticEditor';
import { UtilityEditor } from './components/UtilityEditor';
import { ArsenalView } from './components/ArsenalView';
import { TBTVView } from './components/TBTVView';
import { BottomNav } from './components/BottomNav';
import { TacticDetailView } from './components/TacticDetailView';
import { useTactics } from './hooks/useTactics';
import { Side, MapId, Tactic, Tag } from './types';
import { UTILITIES } from './data/utilities';

const App: React.FC = () => {
  const [side, setSide] = useState<Side>('T');
  const [currentMap, setCurrentMap] = useState<MapId>('mirage');
  const [isDark, setIsDark] = useState(true);
  const [viewMode, setViewMode] = useState<'tactics' | 'utilities' | 'weapons' | 'tbtv'>('tactics');
  
  // Panel States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const [activeEditor, setActiveEditor] = useState<'tactic' | 'utility' | null>(null);
  const [editingTactic, setEditingTactic] = useState<Tactic | undefined>(undefined);
  const [selectedTactic, setSelectedTactic] = useState<Tactic | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Hook for Tactics filtering
  const { availableTags: tacticTags, filter, updateFilter, tactics: filteredTactics } = useTactics(currentMap, side); 

  // --- Utility Filtering Logic ---
  const utilityTags: Tag[] = useMemo(() => [
      { label: '烟雾', value: 'smoke', category: 'type' },
      { label: '闪光', value: 'flash', category: 'type' },
      { label: '燃烧', value: 'molotov', category: 'type' },
      { label: '手雷', value: 'grenade', category: 'type' },
  ], []);

  const filteredUtilities = useMemo(() => {
      return UTILITIES.filter(u => {
          if (u.mapId !== currentMap || u.side !== side) return false;
          if (filter.site !== 'All' && u.site !== filter.site) return false;
          
          if (filter.selectedTags.length > 0) {
              const selectedTypes = utilityTags
                  .filter(tag => filter.selectedTags.includes(tag.label))
                  .map(tag => tag.value);
              
              if (selectedTypes.length > 0 && !selectedTypes.includes(u.type)) return false;
          }

          if (filter.searchQuery) {
              const q = filter.searchQuery.toLowerCase();
              return u.title.toLowerCase().includes(q) || 
                     u.content.toLowerCase().includes(q) ||
                     u.id.toLowerCase().includes(q); 
          }
          return true;
      });
  }, [currentMap, side, filter, utilityTags]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  // Reset filter when switching modes
  useEffect(() => {
      updateFilter('selectedTags', []);
      updateFilter('searchQuery', '');
      setIsFilterOpen(false); // Close panel on switch
  }, [viewMode]);

  const handleToggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const handleCopyId = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAdd = () => {
      if (viewMode === 'tactics') {
          setActiveEditor('tactic');
          setEditingTactic(undefined);
      } else if (viewMode === 'utilities') {
          setActiveEditor('utility');
      }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-200 font-sans selection:bg-neutral-200 dark:selection:bg-neutral-700 pt-[100px]">
      
      <Header 
        currentMapId={currentMap}
        currentSide={side}
        onMapChange={setCurrentMap}
        onSideChange={setSide}
        toggleTheme={toggleTheme}
        isDark={isDark}
        isFilterOpen={isFilterOpen}
        toggleFilter={handleToggleFilter}
        filterActive={filter.selectedTags.length > 0 || filter.site !== 'All' || !!filter.specificRole || !!filter.onlyRecommended}
      />

      {/* Sticky Controls Container */}
      {/* top-[99px] creates a 1px overlap with the 100px fixed header to prevent gaps on some screens */}
      <div className="sticky top-[99px] z-40 w-full shadow-sm bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md transition-all">
          {/* Search Bar + Add Button */}
          {(viewMode === 'tactics' || viewMode === 'utilities') && (
            <div className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-800 flex gap-3">
                <div className="relative flex-1">
                     <svg className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                     <input 
                        type="text"
                        value={filter.searchQuery}
                        onChange={(e) => updateFilter('searchQuery', e.target.value)}
                        placeholder="搜索关键字、ID..."
                        className="w-full bg-neutral-100 dark:bg-neutral-900 border-none rounded-xl py-2 pl-9 pr-9 text-sm font-medium placeholder-neutral-400 focus:ring-2 focus:ring-blue-500/50 outline-none dark:text-white transition-all"
                     />
                     {filter.searchQuery && (
                        <button onClick={() => updateFilter('searchQuery', '')} className="absolute right-3 top-2.5 text-neutral-400">
                             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                        </button>
                     )}
                </div>
                
                {/* Editor Entry Point - Optimized UI */}
                <button
                    onClick={handleAdd}
                    className="w-9 h-9 shrink-0 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl flex items-center justify-center transition-all active:scale-95 border border-transparent hover:border-blue-200 dark:hover:border-blue-800/50"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>
          )}

        {/* Expandable Filter Panel */}
        <FilterPanel 
            isOpen={isFilterOpen}
            availableTags={viewMode === 'tactics' ? tacticTags : utilityTags}
            filterState={filter}
            onUpdate={updateFilter}
            currentSide={side}
            currentMapId={currentMap}
            viewMode={viewMode}
        />
      </div>

      <main className="px-4 pb-32 max-w-lg mx-auto pt-4">
        {/* Tactics List */}
        {viewMode === 'tactics' && (
            filteredTactics.length > 0 ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {filteredTactics.map((tactic) => (
                    <div key={tactic.id} className="relative group">
                        <button 
                            onClick={(e) => handleCopyId(e, tactic.id)}
                            className="absolute top-6 right-10 z-10 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-neutral-400 hover:text-blue-500 flex items-center gap-1 bg-white/50 dark:bg-black/50 backdrop-blur px-1.5 py-0.5 rounded"
                        >
                             {copiedId === tactic.id ? <span className="text-green-500">Copied!</span> : `#${tactic.id}`}
                             {copiedId !== tactic.id && (
                                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                 </svg>
                             )}
                        </button>
                        <TacticCard 
                            tactic={tactic} 
                            onClick={() => setSelectedTactic(tactic)}
                        />
                    </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-neutral-600">
                    <div className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-neutral-900 flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium">暂无战术</p>
                </div>
            )
        )}

        {/* Utilities List */}
        {viewMode === 'utilities' && (
             filteredUtilities.length > 0 ? (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {filteredUtilities.map((utility) => (
                        <UtilityCard key={utility.id} utility={utility} />
                    ))}
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-neutral-600">
                    <div className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-neutral-900 flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium">暂无道具</p>
                </div>
             )
        )}

        {/* Arsenal (Weapons) View */}
        {viewMode === 'weapons' && (
            <ArsenalView />
        )}

        {/* TBTV View */}
        {viewMode === 'tbtv' && (
            <TBTVView />
        )}
      </main>

      {/* Full Screen Tactic Detail View */}
      {selectedTactic && (
          <TacticDetailView 
            tactic={selectedTactic}
            onBack={() => setSelectedTactic(null)}
            highlightRole={filter.specificRole}
          />
      )}

      {/* Editor Modals */}
      {activeEditor === 'tactic' && (
          <TacticEditor 
            initialTactic={editingTactic}
            currentMapId={currentMap}
            currentSide={side}
            onCancel={() => { setActiveEditor(null); setEditingTactic(undefined); }}
          />
      )}

      {activeEditor === 'utility' && (
          <UtilityEditor
            currentMapId={currentMap}
            currentSide={side}
            onCancel={() => setActiveEditor(null)}
          />
      )}

      {/* Bottom Navigation */}
      <BottomNav currentMode={viewMode} onChange={setViewMode} />

    </div>
  );
};

export default App;
