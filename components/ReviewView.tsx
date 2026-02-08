
import React, { useState, useMemo, useRef } from 'react';
import { ROSTER } from '../constants/roster';
import { Match, PlayerMatchStats, Rank, ContentGroup } from '../types';
import { parseDemoJson } from '../utils/demoParser';
import { JsonDebugger } from './JsonDebugger';
import { ConfirmModal } from './ConfirmModal';
import { MatchList } from './review/MatchList';
import { MatchDetail } from './review/MatchDetail';
import { PlayerList } from './review/PlayerList';
import { PlayerDetail } from './review/PlayerDetail';
import { shareFile, downloadBlob } from '../utils/shareHelper';

// Helper to match roster IDs even if they vary slightly in legacy data
const getRosterId = (name: string) => {
    return name;
};

interface ReviewViewProps {
    allMatches: Match[];
    onSaveMatch: (match: Match, targetGroupId: string) => void;
    onDeleteMatch: (match: Match) => void;
    writableGroups: ContentGroup[];
}

export const ReviewView: React.FC<ReviewViewProps> = ({ 
    allMatches, 
    onSaveMatch, 
    onDeleteMatch,
    writableGroups 
}) => {
    const [activeTab, setActiveTab] = useState<'matches' | 'players'>('matches');
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    
    // Import state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDebuggerOpen, setIsDebuggerOpen] = useState(false);
    // Changed to support array of matches for bulk import
    const [saveModal, setSaveModal] = useState<{ matches: Match[], isOpen: boolean }>({ matches: [], isOpen: false });
    const [targetGroupId, setTargetGroupId] = useState(writableGroups.length > 0 ? writableGroups[0].metadata.id : '');

    // Confirm Delete
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, match: Match | null }>({ isOpen: false, match: null });

    // --- Calculations ---
    const playerStats = useMemo(() => {
        return ROSTER.map(player => {
            const matchesPlayed = allMatches
                .filter(m => m.players.some(p => getRosterId(p.playerId) === player.id))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                
            const totalMatches = matchesPlayed.length;
            
            if (totalMatches === 0) {
                return { 
                    ...player, 
                    matches: 0,
                    currentRank: '?' as Rank,
                    avgRating: '0.00',
                    avgAdr: '0.0',
                    // Removed avgWe
                    avgHs: '0.0',
                    totalK: 0,
                    totalD: 0,
                    totalA: 0,
                    kdRatio: '0.00'
                };
            }

            const latestMatchPlayer = matchesPlayed[0].players.find(p => getRosterId(p.playerId) === player.id);
            const currentRank = latestMatchPlayer?.rank || '?';

            let sums = {
                k: 0, d: 0, a: 0,
                rating: 0, adr: 0, hsRate: 0
            };

            matchesPlayed.forEach(m => {
                const p = m.players.find(p => getRosterId(p.playerId) === player.id)!;
                sums.k += p.kills;
                sums.d += p.deaths;
                sums.a += p.assists;
                sums.rating += p.rating;
                sums.adr += p.adr;
                sums.hsRate += p.hsRate;
            });

            return {
                ...player,
                matches: totalMatches,
                currentRank,
                avgRating: (sums.rating / totalMatches).toFixed(2),
                avgAdr: (sums.adr / totalMatches).toFixed(1),
                avgHs: (sums.hsRate / totalMatches).toFixed(1),
                totalK: sums.k,
                totalD: sums.d,
                totalA: sums.a,
                kdRatio: (sums.k / (sums.d || 1)).toFixed(2)
            };
        });
    }, [allMatches]);

    const selectedPlayerStats = useMemo(() => {
        if (!selectedPlayerId) return null;
        const profile = playerStats.find(p => p.id === selectedPlayerId);
        const history = allMatches.filter(m => m.players.some(p => getRosterId(p.playerId) === selectedPlayerId))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(m => {
                const stats = m.players.find(p => getRosterId(p.playerId) === selectedPlayerId)!;
                return { match: m, stats };
            });
        return { profile, history };
    }, [selectedPlayerId, playerStats, allMatches]);

    // --- Handlers ---
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const promises = Array.from(files).map((file: File) => {
            return new Promise<Match | null>((resolve) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const content = ev.target?.result as string;
                        const data = JSON.parse(content);
                        const matchData = parseDemoJson(data);
                        resolve(matchData);
                    } catch (err) {
                        console.error(`Error parsing file ${file.name}:`, err);
                        resolve(null);
                    }
                };
                reader.onerror = () => resolve(null);
                reader.readAsText(file);
            });
        });

        const results = await Promise.all(promises);
        const validMatches = results.filter((m): m is Match => m !== null);

        if (validMatches.length > 0) {
            // Open save modal
            if (writableGroups.length > 0) {
                setTargetGroupId(writableGroups[0].metadata.id);
                setSaveModal({ matches: validMatches, isOpen: true });
            } else {
                alert("请先创建一个可编辑的战术包来保存比赛记录");
            }
        } else {
            alert('没有找到有效的 Demo JSON 数据');
        }
        
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleConfirmSave = () => {
        if (saveModal.matches.length > 0 && targetGroupId) {
            saveModal.matches.forEach(match => {
                onSaveMatch(match, targetGroupId);
            });
            setSaveModal({ matches: [], isOpen: false });
        }
    };

    const handleDeleteClick = (match: Match) => {
        setConfirmDelete({ isOpen: true, match });
    };

    const handleShareMatch = async (match: Match) => {
        const jsonString = JSON.stringify([match], null, 2); // Wrap in array for compatibility with older imports
        const blob = new Blob([jsonString], { type: "application/json" });
        const safeMap = match.mapId.replace(/\s+/g, '_');
        const filename = `${match.date.split('T')[0]}_${safeMap}_${match.id.substring(0,6)}.json`;
        
        const success = await shareFile(blob, filename, "分享比赛记录", `TacBook Match: ${safeMap}`);
        if (!success) {
            downloadBlob(blob, filename);
        }
    };

    // --- Render Logic ---
    const renderActiveView = () => {
        // 1. Detail View: Player
        if (selectedPlayerId && selectedPlayerStats && selectedPlayerStats.profile) {
            return (
                <PlayerDetail 
                    profile={selectedPlayerStats.profile}
                    history={selectedPlayerStats.history}
                    onBack={() => setSelectedPlayerId(null)}
                    onMatchClick={(m) => { setSelectedPlayerId(null); setSelectedMatch(m); }}
                />
            );
        }

        // 2. Detail View: Match
        if (selectedMatch) {
            return (
                <MatchDetail 
                    match={selectedMatch}
                    onBack={() => setSelectedMatch(null)}
                    onPlayerClick={(id) => { setSelectedMatch(null); setSelectedPlayerId(id); }}
                    onDelete={handleDeleteClick}
                    onShare={handleShareMatch}
                />
            );
        }

        // 3. Main Dashboard View
        return (
            <div className="space-y-6 px-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Header / Action Bar */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex p-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('matches')}
                            className={`flex-1 sm:flex-none sm:w-32 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'matches' ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
                        >
                            赛程 Match
                        </button>
                        <button
                            onClick={() => setActiveTab('players')}
                            className={`flex-1 sm:flex-none sm:w-32 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'players' ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
                        >
                            队员 Roster
                        </button>
                    </div>
                    
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button 
                            onClick={() => setIsDebuggerOpen(true)}
                            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl flex items-center justify-center transition-colors text-xs font-bold flex-1 sm:flex-none"
                        >
                            Debug JSON
                        </button>
                        <button 
                            onClick={handleImportClick}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-blue-500/20 gap-2 font-bold text-xs flex-1 sm:flex-none"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            导入 Demo
                        </button>
                        {/* Hidden Input with multiple attribute */}
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept=".json" 
                            multiple
                            className="hidden" 
                            onChange={handleFileChange}
                        />
                    </div>
                </div>

                {/* Content Tabs */}
                {activeTab === 'matches' ? (
                    <MatchList 
                        matches={allMatches} 
                        onSelectMatch={setSelectedMatch}
                    />
                ) : (
                    <PlayerList 
                        playerStats={playerStats}
                        onSelectPlayer={setSelectedPlayerId}
                    />
                )}
            </div>
        );
    };

    return (
        <>
            {renderActiveView()}

            {/* Modals */}
            <JsonDebugger isOpen={isDebuggerOpen} onClose={() => setIsDebuggerOpen(false)} />
            
            {saveModal.isOpen && (
                <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800">
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
                            {saveModal.matches.length > 1 ? `批量保存 (${saveModal.matches.length})` : '保存比赛记录'}
                        </h3>
                        <p className="text-sm text-neutral-500 mb-4">
                            {saveModal.matches.length > 1 
                                ? `成功解析 ${saveModal.matches.length} 场比赛！请选择要保存到的战术包：`
                                : `Demo 解析成功 (${saveModal.matches[0]?.mapId})！请选择要保存到的战术包：`
                            }
                        </p>
                        
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">目标战术包</label>
                            <select 
                                value={targetGroupId}
                                onChange={(e) => setTargetGroupId(e.target.value)}
                                className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm font-bold dark:text-white outline-none"
                            >
                                {writableGroups.map(g => (
                                    <option key={g.metadata.id} value={g.metadata.id}>{g.metadata.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button 
                                onClick={() => setSaveModal({ matches: [], isOpen: false })}
                                className="px-4 py-2 text-sm font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                            >
                                取消
                            </button>
                            <button 
                                onClick={handleConfirmSave}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20"
                            >
                                {saveModal.matches.length > 1 ? '全部保存' : '确认保存'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal 
                isOpen={confirmDelete.isOpen}
                title="删除比赛记录"
                message={`确定要删除 ${confirmDelete.match?.mapId} (${confirmDelete.match?.date.split('T')[0]}) 的记录吗？此操作不可恢复。`}
                isDangerous={true}
                onConfirm={() => {
                    if (confirmDelete.match) {
                        onDeleteMatch(confirmDelete.match);
                        setSelectedMatch(null); // Ensure detail view is closed
                    }
                    setConfirmDelete({ isOpen: false, match: null });
                }}
                onCancel={() => setConfirmDelete({ isOpen: false, match: null })}
            />
        </>
    );
};
