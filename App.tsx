
import React, { useState, useEffect, useMemo } from 'react';
import { TacticCard } from './components/TacticCard';
import { UtilityCard } from './components/UtilityCard';
import { Header } from './components/Header';
import { FilterPanel } from './components/FilterPanel';
import { TacticEditor } from './components/TacticEditor';
import { UtilityEditor } from './components/UtilityEditor';
import { ArsenalView } from './components/ArsenalView';
import { useTactics } from './hooks/useTactics';
import { Side, MapId, Tactic, Tag } from './types';
import { UTILITIES } from './data/utilities';

const App: React.FC = () => {
  const [side, setSide] = useState<Side>('T');
  const [currentMap, setCurrentMap] = useState<MapId>('mirage');
  const [isDark, setIsDark] = useState(true);
  const [viewMode, setViewMode] = useState<'tactics' | 'utilities' | 'weapons'>('tactics');
  
  // Panel States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [activeEditor, setActiveEditor] = useState<'tactic' | 'utility' | null>(null);
  const [editingTactic, setEditingTactic] = useState<Tactic | undefined>(undefined);

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
  }, [viewMode]);

  // Mutual exclusion handlers
  const handleToggleFilter = () => {
    if (!isFilterOpen) {
      setIsSettingsOpen(false);
    }
    setIsFilterOpen(!isFilterOpen);
  };

  const handleToggleSettings = () => {
    if (!isSettingsOpen) {
      setIsFilterOpen(false);
    }
    setIsSettingsOpen(!isSettingsOpen);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-200 font-sans selection:bg-neutral-200 dark:selection:bg-neutral-700 pt-[60px]">
      
      <Header 
        currentMapId={currentMap}
        currentSide={side}
        onMapChange={setCurrentMap}
        onSideChange={setSide}
        toggleTheme={toggleTheme}
        isDark={isDark}
        searchQuery={filter.searchQuery}
        onSearchUpdate={(val) => updateFilter('searchQuery', val)}
        viewMode={viewMode}
        isFilterOpen={isFilterOpen}
        toggleFilter={handleToggleFilter}
        isSettingsOpen={isSettingsOpen}
        toggleSettings={handleToggleSettings}
        onCreateTactic={() => { setEditingTactic(undefined); setActiveEditor('tactic'); }}
        onCreateUtility={() => setActiveEditor('utility')}
      />

      {/* Sticky Filter Panel - sits just below the fixed header */}
      <div className="sticky top-[60px] z-40 w-full shadow-sm">
        <FilterPanel 
            isOpen={isFilterOpen}
            availableTags={viewMode === 'tactics' ? tacticTags : utilityTags}
            filterState={filter}
            onUpdate={updateFilter}
            currentSide={side}
            currentMapId={currentMap}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
        />
      </div>

      <main className="px-4 pb-32 max-w-lg mx-auto pt-4">
        {/* Tactics List */}
        {viewMode === 'tactics' && (
            filteredTactics.length > 0 ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {filteredTactics.map((tactic) => (
                    <div key={tactic.id} className="relative group">
                        <div className="absolute top-6 right-14 z-10 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-neutral-400">
                             #{tactic.id}
                        </div>
                        <TacticCard 
                            tactic={tactic} 
                            highlightRole={filter.specificRole}
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
      </main>

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

    </div>
  );
};

export default App;
