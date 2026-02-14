
import React, { useState, useEffect, useMemo } from 'react';
import { TacticCard } from './components/TacticCard';
import { UtilityCard } from './components/UtilityCard';
import { Header } from './components/Header';
import { FilterPanel } from './components/FilterPanel';
import { TacticEditor } from './components/TacticEditor';
import { UtilityEditor } from './components/UtilityEditor';
import { ReviewView } from './components/ReviewView';
import { ArsenalView } from './components/ArsenalView'; 
import { BottomNav } from './components/BottomNav';
import { TacticDetailView } from './components/TacticDetailView';
import { UtilityDetailView } from './components/UtilityDetailView';
import { InstallPrompt } from './components/InstallPrompt';
import { SettingsModal } from './components/SettingsModal';
import { GroupManagerModal } from './components/GroupManagerModal'; 
import { ConfirmModal } from './components/ConfirmModal';
import { useTactics } from './hooks/useTactics';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { useAppStorage } from './hooks/useAppStorage'; 
import { Side, MapId, Tactic, Tag, Utility, Theme } from './types';

const App: React.FC = () => {
  // --- Global App State ---
  const [side, setSide] = useState<Side>('T');
  const [currentMap, setCurrentMap] = useState<MapId>('mirage');
  const [viewMode, setViewMode] = useState<'tactics' | 'utilities' | 'weapons' | 'economy'>('tactics');
  const [theme, setTheme] = useState<Theme>('system');
  const [utilityViewMode, setUtilityViewMode] = useState<'detail' | 'accordion'>('detail');
  const [isDebug, setIsDebug] = useState(false);

  // --- Data Management Hook ---
  const { 
      groups, setGroups, activeGroupIds, setActiveGroupIds, isDataLoaded,
      allTactics, allUtilities, allMatches, allSeries, writableGroups, hasWritableGroups,
      handleSaveTactic, handleSaveUtility, handleSaveMatch, handleSaveSeries,
      deleteTactic, deleteUtility, deleteMatch, deleteSeries
  } = useAppStorage();

  // --- UI Modal States ---
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false); 
  const [activeEditor, setActiveEditor] = useState<'tactic' | 'utility' | null>(null);
  const [editingTactic, setEditingTactic] = useState<Tactic | undefined>(undefined);
  const [editingUtility, setEditingUtility] = useState<Utility | undefined>(undefined);
  const [selectedTactic, setSelectedTactic] = useState<Tactic | null>(null);
  const [selectedUtility, setSelectedUtility] = useState<Utility | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Confirm Modal
  const [confirmConfig, setConfirmConfig] = useState<{
      isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // PWA Hook
  const { isIos, isInstallable, isStandalone, showPrompt, closePrompt, handleInstall } = useInstallPrompt();

  // --- Effects ---
  
  // Load Preferences
  useEffect(() => {
    const savedUtilMode = localStorage.getItem('tacbook_utility_view_mode') as 'detail' | 'accordion';
    if (savedUtilMode) setUtilityViewMode(savedUtilMode);
    const savedTheme = localStorage.getItem('tacbook_theme') as Theme;
    if (savedTheme) setTheme(savedTheme);
    if (!!process.env.API_KEY || !!localStorage.getItem('tacbook_gemini_api_key')) setIsDebug(true);
  }, []);

  // Apply Theme
  useEffect(() => {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const applyTheme = () => {
          const isDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
          document.documentElement.classList.toggle('dark', isDark);
      };
      applyTheme();
      const listener = () => applyTheme();
      if (theme === 'system') mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  // Handle Filter Reset on Mode Switch
  useEffect(() => {
      updateFilter('selectedTags', []);
      updateFilter('searchQuery', '');
      setIsFilterOpen(false);
  }, [viewMode]);

  // --- Filtering ---
  
  // Tactics Filtering Hook
  const { availableTags: tacticTags, filter, updateFilter, tactics: filteredTactics } = useTactics(currentMap, side, allTactics); 

  // Utilities Filtering
  const utilityTags: Tag[] = useMemo(() => [
      { label: '烟雾', value: 'smoke', category: 'type' },
      { label: '闪光', value: 'flash', category: 'type' },
      { label: '燃烧', value: 'molotov', category: 'type' },
      { label: '手雷', value: 'grenade', category: 'type' },
  ], []);

  const filteredUtilities = useMemo(() => {
      return allUtilities.filter(u => {
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
              return u.title.toLowerCase().includes(q) || u.content.toLowerCase().includes(q) || u.id.toLowerCase().includes(q); 
          }
          return true;
      });
  }, [currentMap, side, filter, utilityTags, allUtilities]);

  // --- Handlers ---

  const handleUtilityViewModeChange = (mode: 'detail' | 'accordion') => {
      setUtilityViewMode(mode);
      localStorage.setItem('tacbook_utility_view_mode', mode);
  };

  const handleThemeChange = (newTheme: Theme) => {
      setTheme(newTheme);
      localStorage.setItem('tacbook_theme', newTheme);
  };

  const handleCopyId = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteTactic = (tactic: Tactic) => {
      setConfirmConfig({
          isOpen: true,
          title: "删除战术",
          message: `确定要删除战术 "${tactic.title}" 吗？`,
          onConfirm: () => {
              deleteTactic(tactic);
              setConfirmConfig(prev => ({ ...prev, isOpen: false }));
              if (selectedTactic?.id === tactic.id) setSelectedTactic(null);
          }
      });
  };

  const handleDeleteUtility = (utility: Utility) => {
      setConfirmConfig({
          isOpen: true,
          title: "删除道具",
          message: `确定要删除道具 "${utility.title}" 吗？`,
          onConfirm: () => {
              deleteUtility(utility);
              setConfirmConfig(prev => ({ ...prev, isOpen: false }));
              if (selectedUtility?.id === utility.id) setSelectedUtility(null);
          }
      });
  };

  const onSaveTacticWrapper = (t: Tactic, gid: string) => {
      handleSaveTactic(t, gid);
      setActiveEditor(null);
      setEditingTactic(undefined);
      if (selectedTactic && selectedTactic.id === t.id) setSelectedTactic({ ...t, groupId: gid });
  };

  const onSaveUtilityWrapper = (u: Utility, gid: string) => {
      handleSaveUtility(u, gid);
      setActiveEditor(null);
      setEditingUtility(undefined);
      if (selectedUtility && selectedUtility.id === u.id) setSelectedUtility({ ...u, groupId: gid });
  };

  const isItemEditable = (itemGroupId?: string) => {
      if (!itemGroupId) return false;
      const group = groups.find(g => g.metadata.id === itemGroupId);
      return group && !group.metadata.isReadOnly;
  };

  const getActiveGroupNames = () => {
      if (activeGroupIds.length === 0) return "无内容";
      if (activeGroupIds.length === 1) return groups.find(g => g.metadata.id === activeGroupIds[0])?.metadata.name || "Unknown";
      return `${activeGroupIds.length} 个组`;
  };

  const filterActive = filter.selectedTags.length > 0 || filter.site !== 'All' || !!filter.specificRole || !!filter.onlyRecommended;
  const showSearchAndFilter = viewMode === 'tactics' || viewMode === 'utilities';

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-200 font-sans selection:bg-neutral-200 dark:selection:bg-neutral-700">
      
      {/* Content Wrapper with Padding and Animation */}
      <div className="pt-[56px] animate-in fade-in duration-500">
          <Header 
            currentMapId={currentMap}
            currentSide={side}
            onMapChange={setCurrentMap}
            onSideChange={setSide}
            onOpenSettings={() => setIsSettingsOpen(true)}
            viewMode={viewMode}
            currentGroupName={getActiveGroupNames()} 
          />

          {/* Filter Bar */}
          {showSearchAndFilter && (
              <div className="sticky top-[55px] z-40 w-full shadow-sm bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md transition-all border-b border-neutral-100 dark:border-neutral-800">
                <div className="max-w-[1920px] mx-auto px-4 lg:px-8 py-2 flex gap-2">
                    <div className="relative flex-1">
                        <svg className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input 
                            type="text"
                            value={filter.searchQuery}
                            onChange={(e) => updateFilter('searchQuery', e.target.value)}
                            placeholder="搜索..."
                            className="w-full bg-neutral-100 dark:bg-neutral-900 border-none rounded-xl py-2 pl-9 pr-9 text-sm font-medium placeholder-neutral-400 focus:ring-2 focus:ring-blue-500/50 outline-none dark:text-white transition-all"
                        />
                        {filter.searchQuery && (
                            <button onClick={() => updateFilter('searchQuery', '')} className="absolute right-3 top-2.5 text-neutral-400">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                            </button>
                        )}
                    </div>
                    
                    <button 
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center transition-all relative ${isFilterOpen || filterActive ? 'bg-blue-600 text-white shadow-md' : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-500'}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                        {filterActive && !isFilterOpen && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-neutral-900"></span>}
                    </button>

                    {hasWritableGroups && (
                        <button
                            onClick={() => { setActiveEditor(viewMode === 'tactics' ? 'tactic' : 'utility'); viewMode === 'tactics' ? setEditingTactic(undefined) : setEditingUtility(undefined); }}
                            className="w-9 h-9 shrink-0 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl flex items-center justify-center transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        </button>
                    )}
                </div>

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
          )}

          {/* Main Content Area */}
          <main className="px-4 lg:px-8 pb-32 max-w-[1920px] mx-auto pt-4">
            {viewMode === 'tactics' && (
                filteredTactics.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        {filteredTactics.map((tactic) => (
                        <div key={tactic.id} className="relative group">
                            <button 
                                onClick={(e) => handleCopyId(e, tactic.id)}
                                className="absolute top-6 right-10 z-10 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-neutral-400 hover:text-blue-500 flex items-center gap-1 bg-white/50 dark:bg-black/50 backdrop-blur px-1.5 py-0.5 rounded"
                            >
                                {copiedId === tactic.id ? <span className="text-green-500">Copied!</span> : `#${tactic.id}`}
                            </button>
                            <TacticCard tactic={tactic} onClick={() => setSelectedTactic(tactic)} />
                        </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-neutral-600">
                        <div className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-neutral-900 flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </div>
                        <p className="text-sm font-medium">{isDataLoaded ? `暂无战术` : '加载中...'}</p>
                    </div>
                )
            )}

            {viewMode === 'utilities' && (
                filteredUtilities.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        {filteredUtilities.map((utility) => (
                            <UtilityCard 
                                key={utility.id} 
                                utility={utility} 
                                viewMode={utilityViewMode}
                                onClick={() => setSelectedUtility(utility)}
                                onEdit={isItemEditable(utility.groupId) ? () => { setEditingUtility(utility); setActiveEditor('utility'); } : undefined}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-neutral-600">
                        <p className="text-sm font-medium">{isDataLoaded ? `暂无道具` : '加载中...'}</p>
                    </div>
                )
            )}

            {viewMode === 'weapons' && (
                <div className="max-w-[1920px] mx-auto">
                    <ReviewView 
                        allMatches={allMatches}
                        allSeries={allSeries}
                        onSaveMatch={handleSaveMatch}
                        onSaveSeries={handleSaveSeries}
                        onDeleteMatch={deleteMatch}
                        onDeleteSeries={deleteSeries}
                        writableGroups={writableGroups}
                    />
                </div>
            )}
            
            {viewMode === 'economy' && <div className="max-w-[1920px] mx-auto"><ArsenalView /></div>}
          </main>
      </div>

      {/* Detail Views & Editors (Outside padded wrapper to handle Fixed positioning correctly) */}
      {selectedTactic && (
          <TacticDetailView 
            tactic={selectedTactic}
            onBack={() => setSelectedTactic(null)}
            highlightRole={filter.specificRole}
            onEdit={isItemEditable(selectedTactic.groupId) ? () => { setEditingTactic(selectedTactic); setActiveEditor('tactic'); } : undefined}
            onDelete={isItemEditable(selectedTactic.groupId) ? () => handleDeleteTactic(selectedTactic) : undefined}
          />
      )}
      {selectedUtility && (
          <UtilityDetailView
            utility={selectedUtility}
            allUtilities={allUtilities}
            onBack={() => setSelectedUtility(null)}
            onSelectSibling={(sibling) => setSelectedUtility(sibling)}
            onEdit={isItemEditable(selectedUtility.groupId) ? () => { setEditingUtility(selectedUtility); setActiveEditor('utility'); } : undefined}
            onDelete={isItemEditable(selectedUtility.groupId) ? () => handleDeleteUtility(selectedUtility) : undefined}
          />
      )}
      {activeEditor === 'tactic' && (
          <TacticEditor 
            initialTactic={editingTactic}
            currentMapId={currentMap}
            currentSide={side}
            onCancel={() => { setActiveEditor(null); setEditingTactic(undefined); }}
            onSave={onSaveTacticWrapper}
            writableGroups={writableGroups}
          />
      )}
      {activeEditor === 'utility' && (
          <UtilityEditor
            initialUtility={editingUtility}
            currentMapId={currentMap}
            currentSide={side}
            onCancel={() => { setActiveEditor(null); setEditingUtility(undefined); }}
            onSave={onSaveUtilityWrapper}
            writableGroups={writableGroups}
          />
      )}
      
      {/* Modals */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={theme}
        onThemeChange={handleThemeChange}
        isInstallable={isInstallable && !isStandalone}
        onInstall={handleInstall}
        utilityViewMode={utilityViewMode}
        onUtilityViewModeChange={handleUtilityViewModeChange}
        onOpenGroupManager={() => { setIsSettingsOpen(false); setIsGroupManagerOpen(true); }}
      />
      <GroupManagerModal 
        isOpen={isGroupManagerOpen}
        onClose={() => setIsGroupManagerOpen(false)}
        groups={groups}
        setGroups={setGroups}
        activeGroupIds={activeGroupIds}
        onToggleGroup={(id) => setActiveGroupIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])}
        isDebug={isDebug}
      />
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        isDangerous={true}
      />
      <InstallPrompt isOpen={showPrompt} onClose={closePrompt} onInstall={handleInstall} isIos={isIos} isStandalone={isStandalone} />
      
      <BottomNav currentMode={viewMode} onChange={setViewMode} />
    </div>
  );
};

export default App;
