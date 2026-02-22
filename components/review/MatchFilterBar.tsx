import React, { useState, useEffect } from 'react';
import { MAPS } from '../../constants';

export interface FilterState {
    type: 'all' | 'series' | 'match';
    map: string;
    server: string;
    result: 'all' | 'win' | 'loss' | 'tie' | 'na';
    rosterCount: 'all' | '5' | 'any' | 'none' | 'custom';
    customRosterCount: number;
}

interface MatchFilterBarProps {
    onSearch: (query: string) => void;
    onFilterChange: (filters: FilterState) => void;
    availableMaps: string[];
    availableServers: string[];
}

export const MatchFilterBar: React.FC<MatchFilterBarProps> = ({
    onSearch,
    onFilterChange,
    availableMaps,
    availableServers
}) => {
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState<FilterState>({
        type: 'all',
        map: 'all',
        server: 'all',
        result: 'all',
        rosterCount: 'all',
        customRosterCount: 5
    });

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            onSearch(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, onSearch]);

    // Notify filter changes
    useEffect(() => {
        onFilterChange(filters);
    }, [filters, onFilterChange]);

    const handleFilterChange = (key: keyof FilterState, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 mb-6 shadow-sm space-y-4">
            {/* Search Input */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl leading-5 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="搜索地图 (Mirage/荒漠迷城)、服务器、比分 (13:11)、队员昵称/SteamID..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                {/* Type Filter */}
                <select
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                >
                    <option value="all">全部类型</option>
                    <option value="series">系列赛</option>
                    <option value="match">单场比赛</option>
                </select>

                {/* Map Filter */}
                <select
                    value={filters.map}
                    onChange={(e) => handleFilterChange('map', e.target.value)}
                    className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                >
                    <option value="all">所有地图</option>
                    {availableMaps.map(mapId => {
                        const mapInfo = MAPS.find(m => m.id === mapId);
                        const label = mapInfo ? `${mapInfo.name} (${mapInfo.enName})` : mapId;
                        return <option key={mapId} value={mapId}>{label}</option>;
                    })}
                </select>

                {/* Server Filter */}
                <select
                    value={filters.server}
                    onChange={(e) => handleFilterChange('server', e.target.value)}
                    className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 max-w-[150px]"
                >
                    <option value="all">所有服务器</option>
                    {availableServers.map(server => (
                        <option key={server} value={server}>{server}</option>
                    ))}
                </select>

                {/* Result Filter */}
                <select
                    value={filters.result}
                    onChange={(e) => handleFilterChange('result', e.target.value)}
                    className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                >
                    <option value="all">所有结果</option>
                    <option value="win">胜利</option>
                    <option value="loss">失败</option>
                    <option value="tie">平局</option>
                    <option value="na">不适用</option>
                </select>

                {/* Roster Count Filter */}
                <div className="flex items-center gap-2">
                    <select
                        value={filters.rosterCount}
                        onChange={(e) => handleFilterChange('rosterCount', e.target.value)}
                        className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                    >
                        <option value="all">不限人数</option>
                        <option value="5">完整五人</option>
                        <option value="any">任意一名</option>
                        <option value="none">不包含</option>
                        <option value="custom">自定义人数...</option>
                    </select>
                    
                    {filters.rosterCount === 'custom' && (
                        <input
                            type="number"
                            min="0"
                            max="5"
                            value={filters.customRosterCount}
                            onChange={(e) => handleFilterChange('customRosterCount', parseInt(e.target.value) || 0)}
                            className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-16 p-2.5"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
