
import React from 'react';
import { PlayerMatchStats, Match } from '../../types';
import { StatBox, getMapDisplayName, getRatingColorClass } from './ReviewShared';

interface PlayerDetailProps {
    profile: any;
    history: { match: Match, stats: PlayerMatchStats }[];
    onBack: () => void;
    onMatchClick: (match: Match) => void;
}

export const PlayerDetail: React.FC<PlayerDetailProps> = ({ profile, history, onBack, onMatchClick }) => {
    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300 px-1 font-sans">
            <button 
                onClick={onBack}
                className="flex items-center text-sm font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                返回列表
            </button>

            {/* Profile Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden">
                 {/* Background decoration */}
                 <div className="absolute top-0 right-0 p-12 opacity-[0.03] font-black text-9xl text-black dark:text-white select-none pointer-events-none transform translate-x-10 -translate-y-12 whitespace-nowrap">
                     {profile.id}
                 </div>
                 
                 <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
                     {/* Avatar */}
                     <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-blue-500/20 shrink-0">
                         {profile.id[0]}
                     </div>
                     
                     {/* Name & Stats */}
                     <div className="flex-1 text-center md:text-left min-w-0">
                         <h2 className="text-3xl font-black text-neutral-900 dark:text-white leading-none tracking-tight truncate">{profile.id}</h2>
                         {profile.steamid && (
                             <div className="text-[10px] font-mono text-neutral-400 mt-1 select-all">{profile.steamid}</div>
                         )}
                         <div className="flex items-center justify-center md:justify-start gap-3 mt-2.5">
                             <span className="text-xs font-bold bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                                 {profile.matches} Maps
                             </span>
                             <span className="text-xs font-bold text-neutral-400">{profile.role}</span>
                         </div>
                     </div>

                     {/* Main Rating */}
                     <div className="text-center bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl min-w-[120px] border border-neutral-100 dark:border-neutral-800 shrink-0">
                         <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Rating 4.0</div>
                         <div className={`text-5xl font-black tracking-tighter tabular-nums ${getRatingColorClass(Number(profile.avgRating))}`}>
                             {profile.avgRating}
                         </div>
                     </div>
                 </div>

                 {/* Detailed Stats Grid - Removed Impact, 3 Cols */}
                 <div className="grid grid-cols-3 gap-3 mt-8">
                     <StatBox label="K/D" value={profile.kdRatio} highlight={true} />
                     <StatBox label="ADR" value={profile.avgAdr} highlight={true} />
                     <StatBox label="爆头率" value={`${profile.avgHs}%`} highlight={true} />
                 </div>
            </div>

            {/* Match History List */}
            <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4 px-1">近期表现 History</h3>
                <div className="space-y-3">
                    {history.map(({ match, stats }) => {
                        const mapName = getMapDisplayName(match.mapId);
                        const kdDiff = stats.kills - stats.deaths;

                        // Calculate Result relative to this player
                        // Does match.players (My Team) contain this player?
                        const isPlayerOnMyTeam = match.players.some(p => p.steamid === stats.steamid || p.playerId === stats.playerId);

                        let resultForPlayer = match.result; // Default TIE or MyTeam result
                        if (match.result !== 'TIE') {
                            if (isPlayerOnMyTeam) {
                                resultForPlayer = match.result;
                            } else {
                                // Flip result for enemy team player
                                resultForPlayer = match.result === 'WIN' ? 'LOSS' : 'WIN';
                            }
                        }

                        // Determine Score Order
                        // If my team: US : THEM
                        // If enemy team: THEM : US (show their score first)
                        const scoreLeft = isPlayerOnMyTeam ? match.score.us : match.score.them;
                        const scoreRight = isPlayerOnMyTeam ? match.score.them : match.score.us;
                        
                        const barColor = resultForPlayer === 'WIN' ? 'bg-green-500' : resultForPlayer === 'LOSS' ? 'bg-red-500' : 'bg-yellow-500';
                        const badgeColor = resultForPlayer === 'WIN' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500' : 
                                           resultForPlayer === 'LOSS' ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800' : // Loss usually neutral grey for text
                                           'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500';

                        return (
                            <button 
                                key={match.id} 
                                onClick={() => onMatchClick(match)}
                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-xl flex items-center justify-between hover:border-blue-500/50 hover:shadow-md transition-all active:scale-[0.99] group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-1 h-8 rounded-full ${barColor}`}></div>
                                    <div className="text-left">
                                        <div className="text-base font-black text-neutral-900 dark:text-white flex items-center gap-2 mb-1">
                                            {mapName}
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeColor}`}>
                                                {scoreLeft}:{scoreRight}
                                            </span>
                                        </div>
                                        {match.serverName && <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider text-left tabular-nums truncate max-w-[120px]">{match.serverName}</div>}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-6 text-right">
                                    <div className="flex flex-col items-end justify-center h-full">
                                        <div className="text-sm font-bold text-neutral-700 dark:text-neutral-300 tabular-nums">
                                            {stats.kills}<span className="text-neutral-300 mx-0.5">-</span>{stats.deaths}
                                        </div>
                                        <div className={`text-xs font-bold tabular-nums ${kdDiff > 0 ? 'text-green-500' : kdDiff < 0 ? 'text-red-500' : 'text-neutral-400'}`}>
                                            {kdDiff > 0 ? '+' : ''}{kdDiff}
                                        </div>
                                    </div>
                                    
                                    <div className={`text-xl font-black tabular-nums w-12 text-right ${getRatingColorClass(stats.rating)}`}>
                                        {stats.rating.toFixed(2)}
                                    </div>

                                    <div className="text-neutral-300 group-hover:text-blue-500 transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};