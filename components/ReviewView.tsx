
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ROSTER } from '../constants/roster';
import { Match, PlayerMatchStats, Rank, ContentGroup, MatchSeries } from '../types';
import { parseDemoJson } from '../utils/demoParser';
import { JsonDebugger } from './JsonDebugger';
import { ConfirmModal } from './ConfirmModal';
import { MatchList } from './review/MatchList';
import { MatchDetail } from './review/MatchDetail';
import { PlayerList } from './review/PlayerList';
import { PlayerDetail } from './review/PlayerDetail';
import { SeriesCreatorModal } from './SeriesCreatorModal';
import { shareFile, downloadBlob } from '../utils/shareHelper';
import { ShareOptionsModal } from './ShareOptionsModal';
import { ParseErrorModal, ParseError } from './ParseErrorModal';
import html2canvas from 'html2canvas';

// Helper to match roster IDs even if they vary slightly in legacy data
const getRosterId = (name: string) => {
    return name;
};

interface ReviewViewProps {
    allMatches: Match[];
    allSeries?: MatchSeries[];
    onSaveSeries?: (series: MatchSeries, targetGroupId: string) => void;
    onDeleteSeries?: (series: MatchSeries) => void;

    onSaveMatch: (match: Match, targetGroupId: string) => void;
    onDeleteMatch: (match: Match) => void;
    writableGroups: ContentGroup[];
}

