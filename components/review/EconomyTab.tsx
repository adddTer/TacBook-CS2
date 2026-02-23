import React from 'react';
import { Match, Side } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getTeamNames } from '../../utils/matchHelpers';

interface EconomyTabProps {
    match: Match;
}

// Helper: Calculate Side for Round (Supports OT) - Duplicated from demoParser to avoid circular deps or complex exports
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
    // OT1 (Odd): Starts with Opposite Side (Stay on side from end of Reg)
    // OT2 (Even): Starts with Initial Side
    const otStartSide = (otNumber % 2 !== 0) ? oppositeSide : initialSide;
    
    // Determine side for specific round within OT (Swap after 3 rounds)
    if (otSubRound < 3) {
        return otStartSide;
    } else {
        return otStartSide === 'T' ? 'CT' : 'T';
    }
};

const CustomDot = (props: any) => {
    const { cx, cy, payload, dataKey, teamA, teamB } = props;
    if (!cx || !cy) return null;

    // Determine if this dot belongs to the winner of the round
    const isUs = dataKey === teamA;
    const isThem = dataKey === teamB;
    const winner = payload.winner; // 'us' or 'them'
    
    const isWinner = (isUs && winner === 'us') || (isThem && winner === 'them');

    if (isWinner) {
        return (
            <g transform={`translate(${cx - 8}, ${cy - 8})`}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill={props.stroke} stroke="none">
                    <path d="M20.2 6.5l-1.1-3.3c-.3-.9-1.2-1.5-2.2-1.5H7.1c-1 0-1.9.6-2.2 1.5L3.8 6.5c-.4 1.2.2 2.5 1.4 2.9l.5.2c.4 2.3 2.1 4.2 4.3 4.9v2.5H7v2h10v-2h-3v-2.5c2.2-.7 3.9-2.6 4.3-4.9l.5-.2c1.2-.4 1.8-1.7 1.4-2.9zM5.4 7.8l.8-2.3c.1-.3.4-.5.7-.5h10.2c.3 0 .6.2.7.5l.8 2.3c.1.4-.1.8-.5.9l-.5.2C16.6 9 16 9.5 16 10.2V11c0 2.2-1.8 4-4 4s-4-1.8-4-4v-.8c0-.7-.6-1.2-1.6-1.3l-.5-.2c-.4-.1-.6-.5-.5-.9z"/>
                </svg>
            </g>
        );
    }

    return (
        <circle cx={cx} cy={cy} r={3} stroke={props.stroke} strokeWidth={2} fill="white" />
    );
};

export const EconomyTab: React.FC<EconomyTabProps> = ({ match }) => {
    const { teamA, teamB } = getTeamNames(match);
    
    // Prepare data for the chart
    const rawRoundsData: any[] = [];
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

        rawRoundsData.push({
            round: roundNum,
            [teamA]: equipUs,
            [teamB]: equipThem,
            winner: winnerTeam
        });
    });

    // Process data to insert breaks (nulls)
    const processedData: any[] = [];
    rawRoundsData.forEach(d => {
        processedData.push(d);
        
        const r = d.round;
        let shouldBreak = false;
        
        // Break logic: 12, 24, 30, 36...
        if (r === 12) shouldBreak = true;
        else if (r === 24) shouldBreak = true;
        else if (r > 24 && (r - 24) % 6 === 0) shouldBreak = true;
        
        if (shouldBreak) {
            // Insert a null point to break the line
            processedData.push({ 
                round: r + 0.5, // Dummy X value
                [teamA]: null, 
                [teamB]: null,
                isBreak: true
            });
        }
    });

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-6">经济走势</h3>
                
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={processedData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} vertical={false} />
                            <XAxis 
                                dataKey="round" 
                                stroke="#888" 
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                type="number"
                                domain={['dataMin', 'dataMax']}
                                allowDecimals={false}
                                tickCount={match.rounds?.length ? Math.min(match.rounds.length, 15) : 10}
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
                                labelFormatter={(label) => Number.isInteger(label) ? `Round ${label}` : ''}
                                filterNull={true} // Hide tooltip for break points
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
                                dot={(props) => <CustomDot {...props} teamA={teamA} teamB={teamB} />}
                                activeDot={{ r: 6 }}
                                name={teamA}
                                connectNulls={false}
                            />
                            <Line 
                                type="monotone" 
                                dataKey={teamB} 
                                stroke="#ef4444" 
                                strokeWidth={3}
                                dot={(props) => <CustomDot {...props} teamA={teamA} teamB={teamB} />}
                                activeDot={{ r: 6 }}
                                name={teamB}
                                connectNulls={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
