
import React from 'react';
import { PlayerMatchStats } from '../../types';

interface UtilityTabProps {
    players: PlayerMatchStats[];
    enemyPlayers: PlayerMatchStats[];
}

export const UtilityTab: React.FC<UtilityTabProps> = ({ players, enemyPlayers }) => {
    // Combine for max calculations
    const allPlayers = [...players, ...enemyPlayers];
    const maxDamage = Math.max(...allPlayers.map(p => p.utility.heDamage + p.utility.molotovDamage), 1);
    
    // Check for missing blind data anomaly
    const totalFlashes = allPlayers.reduce((acc, p) => acc + p.utility.flashesThrown, 0);
    const totalBlinded = allPlayers.reduce((acc, p) => acc + p.utility.enemiesBlinded, 0);
    const totalFlashAssists = allPlayers.reduce((acc, p) => acc + (p.flash_assists || 0), 0);
    
    // Data is broken if: 
    // 1. Threw many flashes (>5) but blinded no one.
    // 2. Has flash assists but blinded no one (impossible unless data missing).
    const isBlindDataMissing = (totalFlashes > 5 && totalBlinded === 0) || (totalFlashAssists > 0 && totalBlinded === 0);

    const renderTeamList = (teamName: string, teamPlayers: PlayerMatchStats[]) => {
        // Sort by Total Utility Damage (HE + Fire)
        const sortedPlayers = [...teamPlayers].sort((a,b) => (b.utility.heDamage + b.utility.molotovDamage) - (a.utility.heDamage + a.utility.molotovDamage));
        
        if (sortedPlayers.length === 0) return null;

        return (
            <div className="space-y-3 mb-6">
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-1">{teamName}</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {sortedPlayers.map((p, idx) => {
                        const totalDmg = p.utility.heDamage + p.utility.molotovDamage;
                        const dmgPercent = (totalDmg / maxDamage) * 100;
                        
                        return (
                            <div key={idx} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm hover:border-blue-500/30 transition-colors">
                                <div className="flex items-start gap-4">
                                    {/* Rank/Avatar */}
                                    <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 text-lg font-black text-neutral-400">
                                        {p.playerId[0]}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        {/* Name & Throws */}
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-bold text-sm text-neutral-900 dark:text-white truncate pr-2">
                                                {p.playerId}
                                            </h4>
                                            <div className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-800/50 px-2 py-1 rounded-lg">
                                                 <ThrowStat label="烟" count={p.utility.smokesThrown} />
                                                 <ThrowStat label="闪" count={p.utility.flashesThrown} />
                                                 <ThrowStat label="雷" count={p.utility.heThrown} />
                                                 <ThrowStat label="火" count={p.utility.molotovsThrown} />
                                            </div>
                                        </div>

                                        {/* Damage Section */}
                                        <div className="space-y-2 mb-4">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">道具总伤</span>
                                                <span className="text-xl font-black text-neutral-900 dark:text-white leading-none">{totalDmg}</span>
                                            </div>
                                            
                                            {/* Progress Bar */}
                                            <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full" style={{ width: `${dmgPercent}%` }}></div>
                                            </div>

                                            {/* Damage Breakdown Badges */}
                                            <div className="flex gap-2 mt-2">
                                                <div className="flex-1 flex items-center justify-between bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded px-2 py-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                        <span className="text-[10px] font-bold text-red-600 dark:text-red-400">手雷</span>
                                                    </div>
                                                    <span className="text-xs font-black text-red-700 dark:text-red-300 tabular-nums">{p.utility.heDamage}</span>
                                                </div>
                                                <div className="flex-1 flex items-center justify-between bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 rounded px-2 py-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                                        <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">燃烧</span>
                                                    </div>
                                                    <span className="text-xs font-black text-orange-700 dark:text-orange-300 tabular-nums">{p.utility.molotovDamage}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Flash Stats */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg px-1 py-1.5 border border-blue-100 dark:border-blue-900/20 text-center">
                                                <div className="text-[9px] font-bold text-blue-400 mb-0.5">闪光助攻</div>
                                                <div className="text-sm font-black text-blue-600 dark:text-blue-400 leading-none">{p.flash_assists || 0}</div>
                                            </div>
                                            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg px-1 py-1.5 border border-blue-100 dark:border-blue-900/20 text-center">
                                                <div className="text-[9px] font-bold text-blue-400 mb-0.5">致盲人数</div>
                                                <div className={`text-sm font-black leading-none ${isBlindDataMissing ? 'text-neutral-300 dark:text-neutral-600' : 'text-blue-600 dark:text-blue-400'}`}>
                                                    {isBlindDataMissing ? '-' : p.utility.enemiesBlinded}
                                                </div>
                                            </div>
                                            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg px-1 py-1.5 border border-blue-100 dark:border-blue-900/20 text-center">
                                                <div className="text-[9px] font-bold text-blue-400 mb-0.5">致盲时长</div>
                                                <div className={`text-sm font-black leading-none ${isBlindDataMissing ? 'text-neutral-300 dark:text-neutral-600' : 'text-blue-600 dark:text-blue-400'}`}>
                                                    {isBlindDataMissing ? '-' : `${p.utility.blindDuration.toFixed(1)}s`}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="font-sans">
            {isBlindDataMissing && (
                <div className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-800 rounded-full text-yellow-600 dark:text-yellow-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-yellow-700 dark:text-yellow-400">数据缺失警告</h4>
                        <p className="text-[10px] text-yellow-600 dark:text-yellow-500">部分数据可能因缺失而显示错误。</p>
                    </div>
                </div>
            )}
            
            {renderTeamList("我方道具数据", players)}
            {renderTeamList("敌方道具数据", enemyPlayers)}
        </div>
    );
};

const ThrowStat = ({ label, count }: { label: string, count: number }) => (
    <div className={`flex flex-col items-center w-4 ${count > 0 ? 'opacity-100' : 'opacity-20'}`}>
        <span className="text-[8px] font-bold text-neutral-400">{label}</span>
        <span className="text-[10px] font-black text-neutral-700 dark:text-neutral-300 font-mono leading-none">{count}</span>
    </div>
);
