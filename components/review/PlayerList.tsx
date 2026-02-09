
import React from 'react';
import { PlayerMatchStats } from '../../types';
import { RankBadge, getRatingColorClass } from './ReviewShared';

interface PlayerListProps {
    playerStats: any[]; // Calculated stats for roster
    onSelectPlayer: (id: string) => void;
}

export const PlayerList: React.FC<PlayerListProps> = ({ playerStats, onSelectPlayer }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playerStats.map(player => (
                <div 
                    key={player.id} 
                    onClick={() => onSelectPlayer(player.id)}
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:border-blue-500/50 hover:shadow-md transition-all group active:scale-[0.99]"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center text-xl font-black text-neutral-400 group-hover:text-blue-500 group-hover:from-blue-50 group-hover:to-indigo-50 dark:group-hover:from-blue-900/20 dark:group-hover:to-indigo-900/20 transition-colors">
                            {player.id[0]}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <h4 className="font-bold text-lg text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{player.name}</h4>
                                <RankBadge rank={player.currentRank} />
                            </div>
                            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{player.role.split(' ')[0]}</div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Rating</div>
                        <div className={`text-2xl font-black tracking-tighter ${getRatingColorClass(Number(player.avgRating))}`}>
                            {player.avgRating}
                        </div>
                        <div className="text-[10px] text-neutral-400">{player.matches} 场数据</div>
                    </div>
                </div>
            ))}
        </div>
    );
};
