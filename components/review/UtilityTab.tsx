
import React from 'react';
import { PlayerMatchStats } from '../../types';

interface UtilityTabProps {
    players: PlayerMatchStats[];
}

export const UtilityTab: React.FC<UtilityTabProps> = ({ players }) => {
    // Sort by Total Utility Damage (HE + Fire)
    const sortedPlayers = [...players].sort((a,b) => (b.utility.heDamage + b.utility.molotovDamage) - (a.utility.heDamage + a.utility.molotovDamage));
    
    // Find max values for bars
    const maxDamage = Math.max(...sortedPlayers.map(p => p.utility.heDamage + p.utility.molotovDamage), 1);

    return (
        <div className="space-y-4 font-sans">
            {/* Header / Legend */}
            <div className="flex justify-end gap-4 text-[10px] text-neutral-400 font-bold uppercase tracking-widest px-2">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> 伤害</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> 闪光</span>
            </div>

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
                                    {/* Name & Basic Stats */}
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-bold text-sm text-neutral-900 dark:text-white truncate pr-2">
                                            {p.playerId}
                                        </h4>
                                        <div className="flex items-center gap-3">
                                            {/* Throws Icons */}
                                            <div className="flex gap-2">
                                                 <ThrowStat label="烟" count={p.utility.smokesThrown} />
                                                 <ThrowStat label="闪" count={p.utility.flashesThrown} />
                                                 <ThrowStat label="雷" count={p.utility.heThrown} />
                                                 <ThrowStat label="火" count={p.utility.molotovsThrown} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Damage Bars */}
                                    <div className="space-y-3">
                                        {/* HE/Fire Damage */}
                                        <div>
                                            <div className="flex justify-between text-[10px] font-bold text-neutral-500 mb-1">
                                                <span>道具总伤害</span>
                                                <span className="text-neutral-900 dark:text-white">{totalDmg}</span>
                                            </div>
                                            <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full" style={{ width: `${dmgPercent}%` }}></div>
                                            </div>
                                            <div className="flex gap-3 mt-1 text-[9px] text-neutral-400 font-mono">
                                                <span>手雷: {p.utility.heDamage}</span>
                                                <span>燃烧: {p.utility.molotovDamage}</span>
                                            </div>
                                        </div>

                                        {/* Flash Stats */}
                                        <div className="flex gap-2 mt-2">
                                            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg px-2 py-1.5 flex-1 border border-blue-100 dark:border-blue-900/20 text-center">
                                                <div className="text-[9px] font-bold text-blue-400 mb-0.5">闪光助攻</div>
                                                <div className="text-lg font-black text-blue-600 dark:text-blue-400 leading-none">{p.flash_assists || 0}</div>
                                            </div>
                                            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg px-2 py-1.5 flex-1 border border-blue-100 dark:border-blue-900/20 text-center">
                                                <div className="text-[9px] font-bold text-blue-400 mb-0.5">致盲敌人数</div>
                                                <div className="text-lg font-black text-blue-600 dark:text-blue-400 leading-none">{p.utility.enemiesBlinded}</div>
                                            </div>
                                            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg px-2 py-1.5 flex-1 border border-blue-100 dark:border-blue-900/20 text-center">
                                                <div className="text-[9px] font-bold text-blue-400 mb-0.5">致盲时长</div>
                                                <div className="text-lg font-black text-blue-600 dark:text-blue-400 leading-none">{p.utility.blindDuration.toFixed(1)}s</div>
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

const ThrowStat = ({ label, count }: { label: string, count: number }) => (
    <div className={`flex flex-col items-center w-5 ${count > 0 ? 'opacity-100' : 'opacity-20'}`}>
        <span className="text-[9px] font-black text-neutral-400">{label}</span>
        <span className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300 font-mono">{count}</span>
    </div>
);
