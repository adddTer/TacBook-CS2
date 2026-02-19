
import React from 'react';
import { getRatingColorClass } from '../ReviewShared';
import { RoleDefinition } from '../../../utils/analytics/roleDefinitions';

interface PlayerHeroCardProps {
    profile: {
        id: string;
        role: string;
        matches: number;
    };
    stats: {
        rating: number;
        ctRating: number;
        tRating: number;
    };
    role?: RoleDefinition;
}

export const PlayerHeroCard: React.FC<PlayerHeroCardProps> = ({ profile, stats, role }) => {
    return (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-1 shadow-sm border border-neutral-200 dark:border-neutral-800">
            <div className="bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-neutral-800 dark:via-neutral-900 dark:to-black rounded-[20px] p-6 relative overflow-hidden">
                {/* Background Deco */}
                <div className="absolute top-0 right-0 p-10 opacity-5 dark:opacity-10 pointer-events-none">
                     <span className="text-9xl font-black">{profile.id[0]}</span>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    {/* Profile Info */}
                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-4xl font-black text-white shadow-xl shadow-blue-500/20 shrink-0">
                            {profile.id[0]}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-neutral-900 dark:text-white leading-none tracking-tight">{profile.id}</h1>
                            
                            {role ? (
                                <div className="mt-2 mb-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{role.name}</span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                                            {role.category}
                                        </span>
                                    </div>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium max-w-[280px] leading-relaxed">
                                        {role.description}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-neutral-500 font-medium mt-1 mb-2">{profile.role}</p>
                            )}

                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-neutral-400 border border-neutral-200 dark:border-neutral-700 px-1.5 py-0.5 rounded">
                                    {profile.matches} MAPS
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Big Rating */}
                    <div className="flex items-center gap-6 md:gap-8 bg-white/50 dark:bg-black/20 p-4 rounded-2xl backdrop-blur-sm border border-neutral-100 dark:border-neutral-800">
                        <div className="text-center">
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Rating 4.0</div>
                            <div className={`text-5xl font-black tracking-tighter tabular-nums ${getRatingColorClass(stats.rating)}`}>
                                {stats.rating.toFixed(2)}
                            </div>
                        </div>
                        <div className="h-10 w-px bg-neutral-300 dark:bg-neutral-700"></div>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-4 text-xs font-mono font-bold">
                                <span className="text-blue-500">CT</span>
                                <span className="text-neutral-700 dark:text-neutral-300">{stats.ctRating.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-xs font-mono font-bold">
                                <span className="text-yellow-600 dark:text-yellow-500">T</span>
                                <span className="text-neutral-700 dark:text-neutral-300">{stats.tRating.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
