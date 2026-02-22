
import React, { useState, useMemo, useRef } from 'react';
import { Match, MatchSeries, ContentGroup, PlayerMatchStats } from '../types';
import { ROSTER } from '../constants/roster';
import { resolveName } from '../utils/demo/helpers';
import { getMapDisplayName, getMapEnName } from '../utils/matchHelpers';
import { MatchList } from './review/MatchList';
import { PlayerList } from './review/PlayerList';
import { MatchDetail } from './review/MatchDetail';
import { PlayerDetail } from './review/PlayerDetail';
import { SeriesDetail } from './review/SeriesDetail';
import { LeaderboardTab } from './review/LeaderboardTab';
import { SeriesCreatorModal } from './SeriesCreatorModal';
import { MatchImportModal } from './MatchImportModal';
import { parseDemoJson } from '../utils/demoParser';
import { ParseError, ParseErrorModal } from './ParseErrorModal';
import { JsonDebugger } from './JsonDebugger';
import { shareFile } from '../utils/shareHelper';
import { LoadingOverlay } from './LoadingOverlay';
import { ConfirmModal } from './ConfirmModal';
import { AlertModal } from './AlertModal';

import { exportPlayersToJson } from '../utils/exportPlayers';
import { calculatePlayerStats } from '../utils/analytics/playerStatsCalculator';

interface ReviewViewProps {
    allMatches: Match[];
    allSeries: MatchSeries[];
    onSaveMatch: (match: Match, groupId: string) => void;
    onSaveSeries: (series: MatchSeries, groupId: string) => void;
    onDeleteMatch: (match: Match) => void;
    onDeleteSeries: (series: MatchSeries) => void;
    writableGroups: ContentGroup[];
}

