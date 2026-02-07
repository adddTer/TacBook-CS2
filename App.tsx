
import React, { useState, useEffect, useMemo } from 'react';
import { TacticCard } from './components/TacticCard';
import { UtilityCard } from './components/UtilityCard';
import { Header } from './components/Header';
import { FilterPanel } from './components/FilterPanel';
import { TacticEditor } from './components/TacticEditor';
import { UtilityEditor } from './components/UtilityEditor';
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
import { Side, MapId, Tactic, Tag, Utility, Theme, ContentGroup } from './types';
import { generateGroupId } from './utils/idGenerator';

const App: React.FC = () => {
  const [side, setSide] = useState<Side>('T');
  const [currentMap, setCurrentMap] = useState<MapId>('mirage');
  const [viewMode, setViewMode] = useState<'tactics' | 'utilities' | 'weapons'>('tactics');
  
  // Theme State
  const [theme, setTheme] = useState<Theme>('system');
  
  // Settings State
  const [utilityViewMode, setUtilityViewMode] = useState<'detail' | 'accordion'>('detail');

  // Debug / Edit Mode State
  const [isDebug, setIsDebug] = useState(false);

  // --- Group Data State ---
  const [groups, setGroups] = useState<ContentGroup[]>([]);
  const [activeGroupIds, setActiveGroupIds] = useState<string[]>([]); 
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Confirm Modal State for App-level actions (Deleting items)
  const [confirmConfig, setConfirmConfig] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  
  // Computed: Data for display (Aggregated from all active groups)
  const { allTactics, allUtilities } = useMemo(() => {
      const activeGroups = groups.filter(g => activeGroupIds.includes(g.metadata.id));
      const tactics = activeGroups.flatMap(g => g.tactics);
      const utilities = activeGroups.flatMap(g => g.utilities);
      return { allTactics: tactics, allUtilities: utilities };
  }, [groups, activeGroupIds]);

  // Computed: Check if ANY writable group exists (for showing Add button)
  const hasWritableGroups = useMemo(() => {
      return groups.some(g => !g.metadata.isReadOnly);
  }, [groups]);

  // Computed: List of groups available for saving (for Editor dropdown)
  const writableGroups = useMemo(() => {
      return groups.filter(g => !g.metadata.isReadOnly);
  }, [groups]);

  // UI States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false); 
  
  const [activeEditor, setActiveEditor] = useState<'tactic' | 'utility' | null>(null);
  const [editingTactic, setEditingTactic] = useState<Tactic | undefined>(undefined);
  const [editingUtility, setEditingUtility] = useState<Utility | undefined>(undefined);
  
  // Selection State
  const [selectedTactic, setSelectedTactic] = useState<Tactic | null>(null);
  const [selectedUtility, setSelectedUtility] = useState<Utility | null>(null);
  
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // PWA Install Hook
  const { isIos, isInstallable, isStandalone, showPrompt, setShowPrompt, handleInstall, closePrompt } = useInstallPrompt();

  // --- Initialization & Persistence ---

  useEffect(() => {
    const initData = async () => {
        // 1. Try load groups from localStorage
        const savedGroupsStr = localStorage.getItem('tacbook_groups');
        const savedActiveIdsStr = localStorage.getItem('tacbook_active_group_ids');
        
        let hasLoadedGroups = false;
        if (savedGroupsStr) {
            try {
                const parsedGroups = JSON.parse(savedGroupsStr);
                if (Array.isArray(parsedGroups) && parsedGroups.length > 0) {
                    setGroups(parsedGroups);
                    hasLoadedGroups = true;
                }
            } catch (e) {
                console.error("Failed to load saved groups", e);
            }
        } 
        
        // 2. Load Active IDs if groups loaded successfully
        if (savedActiveIdsStr && hasLoadedGroups) {
            try {
                const parsedIds = JSON.parse(savedActiveIdsStr);
                if (Array.isArray(parsedIds)) setActiveGroupIds(parsedIds);
            } catch(e) {}
        }

        // 3. Only if NO groups exist (First run or wiped), create a FRESH Default group
        if (!hasLoadedGroups) {
            const defaultId = generateGroupId(); 

            const defaultGroup: ContentGroup = {
                metadata: {
                    id: defaultId,
                    name: '默认',
                    description: '', 
                    version: 1,
                    isReadOnly: false,
                    author: 'User',
                    lastUpdated: Date.now()
                },
                tactics: [], // Empty as requested
                utilities: [], // Empty as requested
            };
            setGroups([defaultGroup]);
            setActiveGroupIds([defaultId]);
        } else if (activeGroupIds.length === 0 && hasLoadedGroups) {
             // If we have groups but none active, try to select the first one
             if (savedGroupsStr) { 
                 const parsed = JSON.parse(savedGroupsStr);
                 if (parsed[0]) setActiveGroupIds([parsed[0].metadata.id]);
             }
        }

        setIsDataLoaded(true);
    };
    initData();

    // Load Preferences
    const savedUtilMode = localStorage.getItem('tacbook_utility_view_mode') as 'detail' | 'accordion';
    if (savedUtilMode) setUtilityViewMode(savedUtilMode);
    
    const savedTheme = localStorage.getItem('tacbook_theme') as Theme;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  // Persist Groups
  useEffect(() => {
      if (isDataLoaded && groups.length > 0) {
          localStorage.setItem('tacbook_groups', JSON.stringify(groups));
      }
  }, [groups, isDataLoaded]);

  // Persist Active Group IDs (and sync cleanup)
  useEffect(() => {
      // FIX: Only save if data is loaded AND we have groups. 
      // Prevents overwriting valid IDs with [] during initial load.
      if (isDataLoaded && groups.length > 0) {
          // Verify all active IDs actually exist in groups
          const existingIds = groups.map(g => g.metadata.id);
          const validActiveIds = activeGroupIds.filter(id => existingIds.includes(id));
          
          // Only update if there's a difference to prevent loops, though React does this shallowly anyway
          if (validActiveIds.length !== activeGroupIds.length) {
              setActiveGroupIds(validActiveIds);
          } else {
              localStorage.setItem('tacbook_active_group_ids', JSON.stringify(activeGroupIds));
          }
      }
  }, [activeGroupIds, groups, isDataLoaded]);

  // Save Preferences
  const handleUtilityViewModeChange = (mode: 'detail' | 'accordion') => {
      setUtilityViewMode(mode);
      localStorage.setItem('tacbook_utility_view_mode', mode);
  };

  const handleThemeChange = (newTheme: Theme) => {
      setTheme(newTheme);
      localStorage.setItem('tacbook_theme', newTheme);
  };

  // Check for Debug Mode (API Key presence)
  useEffect(() => {
      const hasEnvKey = !!process.env.API_KEY;
      const hasLocalKey = !!localStorage.getItem('tacbook_gemini_api_key');
      if (hasEnvKey || hasLocalKey) {
          setIsDebug(true);
      }
  }, []);

  // Theme Logic
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

  // Hook for Tactics filtering
  const { availableTags: tacticTags, filter, updateFilter, tactics: filteredTactics } = useTactics(currentMap, side, allTactics); 

  // --- Utility Filtering Logic ---
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
              return u.title.toLowerCase().includes(q) || 
                     u.content.toLowerCase().includes(q) ||
                     u.id.toLowerCase().includes(q); 
          }
          return true;
      });
  }, [currentMap, side, filter, utilityTags, allUtilities]);

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
          setEditingUtility(undefined);
      }
  };

  // --- Deletion Logic ---

  const handleDeleteTactic = (tactic: Tactic) => {
      setConfirmConfig({
          isOpen: true,
          title: "删除战术",
          message: `确定要删除战术 "${tactic.title}" 吗？此操作不可恢复。`,
          onConfirm: () => {
              setGroups(prevGroups => prevGroups.map(g => {
                  if (g.metadata.id === tactic.groupId) {
                      return {
                          ...g,
                          tactics: g.tactics.filter(t => t.id !== tactic.id),
                          metadata: { ...g.metadata, lastUpdated: Date.now() }
                      };
                  }
                  return g;
              }));
              setConfirmConfig(prev => ({ ...prev, isOpen: false }));
              if (selectedTactic?.id === tactic.id) setSelectedTactic(null);
          }
      });
  };

  const handleDeleteUtility = (utility: Utility) => {
      setConfirmConfig({
          isOpen: true,
          title: "删除道具",
          message: `确定要删除道具 "${utility.title}" 吗？此操作不可恢复。`,
          onConfirm: () => {
              setGroups(prevGroups => prevGroups.map(g => {
                  if (g.metadata.id === utility.groupId) {
                      return {
                          ...g,
                          utilities: g.utilities.filter(u => u.id !== utility.id),
                          metadata: { ...g.metadata, lastUpdated: Date.now() }
                      };
                  }
                  return g;
              }));
              setConfirmConfig(prev => ({ ...prev, isOpen: false }));
              if (selectedUtility?.id === utility.id) setSelectedUtility(null);
          }
      });
  };

  // --- Save Logic ---

  const handleSaveTactic = (updatedTactic: Tactic, targetGroupId: string) => {
      setGroups(prevGroups => {
          return prevGroups.map(group => {
              if (group.metadata.id === targetGroupId) {
                  if(group.metadata.isReadOnly) return group;

                  const newTactic = { ...updatedTactic, groupId: targetGroupId, _isTemp: false };
                  const existsIndex = group.tactics.findIndex(t => t.id === newTactic.id);
                  
                  let newTactics;
                  if (existsIndex >= 0) {
                      newTactics = [...group.tactics];
                      newTactics[existsIndex] = newTactic;
                  } else {
                      newTactics = [...group.tactics, newTactic];
                  }
                  return { 
                      ...group, 
                      tactics: newTactics,
                      metadata: { ...group.metadata, version: group.metadata.version + 1, lastUpdated: Date.now() } 
                  };
              }
              return group;
          });
      });
      
      if (selectedTactic && selectedTactic.id === updatedTactic.id) {
          setSelectedTactic({ ...updatedTactic, groupId: targetGroupId });
      }
      
      setActiveEditor(null);
      setEditingTactic(undefined);
  };

  const handleSaveUtility = (updatedUtility: Utility, targetGroupId: string) => {
      setGroups(prevGroups => {
          return prevGroups.map(group => {
              if (group.metadata.id === targetGroupId) {
                  if(group.metadata.isReadOnly) return group;

                  const newUtil = { ...updatedUtility, groupId: targetGroupId, _isTemp: false };
                  const existsIndex = group.utilities.findIndex(u => u.id === newUtil.id);
                  
                  let newUtils;
                  if (existsIndex >= 0) {
                      newUtils = [...group.utilities];
                      newUtils[existsIndex] = newUtil;
                  } else {
                      newUtils = [...group.utilities, newUtil];
                  }
                  return { 
                      ...group, 
                      utilities: newUtils,
                      metadata: { ...group.metadata, version: group.metadata.version + 1, lastUpdated: Date.now() } 
                  };
              }
              return group;
          });
      });

      if (selectedUtility && selectedUtility.id === updatedUtility.id) {
          setSelectedUtility({ ...updatedUtility, groupId: targetGroupId });
      }

      setActiveEditor(null);
      setEditingUtility(undefined);
  };

  const filterActive = filter.selectedTags.length > 0 || filter.site !== 'All' || !!filter.specificRole || !!filter.onlyRecommended;
  const showSearchAndFilter = viewMode === 'tactics' || viewMode === 'utilities';

  // Helper: Is a specific item editable?
  const isItemEditable = (itemGroupId?: string) => {
      if (!itemGroupId) return false;
      const group = groups.find(g => g.metadata.id === itemGroupId);
      return group && !group.metadata.isReadOnly;
  };

  const getActiveGroupNames = () => {
      if (activeGroupIds.length === 0) return "无内容";
      if (activeGroupIds.length === 1) {
          return groups.find(g => g.metadata.id === activeGroupIds[0])?.metadata.name || "Unknown";
      }
      return `${activeGroupIds.length} 个组`;
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-200 font-sans selection:bg-neutral-200 dark:selection:bg-neutral-700 pt-[56px]">
      
      <Header 
        currentMapId={currentMap}
        currentSide={side}
        onMapChange={setCurrentMap}
        onSideChange={setSide}
        onOpenSettings={() => setIsSettingsOpen(true)}
        viewMode={viewMode}
        currentGroupName={getActiveGroupNames()} 
      />

      {/* Search & Filter Bar */}
      {showSearchAndFilter && (
          <div className="sticky top-[55px] z-40 w-full shadow-sm bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md transition-all border-b border-neutral-100 dark:border-neutral-800">
            <div className="max-w-[1920px] mx-auto px-4 lg:px-8 py-2 flex gap-2">
                {/* Search Input */}
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
                
                {/* Filter Toggle Button */}
                <button 
                    onClick={handleToggleFilter}
                    className={`
                        w-9 h-9 shrink-0 rounded-xl flex items-center justify-center transition-all relative
                        ${isFilterOpen || filterActive
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                            : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800'}
                    `}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    {filterActive && !isFilterOpen && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-neutral-900"></span>
                    )}
                </button>

                {/* Add Button - Changed Logic: Show if ANY writable group exists */}
                {hasWritableGroups && (viewMode === 'tactics' || viewMode === 'utilities') && (
                    <button
                        onClick={handleAdd}
                        className="w-9 h-9 shrink-0 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl flex items-center justify-center transition-all active:scale-95 border border-transparent hover:border-blue-200 dark:hover:border-blue-800/50"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
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

      <main className="px-4 lg:px-8 pb-32 max-w-[1920px] mx-auto pt-4">
        {/* Tactics List */}
        {viewMode === 'tactics' && (
            filteredTactics.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {filteredTactics.map((tactic) => (
                    <div key={tactic.id} className="relative group">
                        <button 
                            onClick={(e) => handleCopyId(e, tactic.id)}
                            className="absolute top-6 right-10 z-10 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-neutral-400 hover:text-blue-500 flex items-center gap-1 bg-white/50 dark:bg-black/50 backdrop-blur px-1.5 py-0.5 rounded"
                        >
                             {copiedId === tactic.id ? <span className="text-green-500">Copied!</span> : `#${tactic.id}`}
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
                    <p className="text-sm font-medium">{isDataLoaded ? `暂无战术 (在${activeGroupIds.length}个组中)` : '加载中...'}</p>
                </div>
            )
        )}

        {/* Utilities List */}
        {viewMode === 'utilities' && (
             filteredUtilities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {filteredUtilities.map((utility) => (
                        <UtilityCard 
                            key={utility.id} 
                            utility={utility} 
                            viewMode={utilityViewMode}
                            onClick={() => setSelectedUtility(utility)}
                            onEdit={isItemEditable(utility.groupId) ? () => {
                                setEditingUtility(utility);
                                setActiveEditor('utility');
                            } : undefined}
                        />
                    ))}
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-neutral-600">
                    <div className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-neutral-900 flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium">{isDataLoaded ? `暂无道具 (在${activeGroupIds.length}个组中)` : '加载中...'}</p>
                </div>
             )
        )}

        {/* Arsenal (Weapons) View */}
        {viewMode === 'weapons' && (
            <div className="max-w-[1920px] mx-auto">
                <ArsenalView />
            </div>
        )}
      </main>

      {/* Full Screen Tactic Detail View */}
      {selectedTactic && (
          <TacticDetailView 
            tactic={selectedTactic}
            onBack={() => setSelectedTactic(null)}
            highlightRole={filter.specificRole}
            onEdit={isItemEditable(selectedTactic.groupId) ? () => {
                setEditingTactic(selectedTactic);
                setActiveEditor('tactic');
            } : undefined}
            onDelete={isItemEditable(selectedTactic.groupId) ? () => handleDeleteTactic(selectedTactic) : undefined}
          />
      )}

      {/* Full Screen Utility Detail View */}
      {selectedUtility && (
          <UtilityDetailView
            utility={selectedUtility}
            allUtilities={allUtilities} // Passed for finding siblings
            onBack={() => setSelectedUtility(null)}
            onSelectSibling={(sibling) => setSelectedUtility(sibling)}
            onEdit={isItemEditable(selectedUtility.groupId) ? () => {
                setEditingUtility(selectedUtility);
                setActiveEditor('utility');
            } : undefined}
            onDelete={isItemEditable(selectedUtility.groupId) ? () => handleDeleteUtility(selectedUtility) : undefined}
          />
      )}

      {/* Editor Modals */}
      {activeEditor === 'tactic' && (
          <TacticEditor 
            initialTactic={editingTactic}
            currentMapId={currentMap}
            currentSide={side}
            onCancel={() => { setActiveEditor(null); setEditingTactic(undefined); }}
            onSave={handleSaveTactic}
            writableGroups={writableGroups}
          />
      )}

      {activeEditor === 'utility' && (
          <UtilityEditor
            initialUtility={editingUtility}
            currentMapId={currentMap}
            currentSide={side}
            onCancel={() => { setActiveEditor(null); setEditingUtility(undefined); }}
            onSave={handleSaveUtility}
            writableGroups={writableGroups}
          />
      )}
      
      {/* Settings Modal */}
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

      {/* Group Manager Modal */}
      <GroupManagerModal 
        isOpen={isGroupManagerOpen}
        onClose={() => setIsGroupManagerOpen(false)}
        groups={groups}
        setGroups={setGroups}
        activeGroupIds={activeGroupIds}
        onToggleGroup={(id) => {
            setActiveGroupIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
        }}
        isDebug={isDebug}
      />

      {/* Confirm Modal (App Level for Items) */}
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        isDangerous={true}
      />

      {/* PWA Install Prompt Banner (Bottom) */}
      <InstallPrompt 
          isOpen={showPrompt} 
          onClose={closePrompt}
          onInstall={handleInstall}
          isIos={isIos}
          isStandalone={isStandalone}
      />

      {/* Bottom Navigation */}
      <BottomNav currentMode={viewMode} onChange={setViewMode} />

    </div>
  );
};

export default App;
