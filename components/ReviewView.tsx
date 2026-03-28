
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Match, ContentGroup, PlayerMatchStats, Tournament, MatchBon } from '../types';
import { ROSTER } from '../constants/roster';
import { resolveName } from '../utils/demo/helpers';
import { MatchAggregator } from '../utils/analytics/matchAggregator';
import { getMapDisplayName, getMapEnName, isMyTeamMatch } from '../utils/matchHelpers';
import { MatchList } from './review/MatchList';
import { PlayerList } from './review/PlayerList';
import { MatchDetail } from './review/MatchDetail';
import { PlayerDetail } from './review/PlayerDetail';
import { TournamentView } from './tournament/TournamentView';
import { LeaderboardTab } from './review/LeaderboardTab';
import { MatchImportModal } from './MatchImportModal';
import { parseDemoJson } from '../utils/demoParser';
import { ParseError, ParseErrorModal } from './ParseErrorModal';
import { JsonDebugger } from './JsonDebugger';
import { shareFile } from '../utils/shareHelper';
import { LoadingOverlay } from './LoadingOverlay';
import { ConfirmModal } from './ConfirmModal';
import { AlertModal } from './AlertModal';
import { FilterState } from './review/MatchFilterBar';
import { RosterTimelineView } from './review/RosterTimelineView';
import { StatsTab } from './review/StatsTab';
import { BonView } from './bon/BonView';
import { BonCreatorModal } from './bon/BonCreatorModal';

import { exportPlayersToJson } from '../utils/exportPlayers';
import { calculatePlayerStats } from '../utils/analytics/playerStatsCalculator';
import { identifyRole } from '../utils/analytics/roleIdentifier';

import { safeStorage } from '../utils/storage';

interface ReviewViewProps {
    allMatches: Match[];
    allTournaments: Tournament[];
    allBons: MatchBon[];
    onSaveMatch: (match: Match, groupId: string) => void;
    onSaveTournament: (tournament: Tournament, groupId: string) => void;
    onSaveBon: (bon: MatchBon, groupId: string) => void;
    onDeleteMatch: (match: Match) => void;
    onDeleteTournament: (tournament: Tournament) => void;
    onDeleteBon: (bon: MatchBon) => void;
    writableGroups: ContentGroup[];
    isDebug: boolean;
}

