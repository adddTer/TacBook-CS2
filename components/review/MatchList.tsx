
import React, { useState } from 'react';
import { Match } from '../../types';
import { SourceBadge, getMapDisplayName, getMapEnName } from './ReviewShared';
import { isMyTeamMatch, calculateScoreFromRounds } from '../../utils/matchHelpers';
import { CURRENT_PARSER_VERSION } from '../../utils/demoParser';
import { MatchFilterBar, FilterState } from './MatchFilterBar';

interface MatchListProps {
    matches: Match[];
    onSelectMatch: (match: Match) => void;
    onBatchDelete?: (items: { type: 'match', id: string }[]) => void;
    onReparse?: (matches: Match[]) => void;
    onSearch?: (query: string) => void;
    onFilterChange?: (filters: FilterState) => void;
    onCreateBonFromMatches?: (matches: Match[]) => void;
    searchQuery?: string;
    availableMaps?: string[];
    availableServers?: string[];
}

export const MatchList: React.FC<MatchListProps> = ({ 
    matches, 
    onSelectMatch, 
    onBatchDelete,
    onReparse,
    onSearch,
    onFilterChange,
    onCreateBonFromMatches,
    searchQuery = '',
    availableMaps = [],
    availableServers = []
}) => {
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);

    const hasNoData = matches.length === 0;
    const isFilteredEmpty = hasNoData && (availableMaps.length > 0 || availableServers.length > 0);
    const isTrulyEmpty = hasNoData && !isFilteredEmpty;

    if (isTrulyEmpty) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                </div>
                <p className="text-sm font-bold">暂无比赛记录</p>
                <p className="text-xs mt-1">点击右上角导入 Demo JSON</p>
            </div>
        );
    }
    
    // Sort all by date
    const items = [
        ...matches.map(m => ({ type: 'match' as const, data: m, date: m.date, id: m.id }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Selection Handlers
    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleBatchDeleteClick = () => {
        if (!onBatchDelete) return;
        const itemsToDelete = items
            .filter(item => selectedIds.has(item.id))
            .map(item => ({ type: item.type, id: item.id }));
        onBatchDelete(itemsToDelete);
        setIsSelectMode(false);
        setSelectedIds(new Set());
    };

    const handleSelectAll = () => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map(i => i.id)));
        }
    };

    return (
        <div className="pb-20">
             {/* Filter Bar Toggle & Content */}
             {onSearch && onFilterChange && (
                 <div className="mb-4">
                     <div className="flex items-center justify-between mb-2">
                         <button 
                            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                            className="flex items-center gap-2 text-xs font-black text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors group"
                         >
                             <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${isFilterExpanded ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'}`}>
                                 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                             </div>
                             <span>搜索与筛选</span>
                             <svg className={`w-3 h-3 transition-transform duration-300 ${isFilterExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                         </button>

                         {!isFilterExpanded && searchQuery && (
                             <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                                 <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                                     已应用搜索: {searchQuery}
                                 </span>
                             </div>
                         )}
                     </div>

                     {isFilterExpanded && (
                         <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                             <MatchFilterBar 
                                 onSearch={onSearch}
                                 onFilterChange={onFilterChange}
                                 availableMaps={availableMaps}
                                 availableServers={availableServers}
                             />
                         </div>
                     )}
                 </div>
             )}

             {/* Batch Actions Toolbar */}
             <div className="flex justify-end mb-4">
                 {!isSelectMode ? (
                     <button 
                        onClick={() => setIsSelectMode(true)}
                        disabled={hasNoData}
                        className={`text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-lg ${hasNoData ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        批量管理
                    </button>
                 ) : (
                     <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
                         <span className="text-xs font-bold text-neutral-400">已选 {selectedIds.size} 项</span>
                         <button 
                             onClick={handleSelectAll}
                             className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors"
                         >
                             {selectedIds.size === items.length ? '取消全选' : '全选'}
                         </button>
                         {onCreateBonFromMatches && selectedIds.size > 0 && (
                             <button 
                                 onClick={() => {
                                     const selectedMatches = items.filter(i => selectedIds.has(i.id)).map(i => i.data);
                                     onCreateBonFromMatches(selectedMatches);
                                     setIsSelectMode(false);
                                     setSelectedIds(new Set());
                                 }}
                                 className="text-xs font-bold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                             >
                                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                 创建 BON
                             </button>
                         )}
                         {onReparse && selectedIds.size > 0 && (
                             <button 
                                 onClick={() => {
                                     const selectedMatches = items.filter(i => selectedIds.has(i.id)).map(i => i.data);
                                     onReparse(selectedMatches);
                                     setIsSelectMode(false);
                                     setSelectedIds(new Set());
                                 }}
                                 className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                             >
                                 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                 重新解析
                             </button>
                         )}
                         {onBatchDelete && selectedIds.size > 0 && (
                             <button 
                                 onClick={() => {
                                     onBatchDelete(items.filter(i => selectedIds.has(i.id)));
                                     setIsSelectMode(false);
                                     setSelectedIds(new Set());
                                 }}
                                 className="text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                             >
                                 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                 删除
                             </button>
                         )}
                         <button 
                             onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()); }}
                             className="text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 px-3 py-1.5 rounded-lg transition-colors"
                         >
                             退出
                         </button>
                     </div>
                 )}
             </div>

            {hasNoData ? (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                    <p className="text-sm font-bold">没有找到匹配的比赛</p>
                    <p className="text-xs mt-1">请尝试调整筛选条件</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {items.map(item => {
                    const isSelected = selectedIds.has(item.id);

                    // Render Regular Match
                    const match = item.data as Match;
                    const mapName = getMapDisplayName(match.mapId);
                    const mapEn = getMapEnName(match.mapId);
                    
                    const isMine = isMyTeamMatch(match);
                    const isWin = match.result === 'WIN';
                    const isTie = match.result === 'TIE';

                    // Use calculated score for robustness
                    const displayScore = calculateScoreFromRounds(match);

                    let barColor = 'bg-neutral-400';
                    if (isMine) {
                        if (isWin) barColor = 'bg-green-500';
                        else if (isTie) barColor = 'bg-yellow-500';
                        else barColor = 'bg-red-500';
                    }

                    return (
                        <div 
                            key={match.id} 
                            onClick={() => isSelectMode ? toggleSelection(match.id) : onSelectMatch(match)}
                            className={`relative overflow-hidden rounded-2xl cursor-pointer group transition-all duration-300 bg-white dark:bg-neutral-900 border shadow-sm
                                ${isSelected ? 'border-blue-500 ring-2 ring-blue-500 transform scale-[0.98]' : 'border-neutral-200 dark:border-neutral-800 hover:shadow-md active:scale-[0.98]'}
                            `}
                        >
                            {/* Selection Overlay */}
                            {isSelectMode && (
                                <div className={`absolute inset-0 z-30 bg-black/10 flex items-center justify-center backdrop-blur-[1px] transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-black/50 border-white text-transparent'}`}>
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                </div>
                            )}

                            {/* Status Bar */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 z-10 ${barColor}`}></div>

                            <div className="p-5 pl-7 relative z-0">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-black text-neutral-900 dark:text-white leading-none">{mapName}</h3>
                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">{mapEn}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <SourceBadge source={match.source} />
                                        {match.source === 'Demo' && match.parserVersion !== CURRENT_PARSER_VERSION && (
                                            <span 
                                                className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[10px] font-bold rounded uppercase tracking-wider"
                                                title={!match.rawDemoJson ? "缺少原始数据，无法自动升级，请重新导入" : "数据过期，等待自动升级"}
                                            >
                                                {!match.rawDemoJson ? "需重新导入" : "数据过期"}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Score Content */}
                                <div className="flex items-end justify-between">
                                    <div>
                                        <div className="flex items-baseline gap-1 mb-1">
                                             <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400">SCORE</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-3xl font-black font-mono tracking-tighter ${isMine && isWin ? 'text-green-600 dark:text-green-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                                                {displayScore.us}
                                            </span>
                                            <span className="text-xl text-neutral-400/50 font-light">:</span>
                                            <span className={`text-3xl font-black font-mono tracking-tighter ${isMine && !isWin && !isTie ? 'text-red-600 dark:text-red-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                                                {displayScore.them}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right">
                                         {match.serverName && <div className="text-[10px] font-bold text-neutral-400 mb-1 truncate max-w-[120px]" title={match.serverName}>{match.serverName}</div>}
                                         <button className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                             查看详情 &rarr;
                                         </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            )}
            
            {/* Batch Action Floating Bar */}
            {isSelectMode && selectedIds.size > 0 && (
                <div className="fixed bottom-20 left-4 right-4 z-40 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <div className="bg-neutral-900 dark:bg-neutral-800 text-white rounded-2xl shadow-2xl border border-neutral-700/50 p-4 flex items-center justify-between">
                        <div className="font-bold text-sm">已选择 {selectedIds.size} 项</div>
                        <button 
                            onClick={handleBatchDeleteClick}
                            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-red-600/20 transition-transform active:scale-95 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            删除选中
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
