
import React, { useState } from 'react';
import { Match, PlayerMatchStats, ClutchRecord, MultiKillBreakdown } from '../../types';
import { ROSTER } from '../../constants/roster';
import { SourceBadge, DataDefinitionsModal, getMapDisplayName, getRatingColorClass } from './ReviewShared';

interface MatchDetailProps {
    match: Match;
    onBack: () => void;
    onPlayerClick: (id: string) => void;
    onDelete: (match: Match) => void;
    onShare: (match: Match) => void;
}

type SideFilter = 'ALL' | 'CT' | 'T';

// --- COMPONENT: Data Popup Cell ---
interface DataPopupCellProps {
    value: number | string;
    title: string;
    data: { label: string; value: number | string }[];
    isActive: boolean;
    onClick: (e: React.MouseEvent) => void;
    align?: 'top' | 'bottom';
    highlight?: boolean;
}

const DataPopupCell: React.FC<DataPopupCellProps> = ({ value, title, data, isActive, onClick, align = 'bottom', highlight = false }) => {
    // align 'top' means popup sits ABOVE the trigger (bottom-full)
    // align 'bottom' means popup sits BELOW the trigger (top-full)
    
    const popupClass = align === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
    const arrowClass = align === 'top' ? '-bottom-1 border-b border-r' : '-top-1 border-t border-l';

    return (
        <div className="relative inline-block">
            <button 
                onClick={onClick}
                className={`px-2 py-1 rounded text-xs font-bold font-sans transition-colors min-w-[2rem] ${isActive ? 'bg-purple-600 text-white' : highlight ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-purple-100 dark:hover:bg-purple-900/30'}`}
            >
                {value}
            </button>
            
            {isActive && (
                <div className={`absolute left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl rounded-lg p-2 min-w-[120px] animate-in zoom-in-95 duration-200 ${popupClass}`}>
                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 text-center whitespace-nowrap">{title}</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        {data.map((item, idx) => (
                            <React.Fragment key={idx}>
                                <div className="text-neutral-500 text-right">{item.label}:</div>
                                <div className="font-mono font-bold text-neutral-900 dark:text-white text-left">{item.value}</div>
                            </React.Fragment>
                        ))}
                    </div>
                    {/* Arrow */}
                    <div className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 transform rotate-45 ${arrowClass}`}></div>
                </div>
            )}
        </div>
    );
};

// --- TAB: SCOREBOARD ---
const ScoreboardTab = ({ 
    players, 
    enemyPlayers, 
    onPlayerClick, 
    filter 
}: { 
    players: PlayerMatchStats[], 
    enemyPlayers: PlayerMatchStats[], 
    onPlayerClick: (id: string) => void,
    filter: SideFilter
}) => {
    const [activePopup, setActivePopup] = useState<{ id: string, type: 'mk' | 'clutch' } | null>(null);

    const handlePopupClick = (e: React.MouseEvent, id: string, type: 'mk' | 'clutch') => {
        e.stopPropagation();
        if (activePopup && activePopup.id === id && activePopup.type === type) {
            setActivePopup(null);
        } else {
            setActivePopup({ id, type });
        }
    };
    
    const closePopup = () => setActivePopup(null);

    // Helper to format popup data
    const getMultiKillData = (mk: MultiKillBreakdown) => [
        { label: '5K', value: mk.k5 || 0 },
        { label: '4K', value: mk.k4 || 0 },
        { label: '3K', value: mk.k3 || 0 },
        { label: '2K', value: mk.k2 || 0 },
    ];

    const getClutchData = (clutches: ClutchRecord) => [
        { label: '1v1', value: clutches['1v1']?.won || 0 },
        { label: '1v2', value: clutches['1v2']?.won || 0 },
        { label: '1v3', value: clutches['1v3']?.won || 0 },
        { label: '1v4', value: clutches['1v4']?.won || 0 },
        { label: '1v5', value: clutches['1v5']?.won || 0 },
    ];

    const defaultClutches: ClutchRecord = {
        '1v1': { won: 0, lost: 0 },
        '1v2': { won: 0, lost: 0 },
        '1v3': { won: 0, lost: 0 },
        '1v4': { won: 0, lost: 0 },
        '1v5': { won: 0, lost: 0 }
    };

    // Note: Actual filtering logic is placeholder until data structure supports side-splits
    const getFilterStyle = (isEnemy: boolean) => {
        if (filter === 'ALL') return isEnemy ? 'bg-red-50/50 dark:bg-red-900/10 text-red-500' : 'bg-blue-50/50 dark:bg-blue-900/10 text-blue-500';
        if (filter === 'CT') return 'bg-blue-50/50 dark:bg-blue-900/10 text-blue-500';
        if (filter === 'T') return 'bg-yellow-50/50 dark:bg-yellow-900/10 text-yellow-600';
        return '';
    };

    const renderTable = (teamPlayers: PlayerMatchStats[], isEnemy: boolean) => {
        const sortedPlayers = [...teamPlayers].sort((a,b) => b.rating - a.rating);
        
        return (
        <div className="overflow-x-auto pb-8"> 
            <table className="w-full text-sm text-left whitespace-nowrap min-w-[800px] border-collapse font-sans">
                <thead>
                    <tr className={`text-[10px] uppercase font-bold border-b border-neutral-100 dark:border-neutral-800 ${getFilterStyle(isEnemy)}`}>
                        <th className="px-3 py-3 sticky left-0 z-10 bg-inherit w-36">{isEnemy ? '敌方' : '我方'} {filter !== 'ALL' ? `(${filter})` : ''}</th>
                        <th className="px-2 py-3 text-center w-20">K / D / A</th>
                        <th className="px-2 py-3 text-center w-12">+/-</th>
                        <th className="px-2 py-3 text-center w-12" title="平均每回合伤害">ADR</th>
                        <th className="px-2 py-3 text-center w-12" title="KAST% (Kill, Assist, Survive, Traded) - 回合贡献率">KAST%</th>
                        <th className="px-2 py-3 text-center w-12" title="Rating 4.0">RTG</th>
                        
                        {/* New Metrics */}
                        <th className="px-2 py-3 text-center w-12" title="首杀 (Entry Kills)">首杀</th>
                        <th className="px-2 py-3 text-center w-12" title="多杀 (Multi-Kills)">多杀</th>
                        <th className="px-2 py-3 text-center w-12" title="残局获胜 (1vN Wins)">残局</th>
                        
                        <th className="px-2 py-3 text-center w-14">爆头</th>
                        <th className="px-2 py-3 text-center w-14">道具伤</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                    {sortedPlayers.map((p, idx) => {
                        const kdDiff = p.kills - p.deaths;
                        const rosterId = ROSTER.find(r => r.id === p.playerId || r.name === p.playerId)?.id || p.playerId;
                        const isRosterMember = ROSTER.some(r => r.id === rosterId);
                        const ratingColor = getRatingColorClass(p.rating, 'bg');
                        
                        // Calculated Data
                        const multiKills = p.multikills || { k2: 0, k3: 0, k4: 0, k5: 0 };
                        const totalMulti: number = (multiKills.k2||0) + (multiKills.k3||0) + (multiKills.k4||0) + (multiKills.k5||0);
                        
                        const clutches = p.clutches || defaultClutches;
                        const clutchesWon: number = Object.values(clutches).reduce((acc: number, curr: any) => acc + (curr.won || 0), 0);

                        // Popup Positioning: Last 2 rows open upwards
                        const popupAlign = idx >= sortedPlayers.length - 2 ? 'top' : 'bottom';

                        return (
                            <tr 
                                key={idx} 
                                className={`group transition-colors ${isRosterMember ? 'cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'}`}
                                onClick={isRosterMember ? () => onPlayerClick(rosterId) : undefined}
                            >
                                <td className={`px-3 py-3 font-bold sticky left-0 z-10 bg-white dark:bg-neutral-900 border-r border-transparent group-hover:border-neutral-100 dark:group-hover:border-neutral-800 truncate flex items-center gap-2 ${isRosterMember ? 'text-blue-600 dark:text-blue-400 group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/10' : 'text-neutral-800 dark:text-neutral-200 group-hover:bg-neutral-50 dark:group-hover:bg-neutral-800/30'}`}>
                                    {isRosterMember && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                                    {p.playerId}
                                </td>
                                <td className="px-2 py-3 text-center font-sans tabular-nums text-xs">
                                    <span className="text-neutral-900 dark:text-white font-bold">{p.kills}</span>
                                    <span className="text-neutral-300 mx-0.5">/</span>
                                    <span className="text-red-500">{p.deaths}</span>
                                    <span className="text-neutral-300 mx-0.5">/</span>
                                    <span className="text-neutral-500">{p.assists}</span>
                                </td>
                                <td className={`px-2 py-3 text-center font-sans tabular-nums text-xs font-bold ${kdDiff > 0 ? 'text-green-500' : kdDiff < 0 ? 'text-red-500' : 'text-neutral-300'}`}>
                                    {kdDiff > 0 ? `+${kdDiff}` : kdDiff}
                                </td>
                                <td className="px-2 py-3 text-center font-sans tabular-nums text-xs text-neutral-600 dark:text-neutral-400">
                                    {p.adr.toFixed(0)}
                                </td>
                                <td className="px-2 py-3 text-center font-sans tabular-nums text-xs text-neutral-500">
                                    {p.kast ? p.kast.toFixed(0) : 0}%
                                </td>
                                <td className="px-2 py-3 text-center">
                                    <div className={`inline-block px-1.5 py-0.5 rounded text-xs font-black min-w-[3.5em] text-center border ${ratingColor} font-sans tabular-nums`}>
                                        {p.rating.toFixed(2)}
                                    </div>
                                </td>
                                
                                {/* New Columns */}
                                <td className="px-2 py-3 text-center font-sans tabular-nums text-xs text-neutral-600 dark:text-neutral-400">
                                    {p.entry_kills || 0}
                                </td>
                                <td 
                                    className="px-2 py-3 text-center"
                                    onClick={(e) => { e.stopPropagation(); closePopup(); }}
                                >
                                    <DataPopupCell 
                                        value={totalMulti > 0 ? totalMulti : '-'}
                                        title="多杀数据"
                                        data={getMultiKillData(multiKills)}
                                        isActive={activePopup?.id === p.playerId && activePopup?.type === 'mk'} 
                                        onClick={(e) => handlePopupClick(e, p.playerId, 'mk')}
                                        align={popupAlign}
                                    />
                                </td>
                                <td 
                                    className="px-2 py-3 text-center"
                                    onClick={(e) => { e.stopPropagation(); closePopup(); }}
                                >
                                    <DataPopupCell 
                                        value={clutchesWon > 0 ? clutchesWon : '-'}
                                        title="残局获胜 (Wins)"
                                        data={getClutchData(clutches)}
                                        isActive={activePopup?.id === p.playerId && activePopup?.type === 'clutch'}
                                        onClick={(e) => handlePopupClick(e, p.playerId, 'clutch')}
                                        align={popupAlign}
                                        highlight={true}
                                    />
                                </td>

                                <td className="px-2 py-3 text-center font-sans tabular-nums text-xs text-neutral-400">
                                    {p.hsRate}%
                                </td>
                                <td className="px-2 py-3 text-center font-sans tabular-nums text-xs text-neutral-400">
                                    {p.utility.heDamage + p.utility.molotovDamage}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
        );
    };

    return (
        <div className="space-y-6" onClick={closePopup}>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                {renderTable(players, false)}
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                {renderTable(enemyPlayers, true)}
            </div>
        </div>
    );
};

// --- TAB: DUELS ---
const DuelsTab = ({ players, enemyPlayers }: { players: PlayerMatchStats[], enemyPlayers: PlayerMatchStats[] }) => {
    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm p-4">
             <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse min-w-[600px] table-fixed font-sans">
                    <thead>
                        <tr>
                            <th className="p-3 text-left text-neutral-400 font-bold uppercase sticky left-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 w-28 min-w-[7rem]">
                                VS
                            </th>
                            {enemyPlayers.map((enemy, i) => (
                                <th key={i} className="p-2 text-center text-neutral-600 dark:text-neutral-300 font-bold border-b border-neutral-100 dark:border-neutral-800 w-20 min-w-[5rem] truncate">
                                    {enemy.playerId}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {players.map((p, i) => (
                            <tr key={i}>
                                <td className="p-3 text-left font-bold text-neutral-900 dark:text-white sticky left-0 z-10 bg-white dark:bg-neutral-900 border-r border-neutral-100 dark:border-neutral-800 truncate w-28 min-w-[7rem]">
                                    {p.playerId}
                                </td>
                                {enemyPlayers.map((enemy, j) => {
                                    const record = (enemy.steamid && p.duels[enemy.steamid]) || { kills: 0, deaths: 0 };
                                    const k = record.kills;
                                    const d = record.deaths;
                                    const diff = k - d;
                                    
                                    let bgClass = "bg-neutral-50 dark:bg-neutral-800/50";
                                    let textClass = "text-neutral-400";

                                    if (k + d > 0) {
                                        if (diff > 0) {
                                            bgClass = "bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30";
                                            textClass = "text-green-600 dark:text-green-400";
                                        } else if (diff < 0) {
                                            bgClass = "bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30";
                                            textClass = "text-red-600 dark:text-red-400";
                                        } else {
                                            bgClass = "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800";
                                            textClass = "text-neutral-900 dark:text-white";
                                        }
                                    }

                                    return (
                                        <td key={j} className="p-1">
                                            <div className={`rounded-lg py-3 text-center font-sans tabular-nums font-black text-sm ${bgClass} ${textClass}`}>
                                                {k === 0 && d === 0 ? '-' : `${k}:${d}`}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 text-[10px] text-neutral-400 text-center flex items-center justify-center gap-4">
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span> 优势</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-neutral-400 rounded-full"></span> 均势</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span> 劣势</div>
            </div>
        </div>
    );
};

// --- TAB: UTILITY ---
const UtilityTab = ({ players }: { players: PlayerMatchStats[] }) => {
    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap min-w-[700px] font-sans">
                    <thead>
                        <tr className="text-[10px] uppercase font-bold text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30">
                            <th className="px-3 py-2 sticky left-0 z-10 bg-white dark:bg-neutral-900">选手</th>
                            <th className="px-2 py-2 text-center text-blue-500 bg-blue-50/10" colSpan={3}>闪光效果</th>
                            <th className="px-2 py-2 text-center text-red-500 bg-red-50/10" colSpan={2}>伤害输出</th>
                            <th className="px-2 py-2 text-center text-neutral-500" colSpan={4}>投掷数</th>
                        </tr>
                        <tr className="text-[10px] uppercase font-bold text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">
                            <th className="px-3 py-2 sticky left-0 z-10 bg-white dark:bg-neutral-900"></th>
                            <th className="px-2 py-2 text-center w-16 bg-blue-50/10">助攻</th>
                            <th className="px-2 py-2 text-center w-16 bg-blue-50/10">致盲人数</th>
                            <th className="px-2 py-2 text-center w-20 bg-blue-50/10">时间</th>
                            <th className="px-2 py-2 text-center w-16 bg-red-50/10">雷伤</th>
                            <th className="px-2 py-2 text-center w-16 bg-red-50/10">火伤</th>
                            <th className="px-1 py-2 text-center w-10">S</th>
                            <th className="px-1 py-2 text-center w-10">F</th>
                            <th className="px-1 py-2 text-center w-10">H</th>
                            <th className="px-1 py-2 text-center w-10">M</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                        {[...players].sort((a,b) => (b.utility.heDamage + b.utility.molotovDamage) - (a.utility.heDamage + a.utility.molotovDamage)).map((p, idx) => (
                            <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                                <td className="px-3 py-3 font-bold sticky left-0 z-10 bg-white dark:bg-neutral-900 border-r border-transparent text-neutral-800 dark:text-neutral-200 truncate max-w-[120px]">
                                    {p.playerId}
                                </td>
                                <td className="px-2 py-3 text-center font-sans tabular-nums font-bold text-blue-600 dark:text-blue-400 bg-blue-50/10 border-l border-neutral-100 dark:border-neutral-800/50">
                                    {p.flash_assists || 0}
                                </td>
                                <td className="px-2 py-3 text-center font-sans tabular-nums text-neutral-600 dark:text-neutral-400 bg-blue-50/10">
                                    {p.utility.enemiesBlinded}
                                </td>
                                <td className="px-2 py-3 text-center font-sans tabular-nums text-neutral-600 dark:text-neutral-400 bg-blue-50/10 border-r border-neutral-100 dark:border-neutral-800/50">
                                    {p.utility.blindDuration.toFixed(1)}s
                                </td>
                                <td className="px-2 py-3 text-center font-sans tabular-nums font-bold text-red-600 dark:text-red-400 bg-red-50/10">
                                    {p.utility.heDamage}
                                </td>
                                <td className="px-2 py-3 text-center font-sans tabular-nums font-bold text-orange-600 dark:text-orange-400 bg-red-50/10 border-r border-neutral-100 dark:border-neutral-800/50">
                                    {p.utility.molotovDamage}
                                </td>
                                <td className="px-1 py-3 text-center text-xs text-neutral-400 font-sans tabular-nums">{p.utility.smokesThrown}</td>
                                <td className="px-1 py-3 text-center text-xs text-neutral-400 font-sans tabular-nums">{p.utility.flashesThrown}</td>
                                <td className="px-1 py-3 text-center text-xs text-neutral-400 font-sans tabular-nums">{p.utility.heThrown}</td>
                                <td className="px-1 py-3 text-center text-xs text-neutral-400 font-sans tabular-nums">{p.utility.molotovsThrown}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- TAB: CLUTCHES ---
const ClutchesTab = ({ players, enemyPlayers }: { players: PlayerMatchStats[], enemyPlayers: PlayerMatchStats[] }) => {
    
    const renderClutchSection = (teamName: string, teamPlayers: PlayerMatchStats[]) => {
        // Filter players who actually had clutch attempts
        const activeClutchers = teamPlayers.filter(p => p.clutchHistory && p.clutchHistory.length > 0);
        
        if (activeClutchers.length === 0) {
            return (
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 text-center text-neutral-400 text-sm">
                    {teamName} 本场无残局记录
                </div>
            );
        }

        return (
            <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-1">{teamName}</h4>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                    {activeClutchers.map(p => (
                        <div key={p.playerId} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="font-bold text-sm text-neutral-900 dark:text-white w-32 shrink-0 truncate">
                                {p.playerId}
                            </div>
                            <div className="flex flex-wrap gap-2 flex-1">
                                {p.clutchHistory.sort((a,b) => a.round - b.round).map((attempt, idx) => {
                                    let styleClass = "";
                                    let label = "";

                                    if (attempt.result === 'won') {
                                        styleClass = "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
                                        label = "胜";
                                    } else if (attempt.result === 'saved') {
                                        styleClass = "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
                                        label = "保";
                                    } else {
                                        styleClass = "bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-500 dark:border-neutral-700";
                                        label = "负";
                                    }

                                    return (
                                        <div key={idx} className={`px-2 py-1 rounded-lg border text-xs font-bold font-sans tabular-nums flex items-center gap-1.5 ${styleClass}`}>
                                            <span className="opacity-50">R{attempt.round}:</span>
                                            <span>1v{attempt.opponentCount} {label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {renderClutchSection("我方关键时刻", players)}
            {renderClutchSection("敌方关键时刻", enemyPlayers)}
        </div>
    );
};

// --- MAIN CONTAINER ---

export const MatchDetail: React.FC<MatchDetailProps> = ({ match, onBack, onPlayerClick, onDelete, onShare }) => {
    const [detailTab, setDetailTab] = useState<'overview' | 'duels' | 'utility' | 'clutches'>('overview');
    const [sideFilter, setSideFilter] = useState<SideFilter>('ALL');
    const [showDefinitions, setShowDefinitions] = useState(false);

    const mapName = getMapDisplayName(match.mapId);
    const startSide = match.startingSide || 'CT';
    const ctColor = 'text-blue-500 dark:text-blue-400';
    const tColor = 'text-yellow-500 dark:text-yellow-400';
    const half1UsColor = startSide === 'CT' ? ctColor : tColor;
    const half1ThemColor = startSide === 'CT' ? tColor : ctColor;
    const half2UsColor = startSide === 'CT' ? tColor : ctColor;
    const half2ThemColor = startSide === 'CT' ? ctColor : tColor;

    return (
        <div className="fixed inset-0 z-[200] bg-white dark:bg-neutral-950 flex flex-col h-[100dvh] w-screen overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 shadow-sm shrink-0">
                <div className="flex items-center justify-between px-4 h-[56px]">
                    <div className="flex items-center gap-2">
                        <button onClick={onBack} className="flex items-center text-sm font-bold text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors">
                            <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            返回
                        </button>
                        <button onClick={() => setShowDefinitions(true)} className="text-[10px] font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg transition-colors ml-2">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            说明
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => onShare(match)}
                            className="p-2 text-neutral-400 hover:text-blue-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        </button>
                        <button 
                            onClick={() => onDelete(match)}
                            className="p-2 text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-20 overscroll-contain bg-neutral-50 dark:bg-neutral-950">
                
                {/* Score Header */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden relative shadow-sm mb-6">
                    <div className={`absolute left-0 top-0 bottom-0 w-2 ${match.result === 'WIN' ? 'bg-green-500' : match.result === 'LOSS' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                    
                    <div className="p-6 text-center">
                         <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-2 font-sans tabular-nums">
                              <span>{match.date.split('T')[0]}</span>
                              <span>•</span>
                              <span>{match.date.split('T')[1].substring(0,5)}</span>
                         </div>
                         <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-2">{mapName}</h2>
                         <div className="flex justify-center mb-6">
                             <SourceBadge source={match.source} />
                         </div>
                         
                         <div className="flex items-center justify-center gap-8 md:gap-16 font-sans tabular-nums">
                             <div className="text-right">
                                 <div className={`text-4xl md:text-5xl font-black ${match.result === 'WIN' ? 'text-green-600 dark:text-green-500' : 'text-neutral-900 dark:text-white'}`}>
                                    {match.score.us}
                                 </div>
                                 <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">我方</div>
                             </div>
                             <div className="text-2xl text-neutral-300 font-light opacity-50">:</div>
                             <div className="text-left">
                                  <div className={`text-4xl md:text-5xl font-black ${match.result === 'LOSS' ? 'text-red-600 dark:text-red-500' : 'text-neutral-400'}`}>
                                     {match.score.them}
                                 </div>
                                 <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">敌方</div>
                             </div>
                         </div>
                         
                         <div className="mt-6 flex justify-center gap-4 text-xs font-sans tabular-nums font-bold bg-neutral-50 dark:bg-neutral-800 py-2 rounded-lg max-w-[240px] mx-auto text-neutral-500">
                             <span>( <span className={half1ThemColor}>{match.score.half1_them}</span>-<span className={half1UsColor}>{match.score.half1_us}</span> )</span>
                             <span>( <span className={half2ThemColor}>{match.score.half2_them}</span>-<span className={half2UsColor}>{match.score.half2_us}</span> )</span>
                         </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex p-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl mb-6 sticky top-0 z-20 shadow-lg shadow-neutral-100/50 dark:shadow-black/20">
                      {['overview', 'duels', 'utility', 'clutches'].map((t) => (
                          <button
                            key={t}
                            onClick={() => setDetailTab(t as any)}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all capitalize
                                ${detailTab === t ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
                          >
                              {t === 'overview' ? '总览' : t === 'duels' ? '对位' : t === 'utility' ? '道具' : '残局'}
                          </button>
                      ))}
                </div>

                {/* Filters (Overview Only) */}
                {detailTab === 'overview' && (
                    <div className="flex justify-end mb-4 animate-in fade-in">
                        <div className="flex p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                            {(['ALL', 'CT', 'T'] as const).map(side => (
                                <button
                                    key={side}
                                    onClick={() => setSideFilter(side)}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${sideFilter === side ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
                                >
                                    {side}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tab Content */}
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {detailTab === 'overview' && <ScoreboardTab players={match.players} enemyPlayers={match.enemyPlayers} onPlayerClick={onPlayerClick} filter={sideFilter} />}
                    {detailTab === 'duels' && <DuelsTab players={match.players} enemyPlayers={match.enemyPlayers} />}
                    {detailTab === 'utility' && <UtilityTab players={match.players} />}
                    {detailTab === 'clutches' && <ClutchesTab players={match.players} enemyPlayers={match.enemyPlayers} />}
                </div>

            </div>
            
            <DataDefinitionsModal isOpen={showDefinitions} onClose={() => setShowDefinitions(false)} />
        </div>
    );
};