export const ReviewView: React.FC<ReviewViewProps> = ({
    allMatches,
    allTournaments,
    allBons,
    onSaveMatch,
    onSaveTournament,
    onSaveBon,
    onDeleteMatch,
    onDeleteTournament,
    onDeleteBon,
    writableGroups,
    isDebug
}) => {
    const [activeTab, setActiveTab] = useState<'matches' | 'players' | 'leaderboard' | 'tournaments' | 'bons' | 'stats'>('matches');
    const [playersSubTab, setPlayersSubTab] = useState<'list' | 'history'>('list');
    
    // BON Creator State
    const [isBonCreatorOpen, setIsBonCreatorOpen] = useState(false);
    const [initialBonMatches, setInitialBonMatches] = useState<Match[]>([]);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    
    // Navigation History
    const [historyStack, setHistoryStack] = useState<string[]>([]);
    
    // Track if an update is in progress to prevent overlapping loops
    const isUpdatingRef = useRef(false);

    // Check for parser updates
    useEffect(() => {
        const CURRENT_PARSER_VERSION = '1.1.2';
        const autoUpdate = safeStorage.getItem('autoUpdateMatches') !== 'false';
        
        if (!autoUpdate || isUpdatingRef.current) return;

        const matchesToUpdate = allMatches.filter(match => 
            match.source === 'Demo' && match.parserVersion !== CURRENT_PARSER_VERSION && match.rawDemoJson
        );

        if (matchesToUpdate.length === 0) return;

        const updateMatches = async () => {
            isUpdatingRef.current = true;
            setLoadingState({
                isVisible: true,
                message: '正在升级比赛数据...',
                subMessage: `检测到解析器版本更新，正在重新解析 ${matchesToUpdate.length} 场比赛`,
                progress: 0
            });

            // Process asynchronously to avoid blocking UI
            for (let i = 0; i < matchesToUpdate.length; i++) {
                const match = matchesToUpdate[i];
                console.log(`Re-parsing match ${match.id} due to version mismatch: ${match.parserVersion} -> ${CURRENT_PARSER_VERSION}`);
                
                // Yield to event loop
                await new Promise(resolve => setTimeout(resolve, 10));
                
                try {
                    const updatedMatch = parseDemoJson(match.rawDemoJson!);
                    // Keep the original ID to overwrite, or delete old and save new.
                    // Overwriting is better to keep references in series/tournaments.
                    updatedMatch.id = match.id; 
                    updatedMatch.parserVersion = CURRENT_PARSER_VERSION;
                    
                    // Improve performance by deleting the raw demo JSON after re-parsing
                    delete updatedMatch.rawDemoJson;
                    
                    onSaveMatch(updatedMatch, match.groupId || 'local');
                } catch (e) {
                    console.error(`Failed to re-parse match ${match.id}`, e);
                }

                setLoadingState(prev => ({
                    ...prev,
                    progress: Math.round(((i + 1) / matchesToUpdate.length) * 100)
                }));
            }

            // Keep the overlay visible for a short time so the user can see it completed
            await new Promise(resolve => setTimeout(resolve, 500));

            setLoadingState({ isVisible: false, message: '' });
            isUpdatingRef.current = false;
        };

        updateMatches();
        
    }, [allMatches, onSaveMatch]);

    // Modals
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [pendingImportFiles, setPendingImportFiles] = useState<FileList | null>(null);

    const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
    const [showDebugger, setShowDebugger] = useState(false);
    
    // Loading State
    const [loadingState, setLoadingState] = useState<{
        isVisible: boolean;
        message: string;
        subMessage?: string;
        progress?: number;
    }>({ isVisible: false, message: '' });

    // Confirm Modal State
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    // Alert Modal State
    const [alertConfig, setAlertConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info';
    }>({ isOpen: false, title: '', message: '', type: 'info' });

    // File Input
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Search & Filter State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<FilterState>({
        type: 'all',
        map: 'all',
        server: 'all',
        result: 'all',
        rosterCount: 'all',
        customRosterCount: 5
    });

    // --- Helper: Get Roster Count ---
    const getRosterCount = (players: any[]) => {
        const rosterIds = new Set(ROSTER.map(r => r.id));
        let count = 0;
        players.forEach(p => {
            const resolved = resolveName(p.playerId);
            const resolvedSteam = resolveName(p.steamid);
            if (rosterIds.has(resolved) || rosterIds.has(resolvedSteam)) {
                count++;
            }
        });
        return count;
    };

    // --- Helper: Check Match Result ---
    const getMatchResult = (match: Match): 'win' | 'loss' | 'tie' | 'na' => {
        if (!isMyTeamMatch(match)) return 'na';
        const { us, them } = match.score;
        if (us > them) return 'win';
        if (them > us) return 'loss';
        return 'tie';
    };

    // --- Effects ---

    // Sync state with URL hash
    React.useEffect(() => {
        const handleHash = () => {
            const hash = window.location.hash.replace('#', '');
            if (hash.startsWith('match/')) {
                const id = hash.split('/')[1];
                const match = allMatches.find(m => m.id === id);
                if (match) {
                    setSelectedMatch(match);
                    setSelectedPlayerId(null);
                }
            } else if (hash.startsWith('player/')) {
                const id = hash.split('/')[1];
                setSelectedPlayerId(id);
                setSelectedMatch(null);
            } else if (hash === 'weapons' || hash === 'economy' || hash === 'events' || hash === 'tactics' || hash === 'utilities') {
                // If we are back to a main tab, clear selections
                setSelectedMatch(null);
                setSelectedPlayerId(null);
            }
        };

        window.addEventListener('hashchange', handleHash);
        handleHash();
        return () => window.removeEventListener('hashchange', handleHash);
    }, [allMatches]);

    // Update hash when selection changes
    React.useEffect(() => {
        if (selectedMatch) {
            window.location.hash = `match/${selectedMatch.id}`;
        } else if (selectedPlayerId) {
            window.location.hash = `player/${selectedPlayerId}`;
        }
    }, [selectedMatch, selectedPlayerId]);

    // --- Filtering Logic ---
    const { filteredMatches, availableMaps, availableServers } = useMemo(() => {
        // 1. Extract Available Options
        const maps = new Set<string>();
        const servers = new Set<string>();
        allMatches.forEach(m => {
            if (m.mapId) maps.add(m.mapId);
            if (m.serverName) servers.add(m.serverName);
        });

        // 2. Filter Function
        const matchesQuery = (m: Match) => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            
            // Map
            const mapId = m.mapId || '';
            if (mapId.toLowerCase().includes(q)) return true;
            if (getMapDisplayName(mapId).toLowerCase().includes(q)) return true;
            if (getMapEnName(mapId).toLowerCase().includes(q)) return true;
            if (('de_' + mapId).toLowerCase().includes(q)) return true;

            // Server
            if (m.serverName && m.serverName.toLowerCase().includes(q)) return true;

            // Score (13:11)
            const scoreRegex = /^(\d+)\s*[:：]\s*(\d+)$/;
            const scoreMatch = q.match(scoreRegex);
            if (scoreMatch) {
                const s1 = parseInt(scoreMatch[1]);
                const s2 = parseInt(scoreMatch[2]);
                if ((m.score.us === s1 && m.score.them === s2) || (m.score.us === s2 && m.score.them === s1)) return true;
            }

            // Players
            const allPlayers = [...m.players, ...m.enemyPlayers];
            return allPlayers.some(p => {
                // Nickname
                if (p.playerId && p.playerId.toLowerCase().includes(q)) return true;
                // SteamID (Exact 17 chars)
                if (p.steamid && p.steamid === q && q.length === 17) return true;
                // Resolved Name
                const r1 = resolveName(p.playerId).toLowerCase();
                const r2 = resolveName(p.steamid || null).toLowerCase();
                if (r1.includes(q) || r2.includes(q)) return true;
                return false;
            });
        };

        const matchesFilter = (m: Match) => {
            // Type
            if (filters.type === 'bon') return false;

            // Map
            if (filters.map !== 'all' && m.mapId !== filters.map) return false;

            // Server
            if (filters.server !== 'all' && m.serverName !== filters.server) return false;

            // Result
            if (filters.result !== 'all') {
                const res = getMatchResult(m);
                if (res !== filters.result) return false;
            }

            // Roster Count
            if (filters.rosterCount !== 'all') {
                const count = getRosterCount([...m.players, ...m.enemyPlayers]);
                
                if (filters.rosterCount === '5' && count !== 5) return false;
                if (filters.rosterCount === 'none' && count !== 0) return false;
                if (filters.rosterCount === 'any' && count === 0) return false;
                if (filters.rosterCount === 'custom' && count !== filters.customRosterCount) return false;
            }

            return true;
        };

        const fMatches = allMatches.filter(m => matchesQuery(m) && matchesFilter(m));

        return {
            filteredMatches: fMatches,
            availableMaps: Array.from(maps),
            availableServers: Array.from(servers)
        };
    }, [allMatches, searchQuery, filters]);

    // --- Stats Calculation for Player List ---
    const playerStats = useMemo(() => {
        const aggregated = MatchAggregator.aggregate(allMatches) as PlayerMatchStats[];
        const statsMap = new Map(aggregated.map(p => [p.playerId, p]));
        const steamMap = new Map(aggregated.filter(p => p.steamid).map(p => [p.steamid!, p]));

        return ROSTER.map(player => {
            const p = statsMap.get(player.id) || steamMap.get(player.id);
            
            if (!p) {
                return {
                    ...player,
                    matches: 0,
                    currentRank: '?',
                    avgRating: '0.00',
                    avgAdr: '0.0',
                    avgHs: '0.0',
                    totalK: 0, totalD: 0, totalA: 0,
                    kdRatio: '0.00',
                    steamid: undefined
                };
            }

            return {
                ...player,
                steamid: p.steamid,
                matches: (p as any).matchesPlayed || 0,
                currentRank: p.rank || '?',
                avgRating: p.rating.toFixed(2),
                avgAdr: p.adr.toFixed(1),
                avgHs: p.hsRate.toFixed(1),
                totalK: p.kills,
                totalD: p.deaths,
                totalA: p.assists,
                kdRatio: (p.kills / (p.deaths || 1)).toFixed(2)
            };
        });
    }, [allMatches]);

    // --- Handlers ---
    
    const pushCurrentStateToHistory = () => {
        if (selectedMatch) setHistoryStack(prev => [...prev, `match:${selectedMatch.id}`]);
        else if (selectedPlayerId) setHistoryStack(prev => [...prev, `player:${selectedPlayerId}`]);
        else setHistoryStack(prev => [...prev, `tab:${activeTab}`]);
    };

    const handlePlayerClick = (id: string) => {
        const resolved = resolveName(id);
        pushCurrentStateToHistory();
        setSelectedMatch(null);
        setSelectedPlayerId(resolved);
    };

    const handleMatchClick = (match: Match) => {
        pushCurrentStateToHistory();
        setSelectedPlayerId(null);
        setSelectedMatch(match);
    };

    const handleTabChange = (tab: 'matches' | 'players' | 'leaderboard' | 'tournaments' | 'stats') => {
        setActiveTab(tab);
        setSelectedMatch(null);
        setSelectedPlayerId(null);
        setHistoryStack([]);
    };

    const handleBack = () => {
        if (historyStack.length === 0) {
            // Fallback: Return to main interface
            setSelectedMatch(null);
            setSelectedPlayerId(null);
            window.location.hash = 'weapons';
            return;
        }
        
        const last = historyStack[historyStack.length - 1];
        setHistoryStack(prev => prev.slice(0, -1));
        
        if (!last) {
            // Fallback: Return to main interface
            setSelectedMatch(null);
            setSelectedPlayerId(null);
            window.location.hash = 'weapons';
            return;
        }

        const [type, id] = last.split(':');
        
        // Reset all selection states first
        setSelectedMatch(null);
        setSelectedPlayerId(null);
        
        // Apply state from history
        let found = false;
        if (type === 'match') {
            const m = allMatches.find(m => m.id === id);
            if (m) { setSelectedMatch(m); found = true; }
        }
        else if (type === 'player') {
            setSelectedPlayerId(id);
            found = true;
        }
        else if (type === 'tab') {
            setActiveTab(id as any);
            found = true;
        }

        // Fallback if item not found
        if (!found) {
            setHistoryStack([]);
            window.location.hash = 'weapons';
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (writableGroups.length === 0) {
            alert("请先新建一个战术包用于保存比赛数据。");
            return;
        }

        setPendingImportFiles(files);
        setIsImportModalOpen(true);
    };

    const handleImportConfirm = async (targetGroup: string) => {
        setIsImportModalOpen(false);
        if (!pendingImportFiles) return;
        
        const files = pendingImportFiles;
        const errors: ParseError[] = [];
        let successCount = 0;
        const totalFiles = files.length;

        setLoadingState({
            isVisible: true,
            message: '准备导入...',
            progress: 0
        });

        // Process files sequentially to allow UI updates
        for (let i = 0; i < totalFiles; i++) {
            const file = files[i];
            const currentProgress = Math.round((i / totalFiles) * 100);
            
            setLoadingState({
                isVisible: true,
                message: `正在解析 Demo 数据 (${i + 1}/${totalFiles})`,
                subMessage: file.name,
                progress: currentProgress
            });

            // Small delay to allow UI render cycle
            await new Promise(resolve => setTimeout(resolve, 50));

            try {
                // Read File
                const content = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => resolve(ev.target?.result as string);
                    reader.onerror = reject;
                    reader.readAsText(file);
                });

                // Parse
                // Fix precision loss for large numbers like steamid
                const fixedContent = content.replace(/"(steamid|attacker_steamid|user_steamid|assister_steamid|userid)"\s*:\s*(\d{16,20})/g, '"$1":"$2"');
                const json = JSON.parse(fixedContent);
                let match = parseDemoJson(json);
                
                // Save
                setLoadingState(prev => ({ ...prev, message: '正在保存数据...', subMessage: `${match.mapId} - ${match.date}` }));
                onSaveMatch(match, targetGroup);
                
                successCount++;
            } catch (err: any) {
                console.error("Parse error", file.name, err);
                errors.push({ filename: file.name, error: err.message || "Unknown error" });
            }
        }

        setLoadingState({ isVisible: false, message: '' });
        
        if (errors.length > 0) setParseErrors(errors);
        setPendingImportFiles(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleImportCancel = () => {
        setIsImportModalOpen(false);
        setPendingImportFiles(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleBatchDelete = (items: { type: 'match', id: string }[]) => {
        setConfirmConfig({
            isOpen: true,
            title: "批量删除",
            message: `确定要删除选中的 ${items.length} 项数据吗？此操作无法撤销。`,
            onConfirm: () => {
                items.forEach(item => {
                    if (item.type === 'match') {
                        const m = allMatches.find(m => m.id === item.id);
                        if (m) onDeleteMatch(m);
                    }
                });
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleShareMatch = async (match: Match) => {
        const json = JSON.stringify(match, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const filename = `match_${match.mapId}_${match.date.split('T')[0]}.json`;
        await shareFile(blob, filename, "分享比赛", `比赛数据: ${match.mapId} (${match.date})`);
    };

    const selectedPlayerStats = useMemo(() => {
        if (!selectedPlayerId) return null;
        
        // Use Aggregator for consistency
        const aggregated = MatchAggregator.aggregate(allMatches) as PlayerMatchStats[];
        const p = aggregated.find(x => resolveName(x.playerId) === selectedPlayerId || resolveName(x.steamid) === selectedPlayerId);
        
        if (!p) return null;

        // Get player history from all matches
        const history = allMatches
            .filter(m => [...m.players, ...m.enemyPlayers].some(px => resolveName(px.playerId) === selectedPlayerId || resolveName(px.steamid) === selectedPlayerId))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(m => {
                const stats = [...m.players, ...m.enemyPlayers].find(px => resolveName(px.playerId) === selectedPlayerId || resolveName(px.steamid) === selectedPlayerId)!;
                return { match: m, stats };
            });

        const fullStats = calculatePlayerStats(selectedPlayerId, history, 'ALL');
        const dynamicRole = identifyRole(fullStats.filtered);

        const profile = {
            id: selectedPlayerId,
            name: p.steamid && resolveName(p.steamid) !== p.steamid ? resolveName(p.steamid) : resolveName(p.playerId),
            role: dynamicRole.name,
            roleType: ROSTER.find(r => r.id === selectedPlayerId) ? 'Member' : 'Guest',
            steamid: p.steamid,
            matches: (p as any).matchesPlayed || 0,
            currentRank: p.rank || '?',
            avgRating: p.rating.toFixed(2),
            avgAdr: p.adr.toFixed(1),
            avgHs: p.hsRate.toFixed(1),
            totalK: p.kills,
            totalD: p.deaths,
            totalA: p.assists,
            kdRatio: (p.kills / (p.deaths || 1)).toFixed(2)
        };
            
        return { profile, history };
    }, [selectedPlayerId, allMatches]);

    // --- Views ---

    if (selectedMatch) {
        return (
            <>
                <MatchDetail 
                    match={selectedMatch}
                    onBack={handleBack}
                    onPlayerClick={handlePlayerClick}
                    onDelete={(m) => {
                        setConfirmConfig({
                            isOpen: true,
                            title: "删除比赛",
                            message: "确定要删除这场比赛记录吗？此操作无法撤销。",
                            onConfirm: () => {
                                onDeleteMatch(m);
                                setSelectedMatch(null);
                                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                            }
                        });
                    }}
                    onShare={handleShareMatch}
                />
                <ConfirmModal 
                    isOpen={confirmConfig.isOpen}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    onConfirm={confirmConfig.onConfirm}
                    onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                    isDangerous={true}
                />
            </>
        );
    }

    if (selectedPlayerId && selectedPlayerStats && selectedPlayerStats.profile) {
        return (
            <PlayerDetail 
                profile={selectedPlayerStats.profile}
                history={selectedPlayerStats.history}
                onBack={handleBack}
                onMatchClick={handleMatchClick}
            />
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
            <LoadingOverlay 
                isVisible={loadingState.isVisible} 
                message={loadingState.message} 
                subMessage={loadingState.subMessage}
                progress={loadingState.progress}
            />

            {/* Header / Toolbar */}
            <div className="flex gap-2 sticky top-[56px] z-30 bg-neutral-50/95 dark:bg-neutral-950/95 backdrop-blur-md py-3 -mx-4 px-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex flex-1 p-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl">
                    <button
                        onClick={() => handleTabChange('matches')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'matches' ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
                    >
                        赛程
                    </button>
                    <button
                        onClick={() => handleTabChange('tournaments')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'tournaments' ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
                    >
                        赛事
                    </button>
                    <button
                        onClick={() => handleTabChange('bons')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'bons' ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
                    >
                        BON
                    </button>
                    <button
                        onClick={() => handleTabChange('players')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'players' ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
                    >
                        队员
                    </button>
                    <button
                        onClick={() => handleTabChange('leaderboard')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'leaderboard' ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
                    >
                        排行榜
                    </button>
                    {isDebug && (
                        <button
                            onClick={() => handleTabChange('stats')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'stats' ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
                        >
                            统计
                        </button>
                    )}
                </div>

                <div className="flex gap-2">
                    {activeTab === 'players' && (
                        <button 
                            onClick={async () => {
                                setLoadingState({ isVisible: true, message: '正在准备导出数据...' });
                                
                                // 1. Calculate Full Stats for Each Player
                                const fullStats = playerStats.map(profile => {
                                    // Find matches for this player
                                    const history = allMatches
                                        .filter(m => [...m.players, ...m.enemyPlayers].some(p => resolveName(p.playerId) === profile.id || resolveName(p.steamid) === profile.id))
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map(m => {
                                            const stats = [...m.players, ...m.enemyPlayers].find(p => resolveName(p.playerId) === profile.id || resolveName(p.steamid) === profile.id)!;
                                            return { match: m, stats };
                                        });
                                    
                                    // Calculate Detailed Stats
                                    const detailedStats = calculatePlayerStats(profile.id, history, 'ALL');
                                    
                                    return {
                                        profile,
                                        stats: detailedStats,
                                        historyCount: history.length
                                    };
                                });

                                const result = await exportPlayersToJson(fullStats);
                                setLoadingState({ isVisible: false, message: '' });

                                if (result === 'downloaded') {
                                    setAlertConfig({
                                        isOpen: true,
                                        title: '导出成功 (下载)',
                                        message: '由于浏览器权限限制，无法直接调用分享菜单。已为您自动下载 JSON 文件。',
                                        type: 'success'
                                    });
                                } else if (result === 'error') {
                                    setAlertConfig({
                                        isOpen: true,
                                        title: '导出失败',
                                        message: '没有可导出的数据，或者发生了未知错误。',
                                        type: 'error'
                                    });
                                }
                            }}
                            className="w-10 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                            title="导出队员数据 (JSON)"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </button>
                    )}
                    {isDebug && (
                        <button 
                            onClick={() => setShowDebugger(true)}
                            className="w-10 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                            title="结构分析器"
                        >
                            <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                        </button>
                    )}
                    <label className="w-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-blue-500/20 cursor-pointer">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        <input type="file" className="hidden" accept=".json" multiple onChange={handleFileSelect} ref={fileInputRef} />
                    </label>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'matches' && (
                <MatchList 
                    matches={filteredMatches} 
                    onSelectMatch={handleMatchClick} 
                    onBatchDelete={handleBatchDelete}
                    onSearch={setSearchQuery}
                    onFilterChange={setFilters}
                    searchQuery={searchQuery}
                    availableMaps={availableMaps}
                    availableServers={availableServers}
                    onCreateBonFromMatches={(matches) => {
                        setInitialBonMatches(matches);
                        setIsBonCreatorOpen(true);
                    }}
                />
            )}

            {activeTab === 'tournaments' && (
                <TournamentView
                    allTournaments={allTournaments}
                    allMatches={allMatches}
                    writableGroups={writableGroups}
                    onSaveTournament={onSaveTournament}
                    onDeleteTournament={onDeleteTournament}
                    onSaveMatch={onSaveMatch}
                    onDeleteMatch={onDeleteMatch}
                />
            )}

            {activeTab === 'bons' && (
                <BonView
                    allBons={allBons}
                    allMatches={allMatches}
                    writableGroups={writableGroups}
                    onSaveBon={onSaveBon}
                    onDeleteBon={onDeleteBon}
                    onSaveMatch={onSaveMatch}
                    onDeleteMatch={onDeleteMatch}
                />
            )}

            {activeTab === 'players' && (
                <div className="space-y-6">
                    <div className="flex items-center gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl w-fit">
                        <button 
                            onClick={() => setPlayersSubTab('list')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${playersSubTab === 'list' ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
                        >
                            队员列表
                        </button>
                        <button 
                            onClick={() => setPlayersSubTab('history')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${playersSubTab === 'history' ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
                        >
                            变动记录
                        </button>
                    </div>

                    {playersSubTab === 'list' ? (
                        <PlayerList 
                            playerStats={playerStats} 
                            onSelectPlayer={handlePlayerClick} 
                        />
                    ) : (
                        <RosterTimelineView />
                    )}
                </div>
            )}

            {activeTab === 'leaderboard' && (
                <LeaderboardTab allMatches={allMatches} />
            )}

            {activeTab === 'stats' && (
                <StatsTab allMatches={allMatches} />
            )}

            {/* Modals */}
            <MatchImportModal 
                isOpen={isImportModalOpen} 
                onClose={handleImportCancel} 
                fileCount={pendingImportFiles?.length || 0}
                writableGroups={writableGroups}
                onConfirm={handleImportConfirm}
            />
            
            <ParseErrorModal 
                isOpen={parseErrors.length > 0} 
                onClose={() => setParseErrors([])} 
                errors={parseErrors} 
            />
            
            {isDebug && (
                <JsonDebugger 
                    isOpen={showDebugger} 
                    onClose={() => setShowDebugger(false)} 
                />
            )}

            <ConfirmModal 
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                isDangerous={true}
            />

            <AlertModal 
                isOpen={alertConfig.isOpen}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
            />

            <BonCreatorModal
                isOpen={isBonCreatorOpen}
                onClose={() => setIsBonCreatorOpen(false)}
                onSave={(bon, groupId) => {
                    onSaveBon(bon, groupId);
                    setActiveTab('bons'); // Switch to BON tab after creation
                }}
                writableGroups={writableGroups}
                initialMatches={initialBonMatches}
            />
        </div>
    );
};
