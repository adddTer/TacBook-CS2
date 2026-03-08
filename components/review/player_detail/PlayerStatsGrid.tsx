
import React from 'react';
import { GLOBAL_STATS, getStatEvaluation } from '../../../utils/analytics/globalThresholds';

interface PlayerStatsGridProps {
    filtered: {
        adr: number;
        kpr: number;
        kast: number;
        wpaAvg: number;
        multiKillRate: number;
        dpr: number;
    };
}

const StatBar = ({ statKey, value }: { statKey: string, value: number }) => {
    const statDef = GLOBAL_STATS[statKey];
    if (!statDef) return null;

    const { label, thresholds: threshold, isPercentage, reverse } = statDef;
    const evalData = getStatEvaluation(statKey, value);
    
    let pct = 0;
    if (!reverse) {
        if (value < threshold[2]) {
            const min = threshold[2] - (threshold[1] - threshold[2]);
            pct = Math.max(0, ((value - min) / (threshold[2] - min)) * 25);
        } else if (value < threshold[1]) {
            pct = 25 + ((value - threshold[2]) / (threshold[1] - threshold[2])) * 25;
        } else if (value < threshold[0]) {
            pct = 50 + ((value - threshold[1]) / (threshold[0] - threshold[1])) * 25;
        } else {
            const max = threshold[0] + (threshold[0] - threshold[1]);
            pct = 75 + Math.min(1, (value - threshold[0]) / (max - threshold[0])) * 25;
        }
    } else {
        if (value > threshold[2]) {
            const max = threshold[2] + (threshold[2] - threshold[1]);
            pct = Math.max(0, ((max - value) / (max - threshold[2])) * 25);
        } else if (value > threshold[1]) {
            pct = 25 + ((threshold[2] - value) / (threshold[2] - threshold[1])) * 25;
        } else if (value > threshold[0]) {
            pct = 50 + ((threshold[1] - value) / (threshold[1] - threshold[0])) * 25;
        } else {
            const min = threshold[0] - (threshold[1] - threshold[0]);
            pct = 75 + Math.min(1, (threshold[0] - value) / (threshold[0] - min)) * 25;
        }
    }
    pct = Math.max(2, Math.min(98, pct));

    return (
        <div className="flex flex-col items-center justify-center py-4 w-full">
            <div className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight">
                {value > 0 && isPercentage && label === 'WPA' ? '+' : ''}{isPercentage ? `${value.toFixed(1)}%` : value.toFixed(reverse ? 2 : (label === 'KPR' ? 2 : 1))}
            </div>
            <div className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mt-1 mb-4">
                {label}
            </div>
            
            <div className="w-[85%] max-w-[200px] relative">
                {/* Base line */}
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-[2px] bg-neutral-200 dark:bg-neutral-700/50 rounded-full"></div>
                </div>
                {/* Ticks (5 ticks for 4 segments) */}
                <div className="absolute inset-0 flex justify-between px-0 items-center">
                    <div className="w-[2px] h-[4px] bg-neutral-300 dark:bg-neutral-600 rounded-full"></div>
                    <div className="w-[2px] h-[4px] bg-neutral-300 dark:bg-neutral-600 rounded-full"></div>
                    <div className="w-[2px] h-[4px] bg-neutral-300 dark:bg-neutral-600 rounded-full"></div>
                    <div className="w-[2px] h-[4px] bg-neutral-300 dark:bg-neutral-600 rounded-full"></div>
                    <div className="w-[2px] h-[4px] bg-neutral-300 dark:bg-neutral-600 rounded-full"></div>
                </div>
                
                {/* Active line */}
                <div className="relative flex items-center w-full h-[2px]">
                    <div className={`h-full rounded-full ${evalData.bg} shadow-[0_0_8px_currentColor] ${evalData.color}`} style={{ width: `${pct}%` }}></div>
                    <div className={`w-[3px] h-[8px] ${evalData.bg} -ml-[1.5px] rounded-full shadow-[0_0_8px_currentColor] ${evalData.color}`}></div>
                </div>
                
                {/* Evaluation Text */}
                <div className="relative h-4 mt-2 w-full">
                    <div className={`absolute text-[10px] font-bold ${evalData.color} transition-all whitespace-nowrap -translate-x-1/2`} style={{ left: `${pct}%` }}>
                        {evalData.text}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PlayerStatsGrid: React.FC<PlayerStatsGridProps> = ({ filtered }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 md:gap-x-8 gap-y-8 md:gap-y-10 bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <StatBar statKey="WPA" value={filtered.wpaAvg} />
            <StatBar statKey="DPR" value={filtered.dpr} />
            <StatBar statKey="KAST" value={filtered.kast} />
            <StatBar statKey="MULTI_KILL" value={filtered.multiKillRate} />
            <StatBar statKey="ADR" value={filtered.adr} />
            <StatBar statKey="KPR" value={filtered.kpr} />
        </div>
    );
};
