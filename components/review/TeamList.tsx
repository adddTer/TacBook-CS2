import React from 'react';
import { TeamProfile } from '../../types';
import { getTeams } from '../../utils/teamLoader';

interface TeamListProps {
    onSelectTeam: (team: TeamProfile) => void;
}

export const TeamList: React.FC<TeamListProps> = ({ onSelectTeam }) => {
    const teams = getTeams();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(team => (
                <div 
                    key={team.id} 
                    onClick={() => onSelectTeam(team)}
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex flex-col cursor-pointer hover:border-blue-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all group"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center text-lg font-black text-neutral-400 group-hover:text-blue-500 group-hover:from-blue-50 group-hover:to-indigo-50 dark:group-hover:from-blue-900/20 dark:group-hover:to-indigo-900/20 transition-colors shadow-inner">
                                {team.name ? team.name[0].toUpperCase() : '?'}
                            </div>
                            <div>
                                <h4 className="font-bold text-base text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">{team.name}</h4>
                                <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">{team.players.length} 名队员</div>
                            </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${team.type === 'user' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50' : 'bg-neutral-50 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'}`}>
                            {team.type === 'user' ? '用户队伍' : '职业队伍'}
                        </span>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-800/50">
                        <div className="flex flex-wrap gap-1.5">
                            {team.players.slice(0, 6).map(player => (
                                <span key={player.id} className="px-2 py-1 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-300 text-[11px] font-medium rounded-md border border-neutral-200/50 dark:border-neutral-700/50 truncate max-w-[80px]" title={player.name}>
                                    {player.name}
                                </span>
                            ))}
                            {team.players.length > 6 && (
                                <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-[11px] font-medium rounded-md border border-neutral-200 dark:border-neutral-700">
                                    +{team.players.length - 6}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
