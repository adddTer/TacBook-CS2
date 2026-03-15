
import React, { useMemo } from 'react';
import { RoleDefinition } from '../../../utils/analytics/roleDefinitions';
import { GLOBAL_STATS, getStatEvaluation } from '../../../utils/analytics/globalThresholds';

interface PlayerHeroCardProps {
    profile: {
        id: string;
        name: string;
        role: string;
        matches: number;
        steamid?: string;
    };
    stats: {
        rating: number;
        ctRating: number;
        tRating: number;
    };
    role?: RoleDefinition;
}

const RatingArc = ({ rating, ctRating, tRating }: { rating: number, ctRating: number, tRating: number }) => {
    const thresholds = GLOBAL_STATS.RATING.thresholds;
    let pct = 0;
    if (rating < thresholds[2]) {
        const min = thresholds[2] - 0.2;
        pct = Math.max(0, ((rating - min) / (thresholds[2] - min)) * 25);
    } else if (rating < thresholds[1]) {
        pct = 25 + ((rating - thresholds[2]) / (thresholds[1] - thresholds[2])) * 25;
    } else if (rating < thresholds[0]) {
        pct = 50 + ((rating - thresholds[1]) / (thresholds[0] - thresholds[1])) * 25;
    } else {
        const max = thresholds[0] + 0.2;
        pct = 75 + Math.min(1, (rating - thresholds[0]) / (max - thresholds[0])) * 25;
    }
    pct = Math.max(2, Math.min(100, pct));

    const evalData = getStatEvaluation('RATING', rating);

    const radius = 80;
    const strokeWidth = 8;
    const arcLength = Math.PI * radius;
    const strokeDasharray = arcLength;
    const strokeDashoffset = arcLength - (pct / 100) * arcLength;

    return (
        <div className="flex items-center justify-center w-full max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-3 md:gap-5 w-full">
                {/* T Rating */}
                <div className="flex-1 flex flex-col items-end justify-center pr-2">
                    <div className="flex flex-col items-end relative">
                        <div className="text-2xl md:text-3xl font-black text-yellow-600 dark:text-yellow-500 leading-none relative">
                            {tRating.toFixed(2)}
                            <div className="absolute top-1/2 left-[110%] w-[20px] md:w-[35px] h-[2px] bg-gradient-to-r from-yellow-500 to-transparent -translate-y-1/2 rounded-full"></div>
                        </div>
                        <div className="text-[9px] md:text-[10px] font-bold text-yellow-600/70 dark:text-yellow-500/70 uppercase tracking-widest mt-1">T RATING</div>
                    </div>
                </div>

                {/* Center Arc */}
                <div className="relative w-[40%] max-w-[180px] min-w-[130px] aspect-[18/11] flex flex-col items-center justify-end shrink-0 mt-4">
                    {/* Evaluation Text Floating Above Arc */}
                    <div className="absolute -top-2 left-0 right-0 flex justify-center">
                        <span className={`text-[11px] md:text-[12px] font-bold ${evalData.color}`}>{evalData.text}</span>
                    </div>

                    <svg className="absolute top-0 left-0 w-full h-full overflow-visible" viewBox="0 0 180 100" preserveAspectRatio="xMidYMax meet">
                        <defs>
                            <linearGradient id="purple-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#a855f7" />
                                <stop offset="100%" stopColor="#d946ef" />
                            </linearGradient>
                        </defs>
                        {/* Background Arc */}
                        <path 
                            d="M 10 90 A 80 80 0 0 1 170 90" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth={strokeWidth} 
                            strokeLinecap="round"
                            className="text-neutral-200 dark:text-neutral-800"
                        />
                        {/* Foreground Arc */}
                        <path 
                            d="M 10 90 A 80 80 0 0 1 170 90" 
                            fill="none" 
                            stroke={evalData.hex} 
                            strokeWidth={strokeWidth} 
                            strokeLinecap="round"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    
                    <div className="absolute bottom-[8%] left-0 right-0 flex flex-col items-center justify-center">
                        <span className="text-3xl md:text-4xl lg:text-[40px] font-black text-neutral-900 dark:text-white tabular-nums leading-none tracking-tighter">{rating.toFixed(2)}</span>
                        <span className="text-[8px] md:text-[9px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mt-1">RATING 4.0</span>
                    </div>
                </div>

                {/* CT Rating */}
                <div className="flex-1 flex flex-col items-start justify-center pl-2">
                    <div className="flex flex-col items-start relative">
                        <div className="text-2xl md:text-3xl font-black text-blue-600 dark:text-blue-400 leading-none relative">
                            {ctRating.toFixed(2)}
                            <div className="absolute top-1/2 right-[110%] w-[20px] md:w-[35px] h-[2px] bg-gradient-to-l from-blue-500 to-transparent -translate-y-1/2 rounded-full"></div>
                        </div>
                        <div className="text-[9px] md:text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest mt-1">CT RATING</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PlayerHeroCard: React.FC<PlayerHeroCardProps> = ({ profile, stats, role }) => {
    return (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-800 relative overflow-hidden mb-6 flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Background Deco */}
            <div className="absolute top-0 right-0 p-10 opacity-5 dark:opacity-10 pointer-events-none">
                 <span className="text-9xl font-black text-neutral-900 dark:text-white">{profile.name[0]}</span>
            </div>

            {/* Profile Info */}
            <div className="relative z-10 flex items-center gap-5 md:w-1/3">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-4xl font-black text-white shadow-xl shadow-blue-500/20 shrink-0">
                    {profile.name[0]}
                </div>
                <div>
                    <h1 className="text-3xl font-black text-neutral-900 dark:text-white leading-none tracking-tight">{profile.name}</h1>
                    
                    {profile.steamid && profile.steamid !== profile.name && (
                        <div className="text-xs text-neutral-400 font-mono mt-1 mb-1">
                            {profile.steamid}
                        </div>
                    )}

                    {profile.id === 'addd' && (
                        <div className="mt-2 mb-2">
                            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                指挥
                            </div>
                        </div>
                    )}

                    {role ? (
                        <div className="mt-2 mb-2">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{role.name}</span>
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium max-w-[280px] leading-relaxed">
                                {role.description}
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium mt-1 mb-2">{profile.role}</p>
                    )}

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 px-1.5 py-0.5 rounded">
                            {profile.matches} MAPS
                        </span>
                    </div>
                </div>
            </div>

            {/* Rating Arc */}
            <div className="relative z-10 w-full md:w-2/3 flex-1 flex justify-end">
                <RatingArc rating={stats.rating} ctRating={stats.ctRating} tRating={stats.tRating} />
            </div>
        </div>
    );
};
