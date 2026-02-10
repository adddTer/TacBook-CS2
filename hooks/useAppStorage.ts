
import { useState, useEffect, useMemo } from 'react';
import { ContentGroup, Tactic, Utility, Match, MatchSeries } from '../types';
import { generateGroupId } from '../utils/idGenerator';

export const useAppStorage = () => {
    const [groups, setGroups] = useState<ContentGroup[]>([]);
    const [activeGroupIds, setActiveGroupIds] = useState<string[]>([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    // --- Initialization ---
    useEffect(() => {
        const initData = async () => {
            const savedGroupsStr = localStorage.getItem('tacbook_groups');
            const savedActiveIdsStr = localStorage.getItem('tacbook_active_group_ids');
            
            let hasLoadedGroups = false;
            if (savedGroupsStr) {
                try {
                    const parsedGroups = JSON.parse(savedGroupsStr);
                    if (Array.isArray(parsedGroups) && parsedGroups.length > 0) {
                        // Ensure all groups have a matches/series array (migration for old data)
                        const migratedGroups = parsedGroups.map((g: any) => ({
                            ...g,
                            matches: Array.isArray(g.matches) ? g.matches : [],
                            series: Array.isArray(g.series) ? g.series : []
                        }));
                        setGroups(migratedGroups);
                        hasLoadedGroups = true;
                    }
                } catch (e) {
                    console.error("Failed to load saved groups", e);
                }
            } 
            
            if (savedActiveIdsStr && hasLoadedGroups) {
                try {
                    const parsedIds = JSON.parse(savedActiveIdsStr);
                    if (Array.isArray(parsedIds)) setActiveGroupIds(parsedIds);
                } catch(e) {}
            }

            // Create Default Group if none exist
            if (!hasLoadedGroups) {
                const defaultId = generateGroupId(); 
                const defaultGroup: ContentGroup = {
                    metadata: {
                        id: defaultId,
                        name: '默认',
                        description: '本地默认战术包', 
                        version: 1,
                        isReadOnly: false,
                        author: 'User',
                        lastUpdated: Date.now()
                    },
                    tactics: [],
                    utilities: [],
                    matches: [],
                    series: [],
                };
                setGroups([defaultGroup]);
                setActiveGroupIds([defaultId]);
            } else if (activeGroupIds.length === 0 && hasLoadedGroups) {
                 if (savedGroupsStr) { 
                     const parsed = JSON.parse(savedGroupsStr);
                     if (parsed[0]) setActiveGroupIds([parsed[0].metadata.id]);
                 }
            }
            setIsDataLoaded(true);
        };
        initData();
    }, []);

    // --- Persistence ---
    useEffect(() => {
        if (isDataLoaded && groups.length > 0) {
            localStorage.setItem('tacbook_groups', JSON.stringify(groups));
        }
    }, [groups, isDataLoaded]);

    useEffect(() => {
        if (isDataLoaded && groups.length > 0) {
            // Cleanup invalid IDs
            const existingIds = groups.map(g => g.metadata.id);
            const validActiveIds = activeGroupIds.filter(id => existingIds.includes(id));
            
            if (validActiveIds.length !== activeGroupIds.length) {
                setActiveGroupIds(validActiveIds);
            } else {
                localStorage.setItem('tacbook_active_group_ids', JSON.stringify(activeGroupIds));
            }
        }
    }, [activeGroupIds, groups, isDataLoaded]);

    // --- Computed Data ---
    const { allTactics, allUtilities, allMatches, allSeries } = useMemo(() => {
        const activeGroups = groups.filter(g => activeGroupIds.includes(g.metadata.id));
        const tactics = activeGroups.flatMap(g => g.tactics);
        const utilities = activeGroups.flatMap(g => g.utilities);
        const matches = activeGroups.flatMap(g => g.matches || []); 
        const series = activeGroups.flatMap(g => g.series || []);
        return { allTactics: tactics, allUtilities: utilities, allMatches: matches, allSeries: series };
    }, [groups, activeGroupIds]);

    const writableGroups = useMemo(() => {
        return groups.filter(g => !g.metadata.isReadOnly);
    }, [groups]);

    const hasWritableGroups = writableGroups.length > 0;

    // --- Actions ---
    const handleSaveTactic = (updatedTactic: Tactic, targetGroupId: string) => {
        setGroups(prevGroups => prevGroups.map(group => {
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
        }));
    };

    const handleSaveUtility = (updatedUtility: Utility, targetGroupId: string) => {
        setGroups(prevGroups => prevGroups.map(group => {
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
        }));
    };

    const handleSaveMatch = (newMatch: Match, targetGroupId: string) => {
        setGroups(prevGroups => prevGroups.map(group => {
            if (group.metadata.id === targetGroupId) {
                if(group.metadata.isReadOnly) return group;

                const matchToSave = { ...newMatch, groupId: targetGroupId };
                const existsIndex = (group.matches || []).findIndex(m => m.id === matchToSave.id);
                
                let newMatches = group.matches || [];
                if (existsIndex >= 0) {
                    newMatches = [...newMatches];
                    newMatches[existsIndex] = matchToSave;
                } else {
                    newMatches = [matchToSave, ...newMatches];
                }

                return { 
                    ...group, 
                    matches: newMatches,
                    metadata: { ...group.metadata, version: group.metadata.version + 1, lastUpdated: Date.now() } 
                };
            }
            return group;
        }));
    };
    
    const handleSaveSeries = (newSeries: MatchSeries, targetGroupId: string) => {
        setGroups(prevGroups => prevGroups.map(group => {
            if (group.metadata.id === targetGroupId) {
                if(group.metadata.isReadOnly) return group;

                const seriesToSave = { ...newSeries, groupId: targetGroupId };
                let newSeriesList = group.series || [];
                const existsIndex = newSeriesList.findIndex(s => s.id === seriesToSave.id);
                
                if (existsIndex >= 0) {
                    newSeriesList = [...newSeriesList];
                    newSeriesList[existsIndex] = seriesToSave;
                } else {
                    newSeriesList = [seriesToSave, ...newSeriesList];
                }

                return { 
                    ...group, 
                    series: newSeriesList,
                    metadata: { ...group.metadata, version: group.metadata.version + 1, lastUpdated: Date.now() } 
                };
            }
            return group;
        }));
    };

    const deleteTactic = (tactic: Tactic) => {
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
    };

    const deleteUtility = (utility: Utility) => {
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
    };

    const deleteMatch = (match: Match) => {
        setGroups(prevGroups => prevGroups.map(g => {
            if (g.metadata.id === match.groupId) {
                return {
                    ...g,
                    matches: (g.matches || []).filter(m => m.id !== match.id),
                    metadata: { ...g.metadata, lastUpdated: Date.now() }
                };
            }
            return g;
        }));
    };

    const deleteSeries = (series: MatchSeries) => {
        setGroups(prevGroups => prevGroups.map(g => {
            if (g.metadata.id === series.groupId) {
                return {
                    ...g,
                    series: (g.series || []).filter(s => s.id !== series.id),
                    metadata: { ...g.metadata, lastUpdated: Date.now() }
                };
            }
            return g;
        }));
    };

    return {
        groups,
        setGroups,
        activeGroupIds,
        setActiveGroupIds,
        isDataLoaded,
        allTactics,
        allUtilities,
        allMatches,
        allSeries,
        writableGroups,
        hasWritableGroups,
        handleSaveTactic,
        handleSaveUtility,
        handleSaveMatch,
        handleSaveSeries,
        deleteTactic,
        deleteUtility,
        deleteMatch,
        deleteSeries
    };
};