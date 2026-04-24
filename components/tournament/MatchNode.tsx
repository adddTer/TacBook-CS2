import React from 'react';
import { TournamentStageMatch } from '../../types';

export const BracketMatchNode = ({ match, shadowColor, onClick }: { match?: TournamentStageMatch, shadowColor?: string, onClick?: () => void }) => {
    if (!match) return <div className="w-[180px] h-[80px] bg-neutral-100 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700/50 opacity-50" />;
    
    const statusMap: Record<string, string> = {
        'pending': '未开始',
        'live': '进行中',
        'completed': '已结束'
    };

    const statusText = statusMap[match.status] || match.status;

    return (
      <div 
        onClick={onClick}
        className={`w-[180px] h-[80px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-sm overflow-hidden flex flex-col justify-between relative z-10 transition-transform hover:-translate-y-0.5 cursor-pointer ${shadowColor || 'hover:shadow-md'}`}
      >
        <div className="flex justify-between items-center px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-800/50">
            <span className="text-[10px] text-neutral-500 font-medium tracking-wider">
                {match.isThirdPlace ? '季军赛 ' : match.isShowmatch ? '表演赛 ' : ''}
                {match.date ? `${match.date}` : match.bestOf ? `BO${match.bestOf}` : 'BO3'}
            </span>
            <span className={`text-[9px] uppercase font-bold px-1.5 py-px rounded ${
                match.status === 'completed' ? 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300' : 
                match.status === 'live' ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 
                'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
            }`}>
                {statusText}
            </span>
        </div>
        <div className="flex flex-col text-sm font-bold flex-1 justify-center">
          <div className="flex justify-between items-center px-3 py-0.5">
            <span className="text-neutral-900 dark:text-white truncate pr-2 text-xs">{match.team1}</span>
            <span className="text-neutral-500 font-mono text-xs">{match.score1 ?? '-'}</span>
          </div>
          <div className="flex justify-between items-center px-3 py-0.5">
            <span className="text-neutral-900 dark:text-white truncate pr-2 text-xs">{match.team2}</span>
            <span className="text-neutral-500 font-mono text-xs">{match.score2 ?? '-'}</span>
          </div>
        </div>
      </div>
    );
};
