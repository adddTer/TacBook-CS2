
import React, { useState, useMemo, useRef } from 'react';
import { Match, MatchSeries, ContentGroup, PlayerMatchStats } from '../../types';
import { ROSTER } from '../../constants/roster';
import { resolveName } from '../../utils/demo/helpers';
import { MatchList } from './MatchList';
import { PlayerList } from './PlayerList';
import { MatchDetail } from './MatchDetail';
import { PlayerDetail } from './PlayerDetail';
import { SeriesDetail } from './SeriesDetail';
import { LeaderboardTab } from './LeaderboardTab';
import { SeriesCreatorModal } from '../SeriesCreatorModal';
import { MatchImportModal } from '../MatchImportModal';
import { parseDemoJson } from '../../utils/demoParser';
import { ParseError, ParseErrorModal } from '../ParseErrorModal';
import { JsonDebugger } from '../JsonDebugger';
import { shareFile } from '../../utils/shareHelper';
import { LoadingOverlay } from '../LoadingOverlay';
import { ConfirmModal } from '../ConfirmModal';

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

    // File Input
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            if (matchesPlayed.length > 0) {
                let sums = {
                    k: 0, d: 0, a: 0,
                    weightedRating: 0,
                    totalDamage: 0, 
                    totalHeadshots: 0,
                    rounds: 0
                };
                
                // Get display info from the latest match
                const latestMatch = matchesPlayed[0];
                const latestPlayer = [...latestMatch.players, ...latestMatch.enemyPlayers]
                    .find(p => resolveName(p.playerId) === selectedPlayerId || resolveName(p.steamid) === selectedPlayerId);
                
                // FIXED: Calculate displayName but also use it for profile.id to avoid showing SteamID
                let displayName = latestPlayer ? latestPlayer.playerId : selectedPlayerId;
                let currentRank = latestPlayer ? latestPlayer.rank : '?';
                let steamid = latestPlayer ? latestPlayer.steamid : undefined;

                matchesPlayed.forEach(m => {
                    const p = [...m.players, ...m.enemyPlayers].find(p => resolveName(p.playerId) === selectedPlayerId || resolveName(p.steamid) === selectedPlayerId)!;
                    
                    if (!steamid && p.steamid) steamid = p.steamid;
                    if (currentRank === '?' && p.rank) currentRank = p.rank;
                    // Note: displayName is already set from the latest match to prefer most recent name

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
                    id: displayName, // Use display name as ID for presentation
                    name: displayName,
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
                    matches={allMatches} 
                    series={allSeries}
                    onSelectMatch={setSelectedMatch} 
                    onSelectSeries={setSelectedSeries}
                    onBatchDelete={handleBatchDelete}
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
        </div>
    );
};
