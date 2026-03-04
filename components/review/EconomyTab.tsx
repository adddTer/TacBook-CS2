import React from 'react';
import { Match, Side } from '../../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getTeamNames } from '../../utils/matchHelpers';

interface EconomyTabProps {
    match: Match;
}

// Helper: Calculate Side for Round (Supports OT)
const getRoundSide = (round: number, initialSide: Side): Side => {
    const oppositeSide = initialSide === 'T' ? 'CT' : 'T';
    
    // Regular Time (MR12)
    if (round <= 24) {
        return round <= 12 ? initialSide : oppositeSide;
    }
    
    // Overtime (MR3, 6 rounds per OT)
    const otRound = round - 24;
    const otNumber = Math.ceil(otRound / 6); // 1, 2, 3...
    const otSubRound = (otRound - 1) % 6; // 0..5
    
    // Determine the starting side for this OT block
    const otStartSide = (otNumber % 2 !== 0) ? oppositeSide : initialSide;
    
    // Determine side for specific round within OT (Swap after 3 rounds)
    if (otSubRound < 3) {
        return otStartSide;
    } else {
        return otStartSide === 'T' ? 'CT' : 'T';
    }
};

export const EconomyTab: React.FC<EconomyTabProps> = ({ match }) => {
    const { teamA, teamB } = getTeamNames(match);
    
    // Prepare data for the chart
    const data: any[] = [];
    const initialSide = match.startingSide || 'CT'; // Fallback if missing

    match.rounds?.forEach((round, index) => {
        const roundNum = index + 1;
        const equipUs = (round as any).equip_value_us || 0;
        const equipThem = (round as any).equip_value_them || 0;

        // Determine Winner Team ('us' or 'them')
        let winnerTeam: 'us' | 'them' | null = null;
        if (round.winnerSide) {
            const usSide = getRoundSide(roundNum, initialSide);
            winnerTeam = round.winnerSide === usSide ? 'us' : 'them';
        }

        data.push({
            round: roundNum,
            [teamA]: equipUs,
            [teamB]: equipThem,
            winner: winnerTeam,
            amt: Math.max(equipUs, equipThem) // For domain calculation
        });
    });

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const usVal = payload.find((p: any) => p.name === teamA)?.value || 0;
            const themVal = payload.find((p: any) => p.name === teamB)?.value || 0;
            const winner = payload[0].payload.winner;
            
            return (
                <div className="bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 p-3 rounded-lg shadow-xl text-xs">
                    <p className="font-bold text-neutral-700 dark:text-neutral-200 mb-2">第 {label} 回合</p>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-neutral-600 dark:text-neutral-400">{teamA}:</span>
                            <span className="font-mono font-medium text-neutral-900 dark:text-white">${usVal.toLocaleString()}</span>
                            {winner === 'us' && <span className="text-yellow-500 text-[10px] ml-1">👑</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span className="text-neutral-600 dark:text-neutral-400">{teamB}:</span>
                            <span className="font-mono font-medium text-neutral-900 dark:text-white">${themVal.toLocaleString()}</span>
                            {winner === 'them' && <span className="text-yellow-500 text-[10px] ml-1">👑</span>}
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">经济走势</h3>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded border border-yellow-500/30">
                            BETA
                        </span>
                    </div>
                    <div className="flex gap-4 text-xs text-neutral-500">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-blue-500/20 border border-blue-500 rounded"></div>
                            <span>{teamA}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-red-500/20 border border-red-500 rounded"></div>
                            <span>{teamB}</span>
                        </div>
                    </div>
                </div>
                
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                        >
                            <defs>
                                <linearGradient id="colorUs" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorThem" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} vertical={false} />
                            <XAxis 
                                dataKey="round" 
                                stroke="#888" 
                                tick={{ fontSize: 10 }}
                                tickLine={false}
                                axisLine={false}
                                interval={0} // Show all ticks if possible, or let Recharts handle it
                                minTickGap={15}
                            />
                            <YAxis 
                                stroke="#888" 
                                tick={{ fontSize: 10 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            
                            {/* Threshold Lines */}
                            <ReferenceLine 
                                y={22000} 
                                stroke="#10b981" 
                                strokeDasharray="3 3" 
                                opacity={0.4}
                                label={{ value: "全起线 (~22k)", position: 'insideRight', fill: '#10b981', fontSize: 10 }} 
                            />
                            <ReferenceLine 
                                y={10000} 
                                stroke="#f59e0b" 
                                strokeDasharray="3 3" 
                                opacity={0.4}
                                label={{ value: "半起线 (~10k)", position: 'insideRight', fill: '#f59e0b', fontSize: 10 }} 
                            />

                            <Area 
                                type="monotone" 
                                dataKey={teamA} 
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorUs)" 
                                name={teamA}
                                animationDuration={1000}
                                dot={{ r: 3, strokeWidth: 1, fill: '#3b82f6', stroke: '#fff' }}
                                activeDot={{ r: 5, strokeWidth: 0 }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey={teamB} 
                                stroke="#ef4444" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorThem)" 
                                name={teamB}
                                animationDuration={1000}
                                dot={{ r: 3, strokeWidth: 1, fill: '#ef4444', stroke: '#fff' }}
                                activeDot={{ r: 5, strokeWidth: 0 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
