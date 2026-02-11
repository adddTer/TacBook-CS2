
import React from 'react';
import { getRatingColorClass } from './ReviewShared';

export const RoundTeamStats = ({ teamName, players, color }: { teamName: string, players: any[], color: string }) => {
    return (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
            <h5 className={`text-[10px] font-black uppercase px-3 py-2 ${color} bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800`}>
                {teamName}
            </h5>
            <div className="p-1">
                {/* Header */}
                <div className="flex items-center justify-between text-[9px] font-bold text-neutral-400 px-2 py-1.5 border-b border-neutral-100 dark:border-neutral-800 mb-1">
                    <div className="w-24">ID</div>
                    <div className="flex gap-1 text-center flex-1 justify-end">
                        <div className="w-10">K / D</div>
                        <div className="w-10">DMG</div>
                        <div className="w-10" title="Win Probability Added">WPA</div>
                        <div className="w-10 text-right">RTG</div>
                    </div>
                </div>
                {/* Rows */}
                {players.sort((a,b) => b.rating - a.rating).map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors group">
                        <div className="flex items-center gap-2 w-24 truncate font-bold text-neutral-700 dark:text-neutral-300">
                            {p.survived ? 
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0 shadow-[0_0_5px_rgba(34,197,94,0.6)]" title="存活"></div> : 
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0 opacity-20" title="阵亡"></div>
                            }
                            <span className="truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{p.name}</span>
                        </div>
                        <div className="flex gap-1 text-center flex-1 justify-end">
                            <div className="w-10 font-mono text-[11px]">
                                <span className={p.kills > 0 ? 'text-neutral-900 dark:text-white font-bold' : 'text-neutral-400'}>{p.kills}</span>
                                <span className="text-neutral-300 mx-0.5">/</span>
                                <span className={p.deaths > 0 ? 'text-red-500' : 'text-neutral-400'}>{p.deaths}</span>
                            </div>
                            <div className="w-10 font-mono text-neutral-500 text-[11px]">{p.damage}</div>
                            <div className={`w-10 font-mono font-bold text-[10px] tracking-tighter ${p.wpa > 0 ? 'text-green-600 dark:text-green-400' : p.wpa < 0 ? 'text-red-500' : 'text-neutral-400'}`}>
                                {p.wpa > 0 ? '+' : ''}{p.wpa ? p.wpa.toFixed(1) : '0.0'}%
                            </div>
                             <div className="w-10 text-right">
                                <div className={`font-mono font-black text-[11px] ${getRatingColorClass(p.rating)}`}>{p.rating.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
