import React from 'react';
import { Match, PlayerMatchStats } from '../../types';
import { ScoreboardTable } from './ScoreboardTable';
import { useAggregatedStats } from '../../hooks/useAggregatedStats';
import { getTeamNames } from '../../utils/matchHelpers';

type SideFilter = 'ALL' | 'CT' | 'T';

interface ScoreboardTabProps {
    match: Match;
    players: PlayerMatchStats[];
    enemyPlayers: PlayerMatchStats[];
    onPlayerClick: (id: string) => void;
    filter: SideFilter;
}

export const ScoreboardTab: React.FC<ScoreboardTabProps> = ({ 
    match,
    players, 
    enemyPlayers, 
    onPlayerClick, 
    filter 
}) => {
    const allPlayers = [...players, ...enemyPlayers];
    const aggregatedAll = useAggregatedStats(match, allPlayers, filter);
    
    const aggregatedPlayers = aggregatedAll.slice(0, players.length);
    const aggregatedEnemies = aggregatedAll.slice(players.length);
    const { teamA, teamB } = getTeamNames(match);

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                <ScoreboardTable 
                    players={aggregatedPlayers} 
                    title={teamA} 
                    isEnemy={false} 
                    filter={filter} 
                    onPlayerClick={onPlayerClick} 
                />
                <div className="h-px bg-neutral-100 dark:bg-neutral-800 mx-4"></div>
                <ScoreboardTable 
                    players={aggregatedEnemies} 
                    title={teamB} 
                    isEnemy={true} 
                    filter={filter} 
                    onPlayerClick={onPlayerClick} 
                />
            </div>
        </div>
    );
};