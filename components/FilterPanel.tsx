
import React, { useMemo } from 'react';
import { Site, Tag, TagCategory } from '../types';
import { ROLES_T, ROLES_CT_MIRAGE, ROLES_CT_GENERAL } from '../constants/roles';

interface FilterPanelProps {
  isOpen: boolean;
  availableTags: Tag[];
  filterState: {
    searchQuery: string; 
    site: Site | 'All';
    selectedTags: string[];
    specificRole?: string;
  };
  onUpdate: (key: any, value: any) => void;
  currentSide: 'T' | 'CT';
  currentMapId: string;
  viewMode: 'tactics' | 'utilities' | 'weapons' | 'tbtv';
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ 
  isOpen,
  availableTags, 
  filterState, 
  onUpdate,
  currentSide,
  currentMapId,
  viewMode
}) => {
  
  // Group tags by category
  const tagsByCategory = useMemo(() => {
    const groups: Record<TagCategory, Tag[]> = {
      economy: [],
      playstyle: [],
      utility: [],
      difficulty: [],
      type: []
    };
    availableTags.forEach(tag => {
        if (groups[tag.category]) {
            groups[tag.category].push(tag);
        }
    });
    return groups;
  }, [availableTags]);

  const toggleTag = (label: string) => {
    const current = filterState.selectedTags;
    if (current.includes(label)) {
      onUpdate('selectedTags', current.filter(t => t !== label));
    } else {
      onUpdate('selectedTags', [...current, label]);
    }
  };

  const tacticCategories: {key: TagCategory, label: string}[] = [
    { key: 'playstyle', label: '风格' },
    { key: 'economy', label: '经济' },
    { key: 'utility', label: '道具' },
  ];

  const utilityCategories: {key: TagCategory, label: string}[] = [
    { key: 'type', label: '类型' },
  ];

  const availableRoles = useMemo(() => {
    if (currentSide === 'T') return ROLES_T;
    return currentMapId === 'mirage' ? ROLES_CT_MIRAGE : ROLES_CT_GENERAL;
  }, [currentSide, currentMapId]);

  return (
    <div className={`
        bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 transition-all duration-300 overflow-hidden
        ${isOpen ? 'max-h-[600px] opacity-100 shadow-xl' : 'max-h-0 opacity-0'}
    `}>
      <div className="px-4 py-5 space-y-6">
        
        {/* Filters are only for Tactics and Utilities */}
        {(viewMode === 'tactics' || viewMode === 'utilities') ? (
            <>
                {/* Search Bar */}
                <div className="relative">
                     <svg className="absolute left-3 top-3 w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                     <input 
                        type="text"
                        value={filterState.searchQuery}
                        onChange={(e) => onUpdate('searchQuery', e.target.value)}
                        placeholder="搜索关键字、ID..."
                        className="w-full bg-neutral-100 dark:bg-neutral-950 border-none rounded-2xl py-3 pl-10 pr-10 text-sm font-bold placeholder-neutral-400 focus:ring-2 focus:ring-blue-500/50 outline-none dark:text-white transition-all"
                     />
                     {filterState.searchQuery && (
                        <button onClick={() => onUpdate('searchQuery', '')} className="absolute right-3 top-3 text-neutral-400">
                             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                        </button>
                     )}
                </div>

                {/* Site Filter (Segmented Control) */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">区域筛选</label>
                    <div className="flex p-1 bg-neutral-100 dark:bg-neutral-950 rounded-xl">
                        {['All', 'A', 'Mid', 'B'].map((site) => (
                            <button
                                key={site}
                                onClick={() => onUpdate('site', site)}
                                className={`
                                    flex-1 py-2 rounded-lg text-xs font-bold transition-all
                                    ${filterState.site === site 
                                        ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm' 
                                        : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}
                                `}
                            >
                                {site === 'All' ? '全部' : site}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dynamic Tags */}
                <div className="space-y-4">
                    {(viewMode === 'tactics' ? tacticCategories : utilityCategories).map(cat => {
                        const tags = tagsByCategory[cat.key];
                        if (!tags || tags.length === 0) return null;

                        return (
                            <div key={cat.key} className="space-y-2">
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">{cat.label}</label>
                                <div className="flex flex-wrap gap-2">
                                    {tags.map(tag => {
                                        const isSelected = filterState.selectedTags.includes(tag.label);
                                        return (
                                            <button
                                                key={tag.label}
                                                onClick={() => toggleTag(tag.label)}
                                                className={`
                                                    px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-95
                                                    ${isSelected
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                                                        : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300'}
                                                `}
                                            >
                                                {tag.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Role Filter (Only for Tactics) */}
                {viewMode === 'tactics' && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">职能高亮</label>
                        <div className="relative">
                            <select
                                value={filterState.specificRole || ''}
                                onChange={(e) => onUpdate('specificRole', e.target.value || undefined)}
                                className="w-full appearance-none bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-medium py-3 px-4 dark:text-neutral-200 focus:outline-none focus:border-blue-500 transition-colors"
                            >
                                <option value="">无高亮</option>
                                {availableRoles.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-3.5 pointer-events-none text-neutral-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>
                )}
            </>
        ) : (
            <div className="text-center text-neutral-400 text-sm py-4">
                当前视图无需筛选
            </div>
        )}
      </div>
    </div>
  );
};
