import { useState, useEffect, useMemo } from "react";
import { ContentGroup, Tactic, Utility, Match, Tournament, MatchBon } from "../types";
import { generateGroupId } from "../utils/idGenerator";
import { loadGroupsFromDB, saveGroupsToDB } from "../utils/db";
import { safeStorage } from "../utils/storage";
import { permissionManager } from "../utils/permissionManager";
import { saveVersion } from "../utils/versionDb";

export const useAppStorage = () => {
  const [groups, setGroups] = useState<ContentGroup[]>([]);
  const [activeGroupIds, setActiveGroupIds] = useState<string[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // --- Initialization ---
  useEffect(() => {
    const initData = async () => {
      let loadedGroups: ContentGroup[] | null = null;

      // 1. Try Load from IndexedDB (New Storage)
      try {
        loadedGroups = await loadGroupsFromDB();
      } catch (e) {
        console.error("Failed to load from DB", e);
      }

      // 2. Migration: If DB is empty, check LocalStorage (Old Storage)
      if (!loadedGroups) {
        const savedGroupsStr = safeStorage.getItem("tacbook_groups");
        if (savedGroupsStr) {
          try {
            const parsedGroups = JSON.parse(savedGroupsStr);
            if (Array.isArray(parsedGroups) && parsedGroups.length > 0) {
              loadedGroups = parsedGroups;
              // Migrate: Save to DB immediately
              await saveGroupsToDB(loadedGroups!);
              // Clear legacy storage to free up space/memory
              safeStorage.removeItem("tacbook_groups");
              console.log("Migrated data from LocalStorage to IndexedDB");
            }
          } catch (e) {
            console.error("Failed to parse legacy localStorage groups", e);
          }
        }
      }

      if (loadedGroups) {
        // Ensure schema compatibility
        const migratedGroups = loadedGroups.map((g: any) => ({
          ...g,
          matches: Array.isArray(g.matches) ? g.matches : [],
          tournaments: Array.isArray(g.tournaments) ? g.tournaments : [],
          bons: Array.isArray(g.bons) ? g.bons : [],
        }));
        setGroups(migratedGroups);
      }

      // Load Active IDs (Keep this in localStorage as it's small config data)
      const savedActiveIdsStr = safeStorage.getItem("tacbook_active_group_ids");
      let hasLoadedActiveIds = false;

      if (savedActiveIdsStr) {
        try {
          const parsedIds = JSON.parse(savedActiveIdsStr);
          if (Array.isArray(parsedIds)) {
            setActiveGroupIds(parsedIds);
            hasLoadedActiveIds = true;
          }
        } catch (e) {}
      }

      // Create Default Group if none exist
      if (!loadedGroups || loadedGroups.length === 0) {
        const defaultId = generateGroupId();
        const defaultGroup: ContentGroup = {
          metadata: {
            id: defaultId,
            name: "默认",
            description: "本地默认战术包",
            version: 1,
            isReadOnly: false,
            author: "User",
            lastUpdated: Date.now(),
          },
          tactics: [],
          utilities: [],
          matches: [],
          tournaments: [],
          bons: [],
        };
        setGroups([defaultGroup]);
        setActiveGroupIds([defaultId]);
      } else if (!hasLoadedActiveIds && loadedGroups.length > 0) {
        setActiveGroupIds([loadedGroups[0].metadata.id]);
      }
      setIsDataLoaded(true);
    };
    initData();
  }, []);

  // --- Persistence ---
  useEffect(() => {
    if (isDataLoaded && groups.length > 0) {
      // Save to IndexedDB (Async, Non-blocking)
      saveGroupsToDB(groups);
    }
  }, [groups, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded && groups.length > 0) {
      // Cleanup invalid IDs
      const existingIds = groups.map((g) => g.metadata.id);
      const validActiveIds = activeGroupIds.filter((id) =>
        existingIds.includes(id),
      );

      if (validActiveIds.length !== activeGroupIds.length) {
        setActiveGroupIds(validActiveIds);
      } else {
        safeStorage.setItem(
          "tacbook_active_group_ids",
          JSON.stringify(activeGroupIds),
        );
      }
    }
  }, [activeGroupIds, groups, isDataLoaded]);

  // --- Computed Data ---
  const { allTactics, allUtilities, allMatches, allTournaments, allBons } =
    useMemo(() => {
      const activeGroups = groups.filter((g) =>
        activeGroupIds.includes(g.metadata.id),
      );
      const tactics = activeGroups.flatMap((g) =>
        (g.tactics || []).map((t) => ({ ...t, groupId: g.metadata.id })),
      );
      const utilities = activeGroups.flatMap((g) =>
        (g.utilities || []).map((u) => ({ ...u, groupId: g.metadata.id })),
      );
      const matches = activeGroups.flatMap((g) =>
        (g.matches || []).map((m) => ({ ...m, groupId: g.metadata.id })),
      );
      const tournaments = activeGroups.flatMap((g) =>
        (g.tournaments || []).map((t) => ({ ...t, groupId: g.metadata.id })),
      );
      const bons = activeGroups.flatMap((g) =>
        (g.bons || []).map((b) => ({ ...b, groupId: g.metadata.id })),
      );
      return {
        allTactics: tactics,
        allUtilities: utilities,
        allMatches: matches,
        allTournaments: tournaments,
        allBons: bons,
      };
    }, [groups, activeGroupIds]);

  const writableGroups = useMemo(() => {
    return groups.filter((g) => !g.metadata.isReadOnly);
  }, [groups]);

  const hasWritableGroups = writableGroups.length > 0;

  // --- Actions ---
  const handleSaveTactic = (
    updatedTactic: Tactic, 
    targetGroupId: string, 
    options?: { description?: string, author?: string, skipVersionSave?: boolean }
  ) => {
    const tacticToSave = { ...updatedTactic };
    if (!options?.skipVersionSave) {
        delete (tacticToSave as any)._restoredFromTimestamp;
        saveVersion(tacticToSave, options?.author || '用户 (手动/自动编辑)', options?.description || '已保存战术');
    }
    setGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.metadata.id === targetGroupId) {
          if (group.metadata.isReadOnly) return group;

          const existsIndex = group.tactics.findIndex(
            (t) => t.id === tacticToSave.id,
          );
          
          permissionManager.enforce({
            action: existsIndex >= 0 ? 'edit' : 'add',
            dataType: 'tactic',
            dataId: tacticToSave.id,
            groupId: targetGroupId
          });

          const newTactic = {
            ...tacticToSave,
            groupId: targetGroupId,
            _isTemp: false,
          };

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
            metadata: {
              ...group.metadata,
              version: group.metadata.version + 1,
              lastUpdated: Date.now(),
            },
          };
        }
        return group;
      }),
    );
  };

  const handleSaveUtility = (
    updatedUtility: Utility,
    targetGroupId: string,
    options?: { description?: string, author?: string, skipVersionSave?: boolean }
  ) => {
    const utilityToSave = { ...updatedUtility };
    if (!options?.skipVersionSave) {
        delete (utilityToSave as any)._restoredFromTimestamp;
        saveVersion(utilityToSave, options?.author || '用户 (手动/自动编辑)', options?.description || '已保存道具');
    }
    setGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.metadata.id === targetGroupId) {
          if (group.metadata.isReadOnly) return group;

          const existsIndex = group.utilities.findIndex(
            (u) => u.id === utilityToSave.id,
          );
          
          permissionManager.enforce({
            action: existsIndex >= 0 ? 'edit' : 'add',
            dataType: 'utility',
            dataId: utilityToSave.id,
            groupId: targetGroupId
          });

          const newUtil = {
            ...utilityToSave,
            groupId: targetGroupId,
            _isTemp: false,
          };

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
            metadata: {
              ...group.metadata,
              version: group.metadata.version + 1,
              lastUpdated: Date.now(),
            },
          };
        }
        return group;
      }),
    );
  };

  const handleSaveMatch = (newMatch: Match, targetGroupId: string) => {
    setGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.metadata.id === targetGroupId) {
          if (group.metadata.isReadOnly) return group;

          const existsIndex = (group.matches || []).findIndex(
            (m) => m.id === newMatch.id,
          );
          
          permissionManager.enforce({
            action: existsIndex >= 0 ? 'edit' : 'add',
            dataType: 'match',
            dataId: newMatch.id,
            groupId: targetGroupId
          });

          const matchToSave = { ...newMatch, groupId: targetGroupId };
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
            metadata: {
              ...group.metadata,
              version: group.metadata.version + 1,
              lastUpdated: Date.now(),
            },
          };
        }
        return group;
      }),
    );
  };

  const handleSaveTournament = (
    newTournament: Tournament,
    targetGroupId: string,
  ) => {
    setGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.metadata.id === targetGroupId) {
          if (group.metadata.isReadOnly) return group;

          let newTournamentList = group.tournaments || [];
          const existsIndex = newTournamentList.findIndex(
            (t) => t.id === newTournament.id,
          );
          
          permissionManager.enforce({
            action: existsIndex >= 0 ? 'edit' : 'add',
            dataType: 'tournament',
            dataId: newTournament.id,
            groupId: targetGroupId
          });

          const tournamentToSave = { ...newTournament, groupId: targetGroupId };

          if (existsIndex >= 0) {
            newTournamentList = [...newTournamentList];
            newTournamentList[existsIndex] = tournamentToSave;
          } else {
            newTournamentList = [tournamentToSave, ...newTournamentList];
          }

          return {
            ...group,
            tournaments: newTournamentList,
            metadata: {
              ...group.metadata,
              version: group.metadata.version + 1,
              lastUpdated: Date.now(),
            },
          };
        }
        return group;
      }),
    );
  };

  const handleSaveBon = (
    newBon: MatchBon,
    targetGroupId: string,
  ) => {
    setGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.metadata.id === targetGroupId) {
          if (group.metadata.isReadOnly) return group;

          let newBonList = group.bons || [];
          const existsIndex = newBonList.findIndex(
            (b) => b.id === newBon.id,
          );
          
          permissionManager.enforce({
            action: existsIndex >= 0 ? 'edit' : 'add',
            dataType: 'bon',
            dataId: newBon.id,
            groupId: targetGroupId
          });

          const bonToSave = { ...newBon, groupId: targetGroupId };

          if (existsIndex >= 0) {
            newBonList = [...newBonList];
            newBonList[existsIndex] = bonToSave;
          } else {
            newBonList = [bonToSave, ...newBonList];
          }

          return {
            ...group,
            bons: newBonList,
            metadata: {
              ...group.metadata,
              version: group.metadata.version + 1,
              lastUpdated: Date.now(),
            },
          };
        }
        return group;
      }),
    );
  };

  const deleteTactic = (tactic: Tactic) => {
    permissionManager.enforce({
      action: 'delete',
      dataType: 'tactic',
      dataId: tactic.id,
      groupId: tactic.groupId
    });
    setGroups((prevGroups) =>
      prevGroups.map((g) => {
        if (g.metadata.id === tactic.groupId) {
          return {
            ...g,
            tactics: g.tactics.filter((t) => t.id !== tactic.id),
            metadata: { ...g.metadata, lastUpdated: Date.now() },
          };
        }
        return g;
      }),
    );
  };

  const deleteUtility = (utility: Utility) => {
    permissionManager.enforce({
      action: 'delete',
      dataType: 'utility',
      dataId: utility.id,
      groupId: utility.groupId
    });
    setGroups((prevGroups) =>
      prevGroups.map((g) => {
        if (g.metadata.id === utility.groupId) {
          return {
            ...g,
            utilities: g.utilities.filter((u) => u.id !== utility.id),
            metadata: { ...g.metadata, lastUpdated: Date.now() },
          };
        }
        return g;
      }),
    );
  };

  const deleteMatch = (match: Match) => {
    permissionManager.enforce({
      action: 'delete',
      dataType: 'match',
      dataId: match.id,
      groupId: match.groupId
    });
    setGroups((prevGroups) =>
      prevGroups.map((g) => {
        if (g.metadata.id === match.groupId) {
          return {
            ...g,
            matches: (g.matches || []).filter((m) => m.id !== match.id),
            metadata: { ...g.metadata, lastUpdated: Date.now() },
          };
        }
        return g;
      }),
    );
  };

  const deleteTournament = (tournament: Tournament) => {
    permissionManager.enforce({
      action: 'delete',
      dataType: 'tournament',
      dataId: tournament.id,
      groupId: tournament.groupId
    });
    setGroups((prevGroups) =>
      prevGroups.map((g) => {
        if (g.metadata.id === tournament.groupId) {
          return {
            ...g,
            tournaments: (g.tournaments || []).filter(
              (t) => t.id !== tournament.id,
            ),
            metadata: { ...g.metadata, lastUpdated: Date.now() },
          };
        }
        return g;
      }),
    );
  };

  const deleteBon = (bon: MatchBon) => {
    permissionManager.enforce({
      action: 'delete',
      dataType: 'bon',
      dataId: bon.id,
      groupId: bon.groupId
    });
    setGroups((prevGroups) =>
      prevGroups.map((g) => {
        if (g.metadata.id === bon.groupId) {
          return {
            ...g,
            bons: (g.bons || []).filter((b) => b.id !== bon.id),
            metadata: { ...g.metadata, lastUpdated: Date.now() },
          };
        }
        return g;
      }),
    );
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
    allTournaments,
    allBons,
    writableGroups,
    hasWritableGroups,
    handleSaveTactic,
    handleSaveUtility,
    handleSaveMatch,
    handleSaveTournament,
    handleSaveBon,
    deleteTactic,
    deleteUtility,
    deleteMatch,
    deleteTournament,
    deleteBon,
  };
};