export const ReviewView: React.FC<ReviewViewProps> = ({ 
    allMatches, 
    allSeries = [],
    onSaveMatch, 
    onDeleteMatch,
    onSaveSeries,
    onDeleteSeries,
    writableGroups 
}) => {
    const [activeTab, setActiveTab] = useState<'matches' | 'players'>('matches');
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    
    // Import state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDebuggerOpen, setIsDebuggerOpen] = useState(false);
    const [isDebug, setIsDebug] = useState(false);

    // Parsing Errors
    const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

    // Save Modal
    const [saveModal, setSaveModal] = useState<{ matches: Match[], isOpen: boolean }>({ matches: [], isOpen: false });
    const [targetGroupId, setTargetGroupId] = useState(writableGroups.length > 0 ? writableGroups[0].metadata.id : '');

    // Series Creator
    const [isSeriesCreatorOpen, setIsSeriesCreatorOpen] = useState(false);

    // Confirm Delete
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, match?: Match, series?: MatchSeries }>({ isOpen: false });
    
    // Batch Delete Confirm
    const [confirmBatchDelete, setConfirmBatchDelete] = useState<{ isOpen: boolean, items: { type: 'match' | 'series', id: string }[] }>({ isOpen: false, items: [] });

    // Share State
    const [showShareModal, setShowShareModal] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    
    // Context for sharing: 'all' (list view) or 'single' (specific match)
    const [shareContext, setShareContext] = useState<{ type: 'all' | 'single', match?: Match }>({ type: 'all' });

    useEffect(() => {
        // Check for debug mode (API Key presence)
        const hasKey = !!process.env.API_KEY || !!localStorage.getItem('tacbook_gemini_api_key');
        setIsDebug(hasKey);
    }, []);

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

        // Find matches where the selected player participated
        // Supports finding by SteamID (preferred) or PlayerName
        const historyRaw = allMatches.map(m => {
            let p = m.players.find(pl => pl.steamid === selectedPlayerId || pl.playerId === selectedPlayerId);
            if (!p) p = m.enemyPlayers.find(pl => pl.steamid === selectedPlayerId || pl.playerId === selectedPlayerId);
            return p ? { match: m, stats: p } : null;
        }).filter(x => x !== null) as { match: Match, stats: PlayerMatchStats }[];

        if (historyRaw.length === 0) return null;

        // Sort by date desc
        const history = historyRaw.sort((a, b) => new Date(b.match.date).getTime() - new Date(a.match.date).getTime());
        const latestStats = history[0].stats;
        
        // Determine if Roster Member
        // demoParser ensures stats.playerId matches Roster ID if applicable
        const rosterMember = ROSTER.find(r => r.id === latestStats.playerId);

        // Calculate Aggregate Stats
        let sums = { k: 0, d: 0, a: 0, rating: 0, adr: 0, hsRate: 0, we: 0 };
        const totalMatches = history.length;
        
        history.forEach(({ stats }) => {
            sums.k += stats.kills;
            sums.d += stats.deaths;
            sums.a += stats.assists;
            sums.rating += stats.rating;
            sums.adr += stats.adr;
            sums.hsRate += stats.hsRate;
            sums.we += stats.we;
        });

        const profile = {
            id: rosterMember ? rosterMember.id : latestStats.playerId,
            name: rosterMember ? rosterMember.name : latestStats.playerId,
            role: rosterMember ? rosterMember.role : "陌生人",
            roleType: rosterMember ? rosterMember.roleType : "Player",
            steamid: latestStats.steamid,
            matches: totalMatches,
            currentRank: latestStats.rank,
            avgRating: (sums.rating / totalMatches).toFixed(2),
            avgAdr: (sums.adr / totalMatches).toFixed(1),
            avgHs: (sums.hsRate / totalMatches).toFixed(1),
            avgWe: (sums.we / totalMatches).toFixed(2),
            totalK: sums.k,
            totalD: sums.d,
            totalA: sums.a,
            kdRatio: (sums.k / (sums.d || 1)).toFixed(2)
        };

        return { profile, history };
    }, [selectedPlayerId, allMatches]);

    // --- Handlers ---
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        interface ParseResult {
            match: Match | null;
            error?: string;
            filename: string;
            success: boolean;
        }

        const promises = Array.from(files).map((file: File) => {
            return new Promise<ParseResult>((resolve) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const content = ev.target?.result as string;
                        const data = JSON.parse(content);
                        const matchData = parseDemoJson(data);
                        resolve({ match: matchData, filename: file.name, success: true });
                    } catch (err: any) {
                        console.error(`Error parsing file ${file.name}:`, err);
                        resolve({ match: null, error: err.message || "Unknown Format", filename: file.name, success: false });
                    }
                };
                reader.onerror = () => resolve({ match: null, error: "File Read Error", filename: file.name, success: false });
                reader.readAsText(file);
            });
        });

        const results = await Promise.all(promises);
        const validMatches = results.filter((r): r is ParseResult & { match: Match } => r.success && r.match !== null).map(r => r.match);
        const errors = results.filter(r => !r.success).map(r => ({ filename: r.filename, error: r.error || "Unknown Error" }));

        // Handle Errors
        if (errors.length > 0) {
            setParseErrors(errors);
            setIsErrorModalOpen(true);
        }

        // Handle Successes
        if (validMatches.length > 0) {
            // Open save modal
            if (writableGroups.length > 0) {
                setTargetGroupId(writableGroups[0].metadata.id);
                setSaveModal({ matches: validMatches, isOpen: true });
            } else {
                alert("请先创建一个可编辑的战术包来保存比赛记录");
            }
        } else if (errors.length === 0) {
            // Edge case: No errors but no valid matches (e.g., valid JSON but returned null?)
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

    const handleDeleteClick = (e: React.MouseEvent, match: Match) => {
        e.stopPropagation();
        setConfirmDelete({ isOpen: true, match });
    };

    // Triggered from MatchDetail (only for single delete)
    // For Series deletion from MatchList, we handle it via handleBatchDelete or need a separate handler if single
    // But since we removed single delete button from MatchList, this is mainly for MatchDetail view.

    const handleBatchDelete = (items: { type: 'match' | 'series', id: string }[]) => {
        setConfirmBatchDelete({ isOpen: true, items });
    };

    const confirmBatchDeleteAction = () => {
        const { items } = confirmBatchDelete;
        
        items.forEach(item => {
            if (item.type === 'match') {
                const match = allMatches.find(m => m.id === item.id);
                if (match) onDeleteMatch(match);
            } else {
                const series = allSeries.find(s => s.id === item.id);
                if (series && onDeleteSeries) onDeleteSeries(series);
            }
        });
        
        setConfirmBatchDelete({ isOpen: false, items: [] });
    };

    const openShareModal = (type: 'all' | 'single', match?: Match) => {
        setShareContext({ type, match });
        setShowShareModal(true);
    };

    // --- Share Logic ---

    const createJsonBlob = () => {
        let data: any;
        let filename = '';
        let title = '';

        if (shareContext.type === 'single' && shareContext.match) {
            // Single Match
            const m = shareContext.match;
            data = [m]; // Array wrap for compatibility
            const safeMap = m.mapId.replace(/\s+/g, '_');
            filename = `${m.date.split('T')[0]}_${safeMap}_${m.id.substring(0,6)}.json`;
            title = `TacBook Match: ${safeMap}`;
        } else {
            // All Matches
            data = allMatches;
            const dateStr = new Date().toISOString().split('T')[0];
            filename = `TacBook_TeamData_${dateStr}.json`;
            title = `TacBook Team Data (${allMatches.length} matches)`;
        }

        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        return { blob, filename, title };
    };

    const handleShareJson = async () => {
        const { blob, filename, title } = createJsonBlob();
        await shareFile(blob, filename, "分享数据", title);
        setShowShareModal(false);
    };

    const handleDownloadJson = () => {
        const { blob, filename } = createJsonBlob();
        downloadBlob(blob, filename);
        setShowShareModal(false);
    };

    const generateImage = async (callback: (blob: Blob) => void) => {
        setIsGeneratingImage(true);
        try {
            // Determine capture target based on context or current view
            const elementId = 'review-content-capture'; 
            
            const element = document.getElementById(elementId);
            if (element) {
                const canvas = await html2canvas(element, {
                    backgroundColor: document.documentElement.classList.contains('dark') ? '#0a0a0a' : '#fafafa', // Match bg
                    useCORS: true,
                    scale: 2,
                    ignoreElements: (el) => el.classList.contains('no-capture')
                });
                
                canvas.toBlob((blob) => {
                    if (blob) callback(blob);
                    setIsGeneratingImage(false);
                    setShowShareModal(false);
                }, 'image/png');
            } else {
                setIsGeneratingImage(false);
            }
        } catch (e) {
            console.error("Image generation failed", e);
            setIsGeneratingImage(false);
            setShowShareModal(false);
            alert("图片生成失败");
        }
    };

    const handleShareImage = () => {
        generateImage(async (blob) => {
            const dateStr = new Date().toISOString().split('T')[0];
            const prefix = shareContext.type === 'single' ? 'MatchStats' : 'TeamStats';
            const filename = `TacBook_${prefix}_${dateStr}.png`;
            await shareFile(blob, filename, "分享战报图片", `TacBook Stats`);
        });
    };

    const handleDownloadImage = () => {
        generateImage((blob) => {
            const dateStr = new Date().toISOString().split('T')[0];
            const prefix = shareContext.type === 'single' ? 'MatchStats' : 'TeamStats';
            const filename = `TacBook_${prefix}_${dateStr}.png`;
            downloadBlob(blob, filename);
        });
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
                    onDelete={(m) => handleDeleteClick({ stopPropagation: () => {} } as any, m)}
                    onShare={(m) => openShareModal('single', m)}
                />
            );
        }

        // 3. Main Dashboard View
        return (
            <div id="review-content-capture" className="space-y-6 px-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
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
                        {writableGroups.length > 0 && activeTab === 'matches' && (
                             <button 
                                onClick={() => setIsSeriesCreatorOpen(true)}
                                className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl flex items-center justify-center transition-colors text-xs font-bold flex-1 sm:flex-none no-capture"
                            >
                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                创建系列赛
                            </button>
                        )}
                        
                         <button 
                            onClick={() => openShareModal('all')}
                            className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl flex items-center justify-center transition-colors text-xs font-bold flex-1 sm:flex-none no-capture"
                        >
                             <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                             导出/分享
                        </button>
                        
                        {isDebug && (
                            <button 
                                onClick={() => setIsDebuggerOpen(true)}
                                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl flex items-center justify-center transition-colors text-xs font-bold flex-1 sm:flex-none no-capture"
                            >
                                Debug
                            </button>
                        )}

                        <button 
                            onClick={handleImportClick}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-blue-500/20 gap-2 font-bold text-xs flex-1 sm:flex-none no-capture"
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
                        series={allSeries}
                        onSelectMatch={setSelectedMatch}
                        onBatchDelete={handleBatchDelete}
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
            
            <ParseErrorModal 
                isOpen={isErrorModalOpen} 
                onClose={() => setIsErrorModalOpen(false)} 
                errors={parseErrors} 
            />

            <SeriesCreatorModal 
                isOpen={isSeriesCreatorOpen}
                onClose={() => setIsSeriesCreatorOpen(false)}
                availableMatches={allMatches}
                writableGroups={writableGroups}
                onSave={onSaveSeries ? onSaveSeries : () => alert('Storage not connected')}
            />

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
                title={confirmDelete.series ? "删除系列赛" : "删除比赛记录"}
                message={confirmDelete.series 
                    ? `确定要删除系列赛 "${confirmDelete.series.title}" 吗？\n(单场比赛记录不会被删除)` 
                    : `确定要删除 ${confirmDelete.match?.mapId} 的记录吗？此操作不可恢复。`}
                isDangerous={true}
                onConfirm={() => {
                    if (confirmDelete.series && onDeleteSeries) {
                        onDeleteSeries(confirmDelete.series);
                    } else if (confirmDelete.match) {
                        onDeleteMatch(confirmDelete.match);
                        setSelectedMatch(null); 
                    }
                    setConfirmDelete({ isOpen: false, match: undefined, series: undefined });
                }}
                onCancel={() => setConfirmDelete({ isOpen: false, match: undefined, series: undefined })}
            />
            
             <ConfirmModal 
                isOpen={confirmBatchDelete.isOpen}
                title="批量删除"
                message={`确定要删除选中的 ${confirmBatchDelete.items.length} 个项目吗？\n此操作不可恢复。`}
                isDangerous={true}
                onConfirm={confirmBatchDeleteAction}
                onCancel={() => setConfirmBatchDelete({ isOpen: false, items: [] })}
            />

            <ShareOptionsModal 
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                onShareFile={handleShareJson}
                onDownloadFile={handleDownloadJson}
                onShareImage={handleShareImage}
                onDownloadImage={handleDownloadImage}
                title={shareContext.type === 'single' ? `分享 "${shareContext.match?.mapId}"` : "批量分享/导出"}
                isGenerating={isGeneratingImage}
            />
        </>
    );
};