export const ReviewView: React.FC<ReviewViewProps> = ({
    allMatches,
    allSeries,
    onSaveMatch,
    onSaveSeries,
    onDeleteMatch,
    onDeleteSeries,
    writableGroups
}) => {
    const [activeTab, setActiveTab] = useState<'matches' | 'players' | 'leaderboard'>('matches');
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [selectedSeries, setSelectedSeries] = useState<MatchSeries | null>(null);
    
    // Modals
    const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
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

    // --- Helper: Check Series Result ---
    const getSeriesResult = (series: MatchSeries, matches: Match[]): 'win' | 'loss' | 'tie' | 'na' => {
        let myWins = 0;
        let oppWins = 0;
        let hasMyTeam = false;

        series.matches.forEach(ref => {
            const m = matches.find(x => x.id === ref.matchId);
            if (m && isMyTeamMatch(m)) {
                hasMyTeam = true;
                // "us" is always My Team in the parsed match object
                if (m.score.us > m.score.them) myWins++;
                else if (m.score.them > m.score.us) oppWins++;
            }
        });

        if (!hasMyTeam) return 'na';
        if (myWins > oppWins) return 'win';
        if (oppWins > myWins) return 'loss';
        return 'tie';
    };

    // --- Filtering Logic ---
    const { filteredMatches, filteredSeries, availableMaps, availableServers } = useMemo(() => {
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
            if (filters.type === 'series') return false;

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

        const seriesQuery = (s: MatchSeries) => {
            if (!searchQuery) return true;
            if (s.title.toLowerCase().includes(searchQuery.toLowerCase())) return true;
            
            const subMatches = s.matches.map(ref => allMatches.find(m => m.id === ref.matchId)).filter(Boolean) as Match[];
            return subMatches.some(m => matchesQuery(m));
        };

        const seriesFilter = (s: MatchSeries) => {
            // Type
            if (filters.type === 'match') return false;

            const subMatches = s.matches.map(ref => allMatches.find(m => m.id === ref.matchId)).filter(Boolean) as Match[];

            // Map (If any match has map)
            if (filters.map !== 'all') {
                if (!subMatches.some(m => m.mapId === filters.map)) return false;
            }

            // Server (If any match has server)
            if (filters.server !== 'all') {
                if (!subMatches.some(m => m.serverName === filters.server)) return false;
            }

            // Result
            if (filters.result !== 'all') {
                const res = getSeriesResult(s, allMatches);
                if (res !== filters.result) return false;
            }

            // Roster Count
            if (filters.rosterCount !== 'all') {
                const satisfies = subMatches.some(m => {
                    const count = getRosterCount([...m.players, ...m.enemyPlayers]);
                    if (filters.rosterCount === '5') return count === 5;
                    if (filters.rosterCount === 'none') return count === 0;
                    if (filters.rosterCount === 'any') return count > 0;
                    if (filters.rosterCount === 'custom') return count === filters.customRosterCount;
                    return true;
                });
                if (!satisfies) return false;
            }

            return true;
        };

        const fMatches = allMatches.filter(m => matchesQuery(m) && matchesFilter(m));
        const fSeries = allSeries.filter(s => seriesQuery(s) && seriesFilter(s));

        return {
            filteredMatches: fMatches,
            filteredSeries: fSeries,
            availableMaps: Array.from(maps),
            availableServers: Array.from(servers)
        };
    }, [allMatches, allSeries, searchQuery, filters]);

    // --- Stats Calculation for Player List ---
    const playerStats = useMemo(() => {
        return ROSTER.map(player => {
            // Find matches where this player participated
            const matchesPlayed = allMatches.filter(m => {
                const allP = [...m.players, ...m.enemyPlayers];
                return allP.some(p => resolveName(p.playerId) === player.id || resolveName(p.steamid) === player.id);
            }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const totalMatches = matchesPlayed.length;

            if (totalMatches === 0) {
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

            // Logic from the snippet
            const latestMatch = matchesPlayed[0];
            const latestMatchPlayer = [...latestMatch.players, ...latestMatch.enemyPlayers]
                .find(p => resolveName(p.playerId) === player.id || resolveName(p.steamid) === player.id);
                
            const currentRank = latestMatchPlayer?.rank || '?';
            const steamid = latestMatchPlayer?.steamid;

            // Accumulators
            let sums = {
                k: 0, d: 0, a: 0,
                weightedRating: 0,
                totalDamage: 0, 
                totalHeadshots: 0, // Sum of headshot counts
                rounds: 0
            };

            matchesPlayed.forEach(m => {
                const p = [...m.players, ...m.enemyPlayers].find(p => resolveName(p.playerId) === player.id || resolveName(p.steamid) === player.id)!;
                
                // Use actual rounds played if available (Rating 3.0+), else estimate from score
                const rounds = p.r3_rounds_played || (m.score.us + m.score.them) || 1;

                sums.k += p.kills;
                sums.d += p.deaths;
                sums.a += p.assists;
                
                // Weighting logic: Value * Rounds for Rating
                sums.weightedRating += p.rating * rounds;
                
                // Weighting logic: Total Damage for ADR
                if (p.total_damage) {
                    sums.totalDamage += p.total_damage;
                } else {
                    sums.totalDamage += p.adr * rounds;
                }
                
                // Weighting logic: Headshot Count for HS%
                // If explicit count is missing, estimate from rate
                const hsCount = (p as any).headshots !== undefined 
                    ? (p as any).headshots 
                    : Math.round(p.kills * (p.hsRate / 100));
                sums.totalHeadshots += hsCount;

                sums.rounds += rounds;
            });

            const totalRounds = sums.rounds || 1;
            const totalKills = sums.k || 1;

            return {
                ...player,
                steamid,
                matches: totalMatches,
                currentRank,
                // Calculate weighted averages
                avgRating: (sums.weightedRating / totalRounds).toFixed(2),
                avgAdr: (sums.totalDamage / totalRounds).toFixed(1),
                avgHs: ((sums.totalHeadshots / totalKills) * 100).toFixed(1), // HS% = Total HS / Total Kills
                
                totalK: sums.k,
                totalD: sums.d,
                totalA: sums.a,
                kdRatio: (sums.k / (sums.d || 1)).toFixed(2)
            };
        });
    }, [allMatches]);

    // --- Handlers ---
    
    const handlePlayerClick = (id: string) => {
        const resolved = resolveName(id);
        setSelectedMatch(null);
        setSelectedSeries(null);
        setSelectedPlayerId(resolved);
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
                const json = JSON.parse(content);
                const match = parseDemoJson(json);
                
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

    const handleBatchDelete = (items: { type: 'match' | 'series', id: string }[]) => {
        setConfirmConfig({
            isOpen: true,
            title: "批量删除",
            message: `确定要删除选中的 ${items.length} 项数据吗？此操作无法撤销。`,
            onConfirm: () => {
                items.forEach(item => {
                    if (item.type === 'match') {
                        const m = allMatches.find(m => m.id === item.id);
                        if (m) onDeleteMatch(m);
                    } else {
                        const s = allSeries.find(s => s.id === item.id);
                        if (s) onDeleteSeries(s);
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
        let profile = playerStats.find(p => p.id === selectedPlayerId || (p.steamid && p.steamid === selectedPlayerId));
        
        // Handle Non-Roster Players (Guest / Enemy)
        if (!profile) {
            const matchesPlayed = allMatches.filter(m => {
                const allP = [...m.players, ...m.enemyPlayers];
                return allP.some(p => resolveName(p.playerId) === selectedPlayerId || resolveName(p.steamid) === selectedPlayerId);
            });

            if (matchesPlayed.length > 0) {
                let sums = {
                    k: 0, d: 0, a: 0,
                    weightedRating: 0,
                    totalDamage: 0, 
                    totalHeadshots: 0,
                    rounds: 0
                };
                
                let steamid = undefined;
                let currentRank = '?';

                matchesPlayed.forEach(m => {
                    const p = [...m.players, ...m.enemyPlayers].find(p => resolveName(p.playerId) === selectedPlayerId || resolveName(p.steamid) === selectedPlayerId)!;
                    
                    if (p.steamid) steamid = p.steamid;
                    if (p.rank) currentRank = p.rank;

                    const rounds = p.r3_rounds_played || (m.score.us + m.score.them) || 1;

                    sums.k += p.kills;
                    sums.d += p.deaths;
                    sums.a += p.assists;
                    sums.weightedRating += p.rating * rounds;
                    
                    if (p.total_damage) {
                        sums.totalDamage += p.total_damage;
                    } else {
                        sums.totalDamage += p.adr * rounds;
                    }
                    
                    const hsCount = (p as any).headshots !== undefined 
                        ? (p as any).headshots 
                        : Math.round(p.kills * (p.hsRate / 100));
                    sums.totalHeadshots += hsCount;

                    sums.rounds += rounds;
                });
                
                const totalRounds = sums.rounds || 1;
                const totalKills = sums.k || 1;
                
                profile = {
                    id: selectedPlayerId,
                    name: selectedPlayerId,
                    role: '陌生人',
                    roleType: 'Guest',
                    steamid,
                    matches: matchesPlayed.length,
                    currentRank,
                    avgRating: (sums.weightedRating / totalRounds).toFixed(2),
                    avgAdr: (sums.totalDamage / totalRounds).toFixed(1),
                    avgHs: ((sums.totalHeadshots / totalKills) * 100).toFixed(1),
                    totalK: sums.k,
                    totalD: sums.d,
                    totalA: sums.a,
                    kdRatio: (sums.k / (sums.d || 1)).toFixed(2)
                };
            }
        }

        if (!profile) return null;
        
        // Get player history from all matches
        const history = allMatches
            .filter(m => [...m.players, ...m.enemyPlayers].some(p => resolveName(p.playerId) === selectedPlayerId || resolveName(p.steamid) === selectedPlayerId))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(m => {
                const stats = [...m.players, ...m.enemyPlayers].find(p => resolveName(p.playerId) === selectedPlayerId || resolveName(p.steamid) === selectedPlayerId)!;
                return { match: m, stats };
            });
            
        return { profile, history };
    }, [selectedPlayerId, playerStats, allMatches]);

    // --- Views ---

    if (selectedMatch) {
        return (
            <>
                <MatchDetail 
                    match={selectedMatch}
                    onBack={() => setSelectedMatch(null)}
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

    if (selectedSeries) {
        return (
            <SeriesDetail 
                series={selectedSeries}
                allMatches={allMatches}
                onBack={() => setSelectedSeries(null)}
                onSelectMatch={setSelectedMatch}
                onSelectPlayer={handlePlayerClick}
            />
        );
    }

    if (selectedPlayerId && selectedPlayerStats && selectedPlayerStats.profile) {
        return (
            <PlayerDetail 
                profile={selectedPlayerStats.profile}
                history={selectedPlayerStats.history}
                onBack={() => setSelectedPlayerId(null)}
                onMatchClick={(m) => {
                    setSelectedPlayerId(null);
                    setSelectedMatch(m);
                }}
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
                        onClick={() => setActiveTab('matches')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'matches' ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
                    >
                        赛程
                    </button>
                    <button
                        onClick={() => setActiveTab('players')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'players' ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
                    >
                        队员
                    </button>
                    <button
                        onClick={() => setActiveTab('leaderboard')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'leaderboard' ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
                    >
                        排行榜
                    </button>
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
                    <button 
                        onClick={() => setIsSeriesModalOpen(true)}
                        className="w-10 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                        title="创建系列赛"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </button>
                    <button 
                        onClick={() => setShowDebugger(true)}
                        className="w-10 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                        title="JSON Debugger"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                    </button>
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
                    series={filteredSeries}
                    onSelectMatch={setSelectedMatch} 
                    onSelectSeries={setSelectedSeries}
                    onBatchDelete={handleBatchDelete}
                    onSearch={setSearchQuery}
                    onFilterChange={setFilters}
                    availableMaps={availableMaps}
                    availableServers={availableServers}
                />
            )}

            {activeTab === 'players' && (
                <PlayerList 
                    playerStats={playerStats} 
                    onSelectPlayer={setSelectedPlayerId} 
                />
            )}

            {activeTab === 'leaderboard' && (
                <LeaderboardTab allMatches={allMatches} />
            )}

            {/* Modals */}
            <MatchImportModal 
                isOpen={isImportModalOpen} 
                onClose={handleImportCancel} 
                fileCount={pendingImportFiles?.length || 0}
                writableGroups={writableGroups}
                onConfirm={handleImportConfirm}
            />

            <SeriesCreatorModal 
                isOpen={isSeriesModalOpen} 
                onClose={() => setIsSeriesModalOpen(false)}
                availableMatches={allMatches}
                writableGroups={writableGroups}
                onSave={onSaveSeries}
            />
            
            <ParseErrorModal 
                isOpen={parseErrors.length > 0} 
                onClose={() => setParseErrors([])} 
                errors={parseErrors} 
            />
            
            <JsonDebugger 
                isOpen={showDebugger} 
                onClose={() => setShowDebugger(false)} 
            />

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
        </div>
    );
};
