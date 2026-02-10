
import React from 'react';
import { PlayerMatchStats } from '../../types';

interface DuelsTabProps {
    players: PlayerMatchStats[];
    enemyPlayers: PlayerMatchStats[];
}

export const DuelsTab: React.FC<DuelsTabProps> = ({ players, enemyPlayers }) => {
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
