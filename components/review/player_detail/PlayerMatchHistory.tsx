
import React from 'react';
import { Match, PlayerMatchStats } from '../../../types';
import { getMapDisplayName, getRatingColorClass } from '../ReviewShared';
import { isMyTeamMatch } from '../../../utils/matchHelpers';

interface PlayerMatchHistoryProps {
    history: { match: Match, stats: PlayerMatchStats }[];
    onMatchClick: (match: Match) => void;
}

export const PlayerMatchHistory: React.FC<PlayerMatchHistoryProps> = ({ history, onMatchClick }) => {
    return (
        <div>
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 px-1">全部比赛</h3>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800 shadow-sm">
                {history.map(({ match, stats }) => {
                    const mapName = getMapDisplayName(match.mapId);
                    const kdDiff = stats.kills - stats.deaths;

                    // Calculate Result relative to this player
                    const isPlayerOnMyTeam = isMyTeamMatch(match);
                    
                    let resultForPlayer = match.result;
                    if (match.result !== 'TIE') {
                        if (!isPlayerOnMyTeam) {
                            resultForPlayer = match.result === 'WIN' ? 'LOSS' : 'WIN';
                        }
                    }

                    const scoreLeft = isPlayerOnMyTeam ? match.score.us : match.score.them;
                    const scoreRight = isPlayerOnMyTeam ? match.score.them : match.score.us;
                    
                    const winColor = resultForPlayer === 'WIN' ? 'text-green-600 dark:text-green-500' : resultForPlayer === 'LOSS' ? 'text-red-500' : 'text-yellow-500';
                    
                    const roundsPlayed = (match.score.us + match.score.them) || 1;
                    const wpaVal = stats.wpa ? (stats.wpa / roundsPlayed) : 0;

                    return (
                        <div 
                            key={match.id} 
                            onClick={() => onMatchClick(match)}
                            className="p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-1.5 h-10 rounded-full ${resultForPlayer === 'WIN' ? 'bg-green-500' : resultForPlayer === 'LOSS' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-sm text-neutral-900 dark:text-white">{mapName}</span>
                                        <span className={`text-xs font-mono font-bold ${winColor}`}>{scoreLeft}:{scoreRight}</span>
                                    </div>
                                    <div className="text-[10px] text-neutral-400 font-mono mt-0.5 truncate max-w-[120px]">{match.serverName || match.date.split('T')[0]}</div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-6 text-right">
                                <div className="hidden sm:block">
                                    <div className="text-[9px] font-bold text-neutral-400 uppercase">WPA</div>
                                    <div className={`text-xs font-mono font-bold ${wpaVal > 0 ? 'text-green-500' : wpaVal < 0 ? 'text-red-500' : 'text-neutral-500'}`}>
                                        {wpaVal > 0 ? '+' : ''}{wpaVal.toFixed(1)}%
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[9px] font-bold text-neutral-400 uppercase">K-D</div>
                                    <div className={`text-xs font-mono font-bold ${kdDiff > 0 ? 'text-green-500' : kdDiff < 0 ? 'text-red-500' : 'text-neutral-500'}`}>
                                        {stats.kills}-{stats.deaths}
                                    </div>
                                </div>
                                
                                <div className={`w-14 text-right font-black font-mono text-lg ${getRatingColorClass(stats.rating)}`}>
                                    {stats.rating.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
