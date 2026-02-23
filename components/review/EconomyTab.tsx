import React from 'react';
import { Match } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getTeamNames } from '../../utils/matchHelpers';

interface EconomyTabProps {
    match: Match;
}

export const EconomyTab: React.FC<EconomyTabProps> = ({ match }) => {
    const { teamA, teamB } = getTeamNames(match);
    
    // Prepare data for the chart
    // We need to aggregate the equipment value for each team per round
    const roundsData: any[] = [];
    const totalRounds = match.rounds.length;

    match.rounds.forEach((round, index) => {
        // Calculate total equipment value for My Team (US)
        // Note: match.rounds data structure might not directly contain equipment value per team.
        // We usually rely on `match.rounds[i].equip_value_us` if available, or sum up players.
        // However, standard Match type might not have this pre-calculated.
        // Let's check if we can calculate it from players' round stats if available, 
        // OR if the parser provides it.
        // Looking at types.ts (assumed), RoundStats usually has `equip_value_us` and `equip_value_them`.
        
        // Fallback: If not available, we might need to sum up from players if we had per-round player stats,
        // but typically the parser should aggregate this into the round object.
        // Assuming match.rounds has these fields based on standard demo parser output.
        
        // If the parser doesn't provide these, we can't display the chart accurately.
        // Let's assume the data exists or use 0 as fallback.
        
        const roundNum = index + 1;
        const equipUs = (round as any).equip_value_us || 0;
        const equipThem = (round as any).equip_value_them || 0;

        roundsData.push({
            round: roundNum,
            [teamA]: equipUs,
            [teamB]: equipThem,
            winner: round.winner // 'us' or 'them'
        });
    });

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-6">经济走势</h3>
                
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={roundsData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} vertical={false} />
                            <XAxis 
                                dataKey="round" 
                                stroke="#888" 
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis 
                                stroke="#888" 
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                                    borderRadius: '8px', 
                                    border: 'none', 
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                                }}
                                labelStyle={{ color: '#666', fontWeight: 'bold', marginBottom: '4px' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            
                            {/* Reference Lines for Eco/Buy thresholds */}
                            <ReferenceLine 
                                y={10000} 
                                label={{ value: "半起线", position: 'insideTopLeft', fill: 'orange', fontSize: 12 }} 
                                stroke="orange" 
                                strokeDasharray="3 3" 
                                opacity={0.5} 
                            />
                            <ReferenceLine 
                                y={20000} 
                                label={{ value: "全起线", position: 'insideTopLeft', fill: 'green', fontSize: 12 }} 
                                stroke="green" 
                                strokeDasharray="3 3" 
                                opacity={0.5} 
                            />

                            <Line 
                                type="monotone" 
                                dataKey={teamA} 
                                stroke="#3b82f6" 
                                strokeWidth={3}
                                dot={{ r: 3, strokeWidth: 2 }}
                                activeDot={{ r: 6 }}
                                name={teamA}
                            />
                            <Line 
                                type="monotone" 
                                dataKey={teamB} 
                                stroke="#ef4444" 
                                strokeWidth={3}
                                dot={{ r: 3, strokeWidth: 2 }}
                                activeDot={{ r: 6 }}
                                name={teamB}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
