
import React from 'react';
import { PlayerMatchStats } from '../../types';

interface ClutchesTabProps {
    players: PlayerMatchStats[];
    enemyPlayers: PlayerMatchStats[];
}

export const ClutchesTab: React.FC<ClutchesTabProps> = ({ players, enemyPlayers }) => {
    
    const renderClutchSection = (teamName: string, teamPlayers: PlayerMatchStats[]) => {
        // Filter players who actually had clutch attempts
        const activeClutchers = teamPlayers.filter(p => p.clutchHistory && p.clutchHistory.length > 0);
        
        if (activeClutchers.length === 0) {
            return (
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 text-center text-neutral-400 text-sm">
                    {teamName} 本场无残局记录
                </div>
            );
        }

        return (
            <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-1">{teamName}</h4>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                    {activeClutchers.map(p => (
                        <div key={p.playerId} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="font-bold text-sm text-neutral-900 dark:text-white w-32 shrink-0 truncate">
                                {p.playerId}
                            </div>
                            <div className="flex flex-wrap gap-2 flex-1">
                                {p.clutchHistory.sort((a,b) => a.round - b.round).map((attempt, idx) => {
                                    let styleClass = "";
                                    let label = "";

                                    if (attempt.result === 'won') {
                                        styleClass = "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
                                        label = "胜";
                                    } else if (attempt.result === 'saved') {
                                        styleClass = "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
                                        label = "保";
                                    } else {
                                        styleClass = "bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-500 dark:border-neutral-700";
                                        label = "负";
                                    }

                                    return (
                                        <div key={idx} className={`px-2 py-1 rounded-lg border text-xs font-bold font-sans tabular-nums flex items-center gap-1.5 ${styleClass}`}>
                                            <span className="opacity-50">R{attempt.round}:</span>
                                            <span>1v{attempt.opponentCount} {label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {renderClutchSection("我方关键时刻", players)}
            {renderClutchSection("敌方关键时刻", enemyPlayers)}
        </div>
    );
};
