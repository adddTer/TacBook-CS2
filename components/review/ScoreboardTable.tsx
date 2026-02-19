import React, { useState } from 'react';
import { PlayerMatchStats, ClutchRecord, MultiKillBreakdown } from '../../types';
import { ROSTER } from '../../constants/roster';
import { getRatingColorClass } from './ReviewShared';

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
                    <div className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 transform rotate-45 ${arrowClass}`}></div>
                </div>
            )}
        </div>
    );
};

interface ScoreboardTableProps {
    players: PlayerMatchStats[];
    title: string;
    isEnemy: boolean;
    filter?: 'ALL' | 'CT' | 'T';
    onPlayerClick: (id: string) => void;
    colorClass?: string; // Optional override for title color
}

export const ScoreboardTable: React.FC<ScoreboardTableProps> = ({ 
    players, 
    title, 
    isEnemy, 
    filter = 'ALL', 
    onPlayerClick,
    colorClass
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

    const getFilterStyle = (isEnemy: boolean) => {
        if (filter === 'ALL') return isEnemy ? 'bg-red-50/50 dark:bg-red-900/10 text-red-500' : 'bg-blue-50/50 dark:bg-blue-900/10 text-blue-500';
        if (filter === 'CT') return 'bg-blue-50/50 dark:bg-blue-900/10 text-blue-500';
        if (filter === 'T') return 'bg-yellow-50/50 dark:bg-yellow-900/10 text-yellow-600';
        return '';
    };

    // Sort players by rating descending
    const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating);

    return (
        <div className="overflow-x-auto pb-4" onClick={closePopup}> 
            <table className="w-full text-sm text-left whitespace-nowrap min-w-[800px] border-collapse font-sans">
                <thead>
                    <tr className={`text-[10px] uppercase font-bold border-b border-neutral-100 dark:border-neutral-800 ${getFilterStyle(isEnemy)}`}>
                        <th className="px-3 py-3 sticky left-0 z-10 bg-inherit w-36">
                            {title} {filter !== 'ALL' ? `(${filter})` : ''}
                        </th>
                        <th className="px-2 py-3 text-center w-20">K / D / A</th>
                        <th className="px-2 py-3 text-center w-12">+/-</th>
                        <th className="px-2 py-3 text-center w-12" title="平均每回合伤害">ADR</th>
                        <th className="px-2 py-3 text-center w-12" title="KAST% (Kill, Assist, Survive, Traded) - 回合贡献率">KAST%</th>
                        <th className="px-2 py-3 text-center w-12" title="Rating 4.0">RTG</th>
                        <th className="px-2 py-3 text-center w-12" title="首杀 (Entry Kills)">首杀</th>
                        <th className="px-2 py-3 text-center w-12" title="多杀 (Multi-Kills)">多杀</th>
                        <th className="px-2 py-3 text-center w-12" title="残局获胜 (1vN Wins)">残局</th>
                        <th className="px-2 py-3 text-center w-14">爆头</th>
                        <th className="px-2 py-3 text-center w-14" title="Win Probability Added Avg per Round (Total Points)">WPA%</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                    {sortedPlayers.map((p, idx) => {
                        const kdDiff = p.kills - p.deaths;
                        // Resolve roster ID if possible, otherwise use playerId (which is name) or steamid
                        const rosterId = ROSTER.find(r => r.id === p.playerId || r.name === p.playerId)?.id || p.playerId;
                        const isRosterMember = ROSTER.some(r => r.id === rosterId);
                        const ratingColor = getRatingColorClass(p.rating, 'text');
                        
                        const multiKills = p.multikills || { k2: 0, k3: 0, k4: 0, k5: 0 };
                        const totalMulti: number = (multiKills.k2||0) + (multiKills.k3||0) + (multiKills.k4||0) + (multiKills.k5||0);
                        
                        const clutches = p.clutches;
                        const clutchWinCount = clutches['1v1'].won + clutches['1v2'].won + clutches['1v3'].won + clutches['1v4'].won + clutches['1v5'].won;

                        // Fix: More aggressive top alignment (last 3 rows instead of 2) to prevent overflow for 3rd player in 5-man roster
                        const popupAlign = idx >= sortedPlayers.length - 3 ? 'top' : 'bottom';
                        
                        // Safety check for WPA value
                        const wpaVal = (typeof p.wpa === 'number' && !isNaN(p.wpa)) ? p.wpa : 0;
                        // WPA is usually 0.xx, we want to display as percentage (e.g. 15.5%)
                        const wpaDisplay = (wpaVal * 100).toFixed(1);

                        // If playerId is a SteamID (fallback), try to show something better if possible, but usually playerId is Name
                        const displayName = p.playerId;

                        return (
                            <tr 
                                key={idx} 
                                className={`group transition-colors cursor-pointer ${isRosterMember ? 'hover:bg-blue-50/50 dark:hover:bg-blue-900/10' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'}`}
                                onClick={() => onPlayerClick(isRosterMember ? rosterId : (p.steamid || p.playerId))}
                            >
                                <td className={`px-3 py-3 font-bold sticky left-0 z-10 bg-white dark:bg-neutral-900 border-r border-transparent group-hover:border-neutral-100 dark:group-hover:border-neutral-800 truncate flex items-center gap-2 ${isRosterMember ? 'text-blue-600 dark:text-blue-400 group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/10' : 'text-neutral-800 dark:text-neutral-200 group-hover:bg-neutral-50 dark:group-hover:bg-neutral-800/30'}`}>
                                    {isRosterMember && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                                    {displayName}
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
                                    <div className={`font-black text-center font-sans tabular-nums text-sm ${ratingColor}`}>
                                        {p.rating.toFixed(2)}
                                    </div>
                                </td>
                                
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
                                        value={clutchWinCount > 0 ? clutchWinCount : '-'}
                                        title="残局获胜"
                                        data={getClutchData(clutches)}
                                        isActive={activePopup?.id === p.playerId && activePopup?.type === 'clutch'}
                                        onClick={(e) => handlePopupClick(e, p.playerId, 'clutch')}
                                        align={popupAlign}
                                        highlight={true}
                                    />
                                </td>

                                <td className="px-2 py-3 text-center font-sans tabular-nums text-xs text-neutral-400">
                                    {p.hsRate.toFixed(0)}%
                                </td>
                                <td className={`px-2 py-3 text-center font-sans tabular-nums text-xs font-bold ${wpaVal > 0 ? 'text-green-500' : wpaVal < 0 ? 'text-red-500' : 'text-neutral-400'}`}>
                                    {wpaVal > 0 ? '+' : ''}{wpaDisplay}%
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
