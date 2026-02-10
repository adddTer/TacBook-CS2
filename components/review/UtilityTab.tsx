
import React from 'react';
import { PlayerMatchStats } from '../../types';

interface UtilityTabProps {
    players: PlayerMatchStats[];
}

export const UtilityTab: React.FC<UtilityTabProps> = ({ players }) => {
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
