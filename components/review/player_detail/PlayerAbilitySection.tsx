
import React, { useRef, useEffect } from 'react';
import { AbilityType } from './config';
import { RadarChart, AbilityRow, DetailCard } from './PlayerDetailSubComponents';

interface PlayerAbilitySectionProps {
    abilities: { id: AbilityType, label: string, value: number, isPct?: boolean }[];
    selectedAbility: AbilityType;
    onSelectAbility: (id: AbilityType) => void;
    detailData: any; 
}

export const PlayerAbilitySection: React.FC<PlayerAbilitySectionProps> = ({
    abilities,
    selectedAbility,
    onSelectAbility,
    detailData
}) => {
    const selectedScore = abilities.find(a => a.id === selectedAbility)?.value || 0;
    
    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-1 shadow-sm">
            <div className="bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 rounded-[20px] p-4 md:p-6">
                
                <div className="flex justify-between items-center mb-6 px-1">
                    <h3 className="text-sm font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        综合能力评估
                    </h3>
                </div>
                
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                    {/* 1. Radar Chart Area */}
                    <div className="flex justify-center items-center lg:w-1/3 min-h-[260px] relative">
                         {/* Optional background ring for decoration */}
                         <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-900/10 rounded-full blur-3xl opacity-50"></div>
                         <div className="relative z-10 w-full max-w-[280px]">
                            <RadarChart data={abilities} size={300} />
                         </div>
                    </div>

                    {/* 2. Selection Area (Responsive) */}
                    <div className="lg:w-1/3 flex flex-col gap-4">
                        {/* List: Vertical List for both Mobile and Desktop (per request) */}
                        <div className="flex flex-col gap-2 h-full justify-center">
                            {abilities.map((ability) => (
                                <AbilityRow 
                                    key={ability.id} 
                                    label={ability.label} 
                                    value={ability.value} 
                                    isPercentage={ability.isPct}
                                    isSelected={selectedAbility === ability.id}
                                    onClick={() => onSelectAbility(ability.id)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* 3. Detailed Card Area */}
                    <div className="lg:w-1/3 w-full">
                        <DetailCard type={selectedAbility} data={detailData} score={selectedScore} />
                    </div>
                </div>
            </div>
        </div>
    );
};
