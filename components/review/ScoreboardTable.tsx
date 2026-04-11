import React, { useState, useMemo } from 'react';
import { PlayerMatchStats, ClutchRecord, MultiKillBreakdown } from '../../types';
import { getAllPlayers } from '../../utils/teamLoader';
import { getRatingColorClass } from './ReviewShared';
import { resolveName } from '../../utils/demo/helpers';
import { ArrowUp, ArrowDown } from 'lucide-react';

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

type SortKey = 'name' | 'matchesPlayed' | 'kills' | 'deaths' | 'assists' | 'kdDiff' | 'adr' | 'rating' | 'wpa';

export const ScoreboardTable: React.FC<ScoreboardTableProps> = ({ 
    players, 
    title, 
    isEnemy, 
    filter = 'ALL', 
    onPlayerClick,
    colorClass
}) => {
    const [activePopup, setActivePopup] = useState<{ id: string, type: 'mk' | 'clutch' } | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ key: 'rating', direction: 'desc' });

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
        if (filter === 'ALL') return isEnemy ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400';
        if (filter === 'CT') return 'bg-blue-50 dark:bg-blue-950 text-blue-500';
        if (filter === 'T') return 'bg-yellow-50 dark:bg-yellow-950 text-yellow-600';
        return '';
    };

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ columnKey, isBetterLower = false }: { columnKey: SortKey, isBetterLower?: boolean }) => {
        if (sortConfig.key !== columnKey) return null;
        const isGood = (sortConfig.direction === 'desc' && !isBetterLower) || (sortConfig.direction === 'asc' && isBetterLower);
        const color = isGood ? 'text-green-500' : 'text-red-500';
        return sortConfig.direction === 'asc' ? <ArrowUp className={`inline w-3 h-3 ml-1 ${color}`} /> : <ArrowDown className={`inline w-3 h-3 ml-1 ${color}`} />;
    };

    const sortedPlayers = useMemo(() => {
        const sortableItems = [...players];
        sortableItems.sort((a, b) => {
            let aValue: any = a[sortConfig.key as keyof PlayerMatchStats];
            let bValue: any = b[sortConfig.key as keyof PlayerMatchStats];

            if (sortConfig.key === 'name') {
                aValue = a.steamid && resolveName(a.steamid) !== a.steamid ? resolveName(a.steamid) : resolveName(a.playerId);
                bValue = b.steamid && resolveName(b.steamid) !== b.steamid ? resolveName(b.steamid) : resolveName(b.playerId);
            } else if (sortConfig.key === 'kdDiff') {
                aValue = a.kills - a.deaths;
                bValue = b.kills - b.deaths;
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        return sortableItems;
    }, [players, sortConfig]);

    const showMatches = players.some(p => p.matchesPlayed !== undefined);

    return (
        <div className="overflow-x-auto pb-4" onClick={closePopup}> 
                <table className="w-full max-w-4xl mx-auto text-[10px] sm:text-sm text-left whitespace-nowrap min-w-[320px] sm:min-w-[400px] border-collapse font-sans">
                <thead className="sticky top-0 z-20 shadow-sm">
                    <tr className={`text-[9px] sm:text-[10px] uppercase font-bold border-b border-neutral-100 dark:border-neutral-800 ${getFilterStyle(isEnemy)}`}>
                        <th className="px-1.5 sm:px-3 py-2 sm:py-3 sticky left-0 z-30 bg-inherit w-24 sm:w-40 max-w-[96px] sm:max-w-[160px] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" onClick={() => handleSort('name')}>
                            {title} {filter !== 'ALL' ? `(${filter})` : ''}
                            <SortIcon columnKey="name" />
                        </th>
                        {showMatches && <th className="px-0.5 sm:px-2 py-2 sm:py-3 text-center w-8 sm:w-12 bg-inherit cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" onClick={() => handleSort('matchesPlayed')}>地图数<SortIcon columnKey="matchesPlayed" /></th>}
                        <th className="px-0.5 sm:px-2 py-2 sm:py-3 text-center w-14 sm:w-20 bg-inherit cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" onClick={() => handleSort('kills')}>K / D / A<SortIcon columnKey="kills" /></th>
                        <th className="px-0.5 sm:px-2 py-2 sm:py-3 text-center w-8 sm:w-12 bg-inherit cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" onClick={() => handleSort('kdDiff')}>+/-<SortIcon columnKey="kdDiff" /></th>
                        <th className="px-0.5 sm:px-2 py-2 sm:py-3 text-center w-8 sm:w-12 bg-inherit cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" title="平均每回合伤害" onClick={() => handleSort('adr')}>ADR<SortIcon columnKey="adr" /></th>
                        <th className="px-0.5 sm:px-2 py-2 sm:py-3 text-center w-8 sm:w-12 bg-inherit cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" title="Rating 4.0" onClick={() => handleSort('rating')}>RTG<SortIcon columnKey="rating" /></th>
                        <th className="px-0.5 sm:px-2 py-2 sm:py-3 text-center w-10 sm:w-14 bg-inherit cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" title="Win Probability Added Avg per Round (Total Points)" onClick={() => handleSort('wpa')}>WPA<SortIcon columnKey="wpa" /></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                    {sortedPlayers.map((p, idx) => {
                        const kdDiff = p.kills - p.deaths;
                        // Resolve roster ID if possible, otherwise use playerId (which is name) or steamid
                        const rosterId = p.steamid && resolveName(p.steamid) !== p.steamid ? resolveName(p.steamid) : resolveName(p.playerId);
                        const isRosterMember = getAllPlayers().some(r => r.id === rosterId);
                        const ratingColor = getRatingColorClass(p.rating, 'text');
                        
                        const multiKills = p.multikills || { k2: 0, k3: 0, k4: 0, k5: 0 };
                        const totalMulti: number = (multiKills.k2||0) + (multiKills.k3||0) + (multiKills.k4||0) + (multiKills.k5||0);
                        
                        const clutches = p.clutches;
                        const clutchWinCount = clutches['1v1'].won + clutches['1v2'].won + clutches['1v3'].won + clutches['1v4'].won + clutches['1v5'].won;

                        // Fix: More aggressive top alignment (last 3 rows instead of 2) to prevent overflow for 3rd player in 5-man roster
                        const popupAlign = idx >= sortedPlayers.length - 3 ? 'top' : 'bottom';
                        
                        // Safety check for WPA value
                        const wpaVal = (typeof p.wpa === 'number' && !isNaN(p.wpa)) ? p.wpa : 0;
                        // WPA is already in percentage (e.g. 6.19 for 6.19%), so just format it
                        const wpaDisplay = wpaVal.toFixed(2);

                        // If playerId is a SteamID (fallback), try to show something better if possible
                        const displayName = rosterId;

                        return (
                            <tr 
                                key={idx} 
                                className={`group transition-colors cursor-pointer ${isRosterMember ? 'hover:bg-blue-50/50 dark:hover:bg-blue-900/10' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'}`}
                                onClick={() => onPlayerClick(isRosterMember ? rosterId : (p.steamid || p.playerId))}
                            >
                                <td className={`px-1.5 sm:px-3 py-2 sm:py-3 font-bold sticky left-0 z-10 bg-white dark:bg-neutral-900 border-r border-transparent group-hover:border-neutral-100 dark:group-hover:border-neutral-800 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm w-24 sm:w-40 max-w-[96px] sm:max-w-[160px] ${isRosterMember ? 'text-blue-600 dark:text-blue-400 group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/10' : 'text-neutral-800 dark:text-neutral-200 group-hover:bg-neutral-50 dark:group-hover:bg-neutral-800/30'}`}>
                                    {isRosterMember && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>}
                                    <span className="truncate flex-1 min-w-0" style={{ fontSize: displayName.length > 12 ? '0.85em' : '1em' }}>{displayName}</span>
                                    {p.isMvp && <span className="ml-1 px-1 py-0.5 bg-yellow-500 text-white text-[8px] font-black rounded uppercase tracking-wider shrink-0">MVP</span>}
                                </td>
                                {showMatches && (
                                    <td className="px-0.5 sm:px-2 py-2 sm:py-3 text-center font-sans tabular-nums text-[10px] sm:text-xs font-bold text-neutral-500">
                                        {p.matchesPlayed}
                                    </td>
                                )}
                                <td className="px-0.5 sm:px-2 py-2 sm:py-3 text-center font-sans tabular-nums text-[10px] sm:text-xs">
                                    <span className="text-neutral-900 dark:text-white font-bold">{p.kills}</span>
                                    <span className="text-neutral-300 mx-0.5">/</span>
                                    <span className="text-red-500">{p.deaths}</span>
                                    <span className="text-neutral-300 mx-0.5">/</span>
                                    <span className="text-neutral-500">{p.assists}</span>
                                </td>
                                <td className={`px-0.5 sm:px-2 py-2 sm:py-3 text-center font-sans tabular-nums text-[10px] sm:text-xs font-bold ${kdDiff > 0 ? 'text-green-500' : kdDiff < 0 ? 'text-red-500' : 'text-neutral-300'}`}>
                                    {kdDiff > 0 ? `+${kdDiff}` : kdDiff}
                                </td>
                                <td className="px-0.5 sm:px-2 py-2 sm:py-3 text-center font-sans tabular-nums text-[10px] sm:text-xs text-neutral-600 dark:text-neutral-400">
                                    {p.adr.toFixed(0)}
                                </td>
                                <td className="px-0.5 sm:px-2 py-2 sm:py-3 text-center">
                                    <div className={`font-black text-center font-sans tabular-nums text-[11px] sm:text-sm ${ratingColor}`}>
                                        {p.rating.toFixed(2)}
                                    </div>
                                </td>

                                <td className={`px-0.5 sm:px-2 py-2 sm:py-3 text-center font-sans tabular-nums text-[10px] sm:text-xs font-bold ${wpaVal > 0 ? 'text-green-500' : wpaVal < 0 ? 'text-red-500' : 'text-white'}`}>
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
