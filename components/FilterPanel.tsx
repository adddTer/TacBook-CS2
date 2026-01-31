
import React, { useMemo } from 'react';
import { Site, Tag, TagCategory } from '../types';
import { ROLES_T, ROLES_CT_MIRAGE, ROLES_CT_GENERAL } from '../constants/roles';

interface FilterPanelProps {
  isOpen: boolean;
  availableTags: Tag[];
  filterState: {
    searchQuery: string; // Still needed for logic upchain, but not rendered input here
    site: Site | 'All';
    selectedTags: string[];
    specificRole?: string;
  };
  onUpdate: (key: any, value: any) => void;
  currentSide: 'T' | 'CT';
  currentMapId: string;
  viewMode: 'tactics' | 'utilities' | 'weapons' | 'tbtv';
  onViewModeChange: (mode: 'tactics' | 'utilities' | 'weapons' | 'tbtv') => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ 
  isOpen,
  availableTags, 
  filterState, 
  onUpdate,
  currentSide,
  currentMapId,
  viewMode,
  onViewModeChange
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
    { key: 'economy', label: '经济' },
    { key: 'playstyle', label: '风格' },
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
        ${isOpen ? 'max-h-[600px] opacity-100 shadow-lg' : 'max-h-0 opacity-0'}
    `}>
      <div className="px-4 py-4 space-y-4">
        
        {/* View Mode Toggle */}
        <div className="flex bg-neutral-100 dark:bg-neutral-950 p-1 rounded-xl overflow-x-auto no-scrollbar">
            <button 
                onClick={() => onViewModeChange('tactics')}
                className={`flex-1 min-w-[70px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${viewMode === 'tactics' ? 'bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
            >
                战术手册
            </button>
            <button 
                onClick={() => onViewModeChange('utilities')}
                className={`flex-1 min-w-[70px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${viewMode === 'utilities' ? 'bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
            >
                道具库
            </button>
             <button 
                onClick={() => onViewModeChange('weapons')}
                className={`flex-1 min-w-[70px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${viewMode === 'weapons' ? 'bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
            >
                武器库
            </button>
            <button 
                onClick={() => onViewModeChange('tbtv')}
                className={`flex-1 min-w-[70px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${viewMode === 'tbtv' ? 'bg-red-600 text-white shadow-sm shadow-red-500/20' : 'text-neutral-500'}`}
            >
                TBTV
            </button>
        </div>

        {/* Filters are only for Tactics and Utilities */}
        {(viewMode === 'tactics' || viewMode === 'utilities') && (
            <>
                {/* Site Filter */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">区域</label>
                    <div className="flex gap-2">
                        {['All', 'A', 'Mid', 'B'].map((site) => (
                            <button
                                key={site}
                                onClick={() => onUpdate('site', site)}
                                className={`
                                    flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border
                                    ${filterState.site === site 
                                        ? 'bg-neutral-900 dark:bg-neutral-100 border-transparent text-white dark:text-black shadow-md' 
                                        : 'bg-transparent border-neutral-200 dark:border-neutral-800 text-neutral-500'}
                                `}
                            >
                                {site === 'All' ? '全部' : site}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dynamic Tags */}
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                    {(viewMode === 'tactics' ? tacticCategories : utilityCategories).map(cat => {
                        const tags = tagsByCategory[cat.key];
                        if (!tags || tags.length === 0) return null;

                        return (
                            <div key={cat.key} className="space-y-1.5 flex-1 min-w-[100px]">
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">{cat.label}</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {tags.map(tag => {
                                        const isSelected = filterState.selectedTags.includes(tag.label);
                                        return (
                                            <button
                                                key={tag.label}
                                                onClick={() => toggleTag(tag.label)}
                                                className={`
                                                    px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all
                                                    ${isSelected
                                                        ? 'bg-blue-600 border-blue-600 text-white'
                                                        : 'bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 text-neutral-500'}
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
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">职能高亮</label>
                        <div className="relative">
                            <select
                                value={filterState.specificRole || ''}
                                onChange={(e) => onUpdate('specificRole', e.target.value || undefined)}
                                className="w-full appearance-none bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm py-2.5 px-3 dark:text-neutral-200 focus:outline-none focus:border-blue-500"
                            >
                                <option value="">无</option>
                                {availableRoles.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};
