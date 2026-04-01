
import React, { useState, useMemo } from 'react';
import { Match, PlayerMatchStats, ClutchRecord, MultiKillBreakdown } from '../../../types';
import { calculatePlayerStats } from '../../../utils/analytics/playerStatsCalculator';
import { identifyRole } from '../../../utils/analytics/roleIdentifier';
import { resolveName } from '../../../utils/demo/helpers';
import { ROSTER } from '../../../constants/roster';
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

type SortKey = 'name' | 'role' | 'entryKills' | 'totalMulti' | 'clutchWinCount' | 'scoreFirepower' | 'scoreEntry' | 'scoreSniper' | 'scoreClutch' | 'scoreOpening' | 'scoreTrade' | 'scoreUtility';

interface PerformanceTableProps {
    playersData: any[];
    title: string;
    isEnemy: boolean;
    type: 'key' | 'seven';
}

const PerformanceTable: React.FC<PerformanceTableProps> = ({ playersData, title, isEnemy, type }) => {
    const [activePopup, setActivePopup] = useState<{ id: string, type: 'mk' | 'clutch' } | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

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
        const sortableItems = [...playersData];
        sortableItems.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            if (sortConfig.key === 'name') {
                aValue = a.player.steamid && resolveName(a.player.steamid) !== a.player.steamid ? resolveName(a.player.steamid) : resolveName(a.player.playerId);
                bValue = b.player.steamid && resolveName(b.player.steamid) !== b.player.steamid ? resolveName(b.player.steamid) : resolveName(b.player.playerId);
            } else if (sortConfig.key === 'role') {
                aValue = a.role;
                bValue = b.role;
            } else if (sortConfig.key === 'entryKills') {
                aValue = a.entryKills;
                bValue = b.entryKills;
            } else if (sortConfig.key === 'totalMulti') {
                aValue = a.totalMulti;
                bValue = b.totalMulti;
            } else if (sortConfig.key === 'clutchWinCount') {
                aValue = a.clutchWinCount;
                bValue = b.clutchWinCount;
            } else if (sortConfig.key.startsWith('score')) {
                aValue = a.stats?.[sortConfig.key] || 0;
                bValue = b.stats?.[sortConfig.key] || 0;
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [playersData, sortConfig]);

    const headerStyle = isEnemy ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400';

    return (
        <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-xl" onClick={closePopup}>
            <table className="w-full max-w-4xl mx-auto text-[10px] sm:text-sm text-left whitespace-nowrap min-w-[320px] sm:min-w-[400px] border-collapse font-sans">
                <thead className="sticky top-0 z-10 shadow-sm">
                    <tr className={`text-[9px] sm:text-[10px] uppercase font-bold border-b border-neutral-200 dark:border-neutral-800 ${headerStyle}`}>
                        <th className="px-1.5 sm:px-3 py-2 sm:py-3 sticky left-0 z-20 bg-inherit w-24 sm:w-40 max-w-[96px] sm:max-w-[160px] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" onClick={() => handleSort('name')}>
                            {title}
                            <SortIcon columnKey="name" />
                        </th>
                        <th className="px-0.5 sm:px-2 py-2 sm:py-3 text-center bg-inherit cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" onClick={() => handleSort('role')}>
                            角色<SortIcon columnKey="role" />
                        </th>
                        {type === 'key' ? (
                            <>
                                <th className="px-0.5 sm:px-2 py-2 sm:py-3 text-center bg-inherit cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" onClick={() => handleSort('entryKills')}>首杀<SortIcon columnKey="entryKills" /></th>
                                <th className="px-0.5 sm:px-2 py-2 sm:py-3 text-center bg-inherit cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" onClick={() => handleSort('totalMulti')}>多杀<SortIcon columnKey="totalMulti" /></th>
                                <th className="px-0.5 sm:px-2 py-2 sm:py-3 text-center bg-inherit cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" onClick={() => handleSort('clutchWinCount')}>残局<SortIcon columnKey="clutchWinCount" /></th>
                            </>
                        ) : (
                            <>
                                <th className="px-0.5 sm:px-2 py-2 sm:py-3 text-center bg-inherit cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" title="火力" onClick={() => handleSort('scoreFirepower')}>火力<SortIcon columnKey="scoreFirepower" /></th>
                                <th className="px-0.5 sm:px-2 py-2 sm:py-3 text-center bg-inherit cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" title="破点" onClick={() => handleSort('scoreEntry')}>破点<SortIcon columnKey="scoreEntry" /></th>
                                <th className="px-0.5 sm:px-2 py-2 sm:py-3 text-center bg-inherit cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" title="狙击" onClick={() => handleSort('scoreSniper')}>狙击<SortIcon columnKey="scoreSniper" /></th>
                                <th className="px-0.5 sm:px-2 py-2 sm:py-3 text-center bg-inherit cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" title="残局" onClick={() => handleSort('scoreClutch')}>残局<SortIcon columnKey="scoreClutch" /></th>
                                <th className="px-0.5 sm:px-2 py-2 sm:py-3 text-center bg-inherit cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" title="开局" onClick={() => handleSort('scoreOpening')}>开局<SortIcon columnKey="scoreOpening" /></th>
                                <th className="px-0.5 sm:px-2 py-2 sm:py-3 text-center bg-inherit cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" title="补枪" onClick={() => handleSort('scoreTrade')}>补枪<SortIcon columnKey="scoreTrade" /></th>
                                <th className="px-0.5 sm:px-2 py-2 sm:py-3 text-center bg-inherit cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" title="道具" onClick={() => handleSort('scoreUtility')}>道具<SortIcon columnKey="scoreUtility" /></th>
                            </>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                    {sortedPlayers.map((data, idx) => {
                        const p = data.player;
                        const rosterId = p.steamid && resolveName(p.steamid) !== p.steamid ? resolveName(p.steamid) : resolveName(p.playerId);
                        const isRosterMember = ROSTER.some(r => r.id === rosterId);
                        const displayName = isRosterMember ? rosterId : p.playerId;
                        
                        const popupAlign = idx >= sortedPlayers.length - 2 ? 'top' : 'bottom';
                        
                        return (
                            <tr key={idx} className={`group transition-colors ${isRosterMember ? 'hover:bg-blue-50/50 dark:hover:bg-blue-900/10' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'}`}>
                                <td className={`px-1.5 sm:px-3 py-2 sm:py-3 font-bold sticky left-0 z-10 bg-white dark:bg-neutral-900 border-r border-transparent group-hover:border-neutral-100 dark:group-hover:border-neutral-800 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm w-24 sm:w-40 max-w-[96px] sm:max-w-[160px] ${isRosterMember ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                                    {isRosterMember && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>}
                                    <span className="truncate flex-1 min-w-0" style={{ fontSize: displayName.length > 12 ? '0.85em' : '1em' }}>{displayName}</span>
                                </td>
                                <td className="px-0.5 sm:px-2 py-2 sm:py-3 text-center font-sans text-[10px] sm:text-xs">
                                    <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md text-neutral-700 dark:text-neutral-300 font-medium">
                                        {data.role}
                                    </span>
                                </td>
                                {type === 'key' ? (
                                    <>
                                        <td className="px-0.5 sm:px-2 py-2 sm:py-3 text-center font-sans tabular-nums text-[10px] sm:text-xs text-neutral-600 dark:text-neutral-400">
                                            {data.entryKills}
                                        </td>
                                        <td 
                                            className="px-0.5 sm:px-2 py-2 sm:py-3 text-center"
                                            onClick={(e) => { e.stopPropagation(); closePopup(); }}
                                        >
                                            <DataPopupCell 
                                                value={data.totalMulti > 0 ? data.totalMulti : '-'}
                                                title="多杀数据"
                                                data={getMultiKillData(data.multiKills)}
                                                isActive={activePopup?.id === p.playerId && activePopup?.type === 'mk'} 
                                                onClick={(e) => handlePopupClick(e, p.playerId, 'mk')}
                                                align={popupAlign}
                                            />
                                        </td>
                                        <td 
                                            className="px-0.5 sm:px-2 py-2 sm:py-3 text-center"
                                            onClick={(e) => { e.stopPropagation(); closePopup(); }}
                                        >
                                            <DataPopupCell 
                                                value={data.clutchWinCount > 0 ? data.clutchWinCount : '-'}
                                                title="残局获胜"
                                                data={getClutchData(data.clutches)}
                                                isActive={activePopup?.id === p.playerId && activePopup?.type === 'clutch'}
                                                onClick={(e) => handlePopupClick(e, p.playerId, 'clutch')}
                                                align={popupAlign}
                                                highlight={true}
                                            />
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-0.5 sm:px-2 py-2 sm:py-3 text-center font-sans tabular-nums text-[10px] sm:text-xs text-neutral-600 dark:text-neutral-400">{data.stats?.scoreFirepower.toFixed(0) || 0}</td>
                                        <td className="px-0.5 sm:px-2 py-2 sm:py-3 text-center font-sans tabular-nums text-[10px] sm:text-xs text-neutral-600 dark:text-neutral-400">{data.stats?.scoreEntry.toFixed(0) || 0}</td>
                                        <td className="px-0.5 sm:px-2 py-2 sm:py-3 text-center font-sans tabular-nums text-[10px] sm:text-xs text-neutral-600 dark:text-neutral-400">{data.stats?.scoreSniper.toFixed(0) || 0}</td>
                                        <td className="px-0.5 sm:px-2 py-2 sm:py-3 text-center font-sans tabular-nums text-[10px] sm:text-xs text-neutral-600 dark:text-neutral-400">{data.stats?.scoreClutch.toFixed(0) || 0}</td>
                                        <td className="px-0.5 sm:px-2 py-2 sm:py-3 text-center font-sans tabular-nums text-[10px] sm:text-xs text-neutral-600 dark:text-neutral-400">{data.stats?.scoreOpening.toFixed(0) || 0}</td>
                                        <td className="px-0.5 sm:px-2 py-2 sm:py-3 text-center font-sans tabular-nums text-[10px] sm:text-xs text-neutral-600 dark:text-neutral-400">{data.stats?.scoreTrade.toFixed(0) || 0}</td>
                                        <td className="px-0.5 sm:px-2 py-2 sm:py-3 text-center font-sans tabular-nums text-[10px] sm:text-xs text-neutral-600 dark:text-neutral-400">{data.stats?.scoreUtility.toFixed(0) || 0}</td>
                                    </>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

interface MatchPerformanceTabProps {
    match: Match;
    history?: { match: Match, stats: PlayerMatchStats }[];
}

export const MatchPerformanceTab: React.FC<MatchPerformanceTabProps> = ({ match, history }) => {
    const [activeTab, setActiveTab] = useState<'key' | 'seven'>('key');

    const allPlayers = useMemo(() => [...match.players, ...match.enemyPlayers], [match]);

    const playerStatsData = useMemo(() => {
        return allPlayers.map(p => {
            let statsResult;
            if (history) {
                const pHistory = history.filter(h => h.stats.playerId === p.playerId);
                if (pHistory.length > 0) {
                    statsResult = calculatePlayerStats(p.playerId, pHistory, 'ALL');
                }
            }
            if (!statsResult) {
                statsResult = calculatePlayerStats(p.playerId, [{ match, stats: p }], 'ALL');
            }
            
            const role = statsResult ? identifyRole(statsResult.filtered) : { name: '未知' };
            
            const multiKills = p.multikills || { k2: 0, k3: 0, k4: 0, k5: 0 };
            const totalMulti = (multiKills.k2||0) + (multiKills.k3||0) + (multiKills.k4||0) + (multiKills.k5||0);
            
            const clutches = p.clutches || { '1v1': { won: 0, lost: 0 }, '1v2': { won: 0, lost: 0 }, '1v3': { won: 0, lost: 0 }, '1v4': { won: 0, lost: 0 }, '1v5': { won: 0, lost: 0 } };
            const clutchWinCount = (clutches['1v1']?.won || 0) + (clutches['1v2']?.won || 0) + (clutches['1v3']?.won || 0) + (clutches['1v4']?.won || 0) + (clutches['1v5']?.won || 0);

            return {
                player: p,
                isEnemy: match.enemyPlayers.some(ep => ep.playerId === p.playerId),
                stats: statsResult?.filtered,
                role: role.name,
                entryKills: p.entry_kills || 0,
                totalMulti,
                clutchWinCount,
                multiKills,
                clutches
            };
        });
    }, [allPlayers, match, history]);

    const friendlyData = useMemo(() => playerStatsData.filter(d => !d.isEnemy), [playerStatsData]);
    const enemyData = useMemo(() => playerStatsData.filter(d => d.isEnemy), [playerStatsData]);

    return (
        <div className="w-full bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
            <div className="flex border-b border-neutral-200 dark:border-neutral-800">
                <button
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'key' ? 'text-neutral-900 dark:text-white border-b-2 border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-800' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}
                    onClick={() => setActiveTab('key')}
                >
                    关键数据
                </button>
                <button
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'seven' ? 'text-neutral-900 dark:text-white border-b-2 border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-800' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}
                    onClick={() => setActiveTab('seven')}
                >
                    七维数据
                </button>
            </div>
            
            <div className="flex flex-col gap-6 p-4">
                <PerformanceTable playersData={friendlyData} title="友方阵营" isEnemy={false} type={activeTab} />
                <PerformanceTable playersData={enemyData} title="敌方阵营" isEnemy={true} type={activeTab} />
            </div>
        </div>
    );
};

