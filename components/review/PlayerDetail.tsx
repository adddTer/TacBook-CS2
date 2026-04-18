
import React, { useState } from 'react';
import { PlayerMatchStats, Match } from '../../types';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { AbilityType } from './player_detail/config';

// Import New Sub-Components
import { PlayerDetailHeader } from './player_detail/PlayerDetailHeader';
import { PlayerHeroCard } from './player_detail/PlayerHeroCard';
import { PlayerStatsGrid } from './player_detail/PlayerStatsGrid';
import { PlayerAbilitySection } from './player_detail/PlayerAbilitySection';
import { PlayerMatchHistory } from './player_detail/PlayerMatchHistory';
import { identifyRole } from '../../utils/analytics/roleIdentifier';

interface PlayerDetailProps {
    profile: any;
    history: { match: Match, stats: PlayerMatchStats }[];
    onBack: () => void;
    onMatchClick: (match: Match) => void;
}

type SideFilter = 'ALL' | 'CT' | 'T';

export const PlayerDetail: React.FC<PlayerDetailProps> = ({ profile, history, onBack, onMatchClick }) => {
    const [sideFilter, setSideFilter] = useState<SideFilter>('ALL');
    const [selectedAbility, setSelectedAbility] = useState<AbilityType>('firepower');

    // Use custom hook for logic
    const { overall, filtered } = usePlayerStats(profile.id, history, sideFilter);
    
    // Identify Role
    const calculatedRole = identifyRole(filtered);

    // Order for Radar Chart
    const abilities: { id: AbilityType, label: string, value: number, isPct?: boolean }[] = [
        { id: 'firepower', label: '火力', value: filtered.scoreFirepower }, 
        { id: 'entry', label: '破点', value: filtered.scoreEntry }, 
        { id: 'sniper', label: '狙击', value: filtered.scoreSniper }, 
        { id: 'clutch', label: '残局', value: filtered.scoreClutch }, 
        { id: 'opening', label: '开局', value: filtered.scoreOpening, isPct: false }, 
        { id: 'trade', label: '补枪', value: filtered.scoreTrade }, 
        { id: 'utility', label: '道具', value: filtered.scoreUtility }, 
    ];

    const handleDownloadData = () => {
        const formatWpa = (wpa: number) => wpa ? Number(wpa.toFixed(2)) : 0;

        const filteredStatsCopy = { ...filtered } as any;
        filteredStatsCopy.wpa = formatWpa(filtered.wpaAvg);
        delete filteredStatsCopy.wpaAvg;

        const dataToExport = {
            exportDate: new Date().toISOString(),
            player: {
                id: profile.id,
                name: profile.name
            },
            overallStats: overall,
            filteredStats: filteredStatsCopy,
            matches: history.map(h => {
                const wpaVal = h.stats.wpa || 0;
                return {
                    matchId: h.match.id,
                    date: h.match.date,
                    map: h.match.mapId,
                    score: `${h.match.score.us}:${h.match.score.them}`,
                    result: h.match.result,
                    rating: h.stats.rating,
                    wpa: formatWpa(wpaVal)
                };
            })
        };

        const json = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const filename = `player_stats_${profile.name}_${new Date().toISOString().split('T')[0]}.json`;
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20 font-sans">
            
            <PlayerDetailHeader 
                onBack={onBack}
                onDownloadData={handleDownloadData}
                sideFilter={sideFilter}
                onSetFilter={setSideFilter}
            />

            <PlayerHeroCard 
                profile={profile}
                stats={overall}
                role={calculatedRole}
            />

            <PlayerStatsGrid 
                filtered={filtered}
            />

            <PlayerAbilitySection 
                abilities={abilities}
                selectedAbility={selectedAbility}
                onSelectAbility={setSelectedAbility}
                detailData={filtered.details}
            />

            <PlayerMatchHistory 
                history={history}
                onMatchClick={onMatchClick}
            />
        </div>
    );
};
