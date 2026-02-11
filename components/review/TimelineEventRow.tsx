
import React from 'react';
import { MatchTimelineEvent } from '../../types';
import { formatTime, getWeaponName, Icons } from './TimelineHelpers';

interface TimelineEventRowProps {
    event: MatchTimelineEvent;
    timeMode: 'elapsed' | 'countdown';
    plantTime?: number;
    bombEndTime?: number;
    showWinProb: boolean;
}

export const TimelineEventRow: React.FC<TimelineEventRowProps> = ({ event, timeMode, plantTime, bombEndTime, showWinProb }) => {
    const timeStr = formatTime(event.seconds, timeMode, plantTime);
    
    const isPostPlant = plantTime !== undefined && event.seconds >= plantTime;
    const isBombActive = isPostPlant && (bombEndTime === undefined || event.seconds < bombEndTime);

    let content: React.ReactNode = <span className="text-neutral-500">Unknown Event</span>;
    let iconBg = "bg-neutral-100 dark:bg-neutral-800";
    let iconColor = "text-neutral-500";
    let iconSize = "w-7 h-7"; // Default larger size for readability
    let icon = <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full"></div>;
    
    // Player Colors Helper
    const getPColor = (side?: string) => side === 'CT' ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400';

    if (event.type === 'kill') {
        iconBg = "bg-neutral-800 dark:bg-neutral-700 shadow-sm";
        iconColor = "text-white";
        icon = <Icons.Kill />;
        
        content = (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1">
                <span className={`font-bold text-sm ${getPColor(event.subject?.side)}`}>
                    {event.subject?.name}
                </span>
                
                {/* Weapon Badge */}
                <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                    <span className="text-[10px] font-bold font-mono uppercase tracking-tight">
                        {getWeaponName(event.weapon)}
                    </span>
                    {/* Add damage number if available (from parser) */}
                    {event.damage && (
                         <span className="text-[9px] text-red-500 font-mono pl-1 border-l border-neutral-300 dark:border-neutral-600">
                             -{event.damage}
                         </span>
                    )}
                </div>

                {/* Kill Modifiers */}
                <div className="flex gap-1">
                    {event.isHeadshot && <span title="爆头" className="text-red-500 bg-red-50 dark:bg-red-900/30 p-0.5 rounded"><Icons.Headshot /></span>}
                    {event.isWallbang && <span title="穿墙" className="text-neutral-500 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded"><Icons.Wallbang /></span>}
                    {event.isBlind && <span title="被致盲" className="text-neutral-500 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded"><Icons.Blind /></span>}
                    {event.isSmoke && <span title="混烟" className="text-neutral-500 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded"><Icons.Smoke /></span>}
                </div>
                
                <svg className="w-3 h-3 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                
                <span className={`font-bold text-sm ${getPColor(event.target?.side)}`}>
                    {event.target?.name}
                </span>
            </div>
        );
    } else if (event.type === 'plant') {
        iconBg = "bg-red-500 text-white shadow-md shadow-red-500/20";
        icon = <Icons.Bomb />;
        content = (
            <div className="flex items-center gap-2 py-1.5">
                <span className="font-bold text-red-600 dark:text-red-400 text-xs uppercase tracking-wide">C4 已安放</span>
                <span className="w-1 h-1 rounded-full bg-neutral-300"></span>
                <span className={`text-xs font-bold ${getPColor(event.subject?.side)}`}>{event.subject?.name}</span>
            </div>
        );
    } else if (event.type === 'defuse') {
        iconBg = "bg-green-500 text-white shadow-md shadow-green-500/20";
        icon = <Icons.Defuse />;
         content = (
            <div className="flex items-center gap-2 py-1.5">
                <span className="font-bold text-green-600 dark:text-green-400 text-xs uppercase tracking-wide">C4 已拆除</span>
                <span className="w-1 h-1 rounded-full bg-neutral-300"></span>
                <span className={`text-xs font-bold ${getPColor(event.subject?.side)}`}>{event.subject?.name}</span>
            </div>
        );
    } else if (event.type === 'explode') {
        iconBg = "bg-amber-500 text-white shadow-md shadow-amber-500/20";
        icon = <Icons.Explode />;
        content = <div className="py-1.5"><span className="font-bold text-amber-600 dark:text-amber-400 text-xs uppercase tracking-wide">C4 爆炸</span></div>;
    } else if (event.type === 'assist' || event.type === 'flash_assist') {
        iconBg = "bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700";
        iconSize = "w-6 h-6"; // Slightly smaller
        icon = <Icons.Assist />;
        const isFlash = event.type === 'flash_assist';
        content = (
             <div className="flex items-center gap-2 opacity-80 text-xs py-1">
                <span className="text-neutral-500 font-bold uppercase text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                    {isFlash ? '闪光助攻' : '助攻'}
                </span>
                <span className={`font-medium ${getPColor(event.subject?.side)}`}>
                    {event.subject?.name}
                </span>
                {event.damage && !isFlash && (
                    <span className="text-[10px] text-neutral-400 font-mono">
                        ({event.damage} dmg)
                    </span>
                )}
             </div>
        );
    } else if (event.type === 'damage') {
        iconBg = "bg-neutral-200 dark:bg-neutral-800 ring-2 ring-white dark:ring-neutral-900";
        iconSize = "w-3 h-3"; // Tiny dot
        icon = null;
        content = (
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors pt-0.5">
                <span className={getPColor(event.subject?.side)}>{event.subject?.name}</span>
                <span className="font-mono text-red-400">-{event.damage}</span>
                <span className="opacity-50">to</span>
                <span className={getPColor(event.target?.side)}>{event.target?.name}</span>
                {event.weapon && <span className="opacity-50 text-[9px]">({getWeaponName(event.weapon)})</span>}
            </div>
        );
    } else if (event.type === 'round_end') {
        return (
            <div className="flex gap-4 relative group items-center my-6 opacity-60 hover:opacity-100 transition-opacity">
                 <div className="w-12 text-right shrink-0">
                     <span className={`font-mono text-xs font-bold ${isBombActive ? 'text-red-500' : 'text-neutral-300 dark:text-neutral-600'}`}>{timeStr}</span>
                 </div>
                 
                 {/* Dashed Line Separator */}
                 <div className="flex-1 flex items-center">
                     <div className="h-px bg-neutral-200 dark:bg-neutral-800 w-full dashed border-b border-dashed border-neutral-300 dark:border-neutral-700"></div>
                     <span className="px-2 text-[10px] font-black text-neutral-300 dark:text-neutral-600 uppercase tracking-widest whitespace-nowrap">
                         ROUND END
                     </span>
                     <div className="h-px bg-neutral-200 dark:bg-neutral-800 w-full dashed border-b border-dashed border-neutral-300 dark:border-neutral-700"></div>
                 </div>
            </div>
        );
    }

    // Default layout for most events
    return (
        <div className="flex gap-4 relative group min-h-[32px]">
            {/* Time Column */}
            <div className="w-12 text-right shrink-0 flex flex-col items-end pt-1.5">
                 <span className={`font-mono text-xs font-bold transition-colors ${
                     isBombActive ? 'text-red-500' :
                     event.type === 'damage' ? 'text-neutral-300 dark:text-neutral-700' : 'text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300'
                 }`}>
                     {timeStr}
                 </span>
            </div>

            {/* Icon Node Column */}
            <div className="relative flex flex-col items-center">
                 <div className={`${iconSize} rounded-full flex items-center justify-center shrink-0 z-10 ${iconBg} ${iconColor} transition-transform group-hover:scale-110`}>
                     {icon}
                 </div>
            </div>

            {/* Details Content Column */}
            <div className="flex-1 pb-4 pt-0.5">
                {content}
                
                {/* Win Probability Bar */}
                {showWinProb && event.winProb !== undefined && (
                    <div className="mt-2 mb-1 flex items-center gap-2 max-w-[200px]">
                        <span className="text-[9px] font-bold text-blue-500 w-8 text-right">CT {(100 - event.winProb * 100).toFixed(0)}%</span>
                        <div className="h-1.5 flex-1 bg-blue-200 dark:bg-blue-900/40 rounded-full overflow-hidden flex">
                            {/* T Win Prob Bar (Yellow) */}
                            <div 
                                className="h-full bg-yellow-400 dark:bg-yellow-600 transition-all duration-500" 
                                style={{ width: `${event.winProb * 100}%`, marginLeft: 'auto' }} 
                            ></div>
                        </div>
                        <span className="text-[9px] font-bold text-yellow-600 dark:text-yellow-500 w-8">T {(event.winProb * 100).toFixed(0)}%</span>
                    </div>
                )}
            </div>
        </div>
    );
};
