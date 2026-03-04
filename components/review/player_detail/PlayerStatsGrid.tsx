
import React from 'react';
import { StatCard } from './PlayerDetailSubComponents';
import { getValueStyleClass } from '../../../utils/styleConstants';

interface PlayerStatsGridProps {
    filtered: {
        adr: number;
        kdr: number;
        kast: number;
        wpaAvg: number;
        multiKillRate: number;
        dpr: number;
    };
}

export const PlayerStatsGrid: React.FC<PlayerStatsGridProps> = ({ filtered }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard label="ADR" value={filtered.adr.toFixed(1)} subLabel="场均伤害" colorClass={getValueStyleClass(filtered.adr, [95, 80, 65])} />
            <StatCard label="K/D Ratio" value={filtered.kdr.toFixed(2)} subLabel="击杀/阵亡比" colorClass={getValueStyleClass(filtered.kdr, [1.3, 1.1, 0.9])} />
            <StatCard label="KAST" value={`${filtered.kast.toFixed(1)}%`} subLabel="综合贡献率" colorClass={getValueStyleClass(filtered.kast, [78, 72, 65])} />
            <StatCard label="WPA" value={(filtered.wpaAvg > 0 ? '+' : '') + filtered.wpaAvg.toFixed(1) + '%'} subLabel="胜率贡献" colorClass={getValueStyleClass(filtered.wpaAvg, [5, 2, -2])} />
            <StatCard label="Multi-Kill" value={`${filtered.multiKillRate.toFixed(1)}%`} subLabel="多杀回合率" colorClass={getValueStyleClass(filtered.multiKillRate, [22, 17, 12])} />
            <StatCard label="DPR" value={filtered.dpr.toFixed(2)} subLabel="场均阵亡" colorClass={getValueStyleClass(filtered.dpr, [0.58, 0.66, 0.75], 'text', true)} />
        </div>
    );
};
