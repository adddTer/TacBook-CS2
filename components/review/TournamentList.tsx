import React from 'react';
import { Tournament } from '../../types';

interface TournamentListProps {
    tournaments: Tournament[];
    onSelectTournament: (tournament: Tournament) => void;
    onDeleteTournament: (tournament: Tournament) => void;
}

export const TournamentList: React.FC<TournamentListProps> = ({ tournaments, onSelectTournament, onDeleteTournament }) => {
    if (tournaments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-neutral-600">
                <div className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-neutral-900 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <p className="text-sm font-medium">暂无赛事数据</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tournaments.map(tournament => (
                <div 
                    key={tournament.id}
                    onClick={() => onSelectTournament(tournament)}
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
                >
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-lg text-neutral-900 dark:text-white line-clamp-1">{tournament.title}</h3>
                        <div className="flex items-center gap-1">
                            <span className="text-xs font-bold px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                {tournament.matches.length} 场比赛
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-neutral-500 mb-4">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span>{tournament.startDate} {tournament.endDate ? `- ${tournament.endDate}` : ''}</span>
                    </div>

                    <div className="flex justify-end mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteTournament(tournament); }}
                            className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="删除赛事"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
