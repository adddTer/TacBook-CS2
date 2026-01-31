import { useState, useMemo } from 'react';
import { Tactic, Side, Site, MapId, FilterState, Tag } from '../types';
import { ALL_TACTICS } from '../data/tactics';
import { parseTime } from '../utils/timeHelper';

export const useTactics = (currentMap: MapId, side: Side) => {
  const [filter, setFilter] = useState<FilterState>({
    searchQuery: '',
    site: 'All',
    selectedTags: [],
    timePhase: undefined,
    specificRole: undefined,
  });

  // 1. Get Base Tactics for Map & Side
  const baseTactics = useMemo(() => {
    return ALL_TACTICS.filter(t => t.mapId === currentMap && t.side === side);
  }, [currentMap, side]);

  // 2. Extract Available Tags & Roles for filters
  const { availableTags, availableRoles } = useMemo(() => {
    const tagsMap = new Map<string, Tag>();
    const rolesSet = new Set<string>();

    baseTactics.forEach(t => {
      t.tags.forEach(tag => tagsMap.set(tag.label, tag));
      t.actions.forEach(a => rolesSet.add(a.who));
    });

    return {
      availableTags: Array.from(tagsMap.values()),
      availableRoles: Array.from(rolesSet).sort()
    };
  }, [baseTactics]);

  // 3. Apply Filters
  const filteredTactics = useMemo(() => {
    return baseTactics.filter(t => {
      // Site Filter
      if (filter.site !== 'All' && t.site !== filter.site) return false;

      // Tag Filter (AND logic: must contain ALL selected tags)
      if (filter.selectedTags.length > 0) {
        const tacticTagLabels = t.tags.map(tag => tag.label);
        const hasAllTags = filter.selectedTags.every(st => tacticTagLabels.includes(st));
        if (!hasAllTags) return false;
      }

      // Role Filter (Does this tactic involve the specific role?)
      if (filter.specificRole) {
        const hasRole = t.actions.some(a => a.who === filter.specificRole);
        if (!hasRole) return false;
      }

      // Time Phase Filter
      if (filter.timePhase) {
        // Logic: Check if tactic has meaningful action in this phase
        // Early: > 1:40, Mid: 1:40 - 0:40, Late: < 0:40
        const hasPhaseAction = t.actions.some(a => {
            const time = parseTime(a.time);
            if (filter.timePhase === 'early') return time > 100; // > 1:40
            if (filter.timePhase === 'mid') return time <= 100 && time > 40;
            if (filter.timePhase === 'late') return time <= 40 && time >= 0;
            return false;
        });
        if (!hasPhaseAction) return false;
      }

      // Search Filter
      if (filter.searchQuery) {
        const q = filter.searchQuery.toLowerCase();
        const inTitle = t.title.toLowerCase().includes(q);
        const inTags = t.tags.some(tag => tag.label.toLowerCase().includes(q));
        const inActions = t.actions.some(a => 
            a.content.toLowerCase().includes(q) || 
            a.who.toLowerCase().includes(q)
        );
        return inTitle || inTags || inActions;
      }

      return true;
    });
  }, [baseTactics, filter]);

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  };

  return {
    tactics: filteredTactics,
    availableTags,
    availableRoles,
    filter,
    updateFilter
  };
};
