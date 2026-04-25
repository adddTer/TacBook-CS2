
import React, { useState } from 'react';
import { MatchTimelineEvent } from '../../types';
import { formatTime, getWeaponName, Icons } from './TimelineHelpers';
import { resolveName } from '../../utils/demo/helpers';

interface TimelineEventRowProps {
    event: MatchTimelineEvent;
    assists?: MatchTimelineEvent[];
    timeMode: 'elapsed' | 'countdown';
    plantTime?: number;
    bombEndTime?: number;
    showWinProb: boolean;
    playerNameMap?: Record<string, string>;
    isCard?: boolean;
}

export const TimelineEventRow: React.FC<TimelineEventRowProps> = ({ event, assists = [], timeMode, plantTime, bombEndTime, showWinProb, playerNameMap = {}, isCard = false }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const timeStr = formatTime(event.seconds, timeMode, plantTime);
    
    const getName = (subject?: { steamid: string, name: string }) => {
        if (!subject) return undefined;
        if (subject.name === 'World' || subject.name === 'BOT' || subject.name === 'Round Start' || subject.name === 'Round Start (Est)' || subject.name === 'Round Start (Auto-Fix)') return subject.name;
        
        if (subject.steamid && playerNameMap[subject.steamid]) {
            return playerNameMap[subject.steamid];
        }
        
        return subject.steamid && resolveName(subject.steamid) !== subject.steamid ? resolveName(subject.steamid) : subject.name;
    };

    const isPostPlant = plantTime !== undefined && event.seconds >= plantTime;
    const isBombActive = isPostPlant && (bombEndTime === undefined || event.seconds < bombEndTime);

    const isRoundStart = event.type === 'damage' && getName(event.subject) === 'Round Start';

    if (isRoundStart) {
        return (
            <div className={`flex gap-4 relative group items-center opacity-60 hover:opacity-100 transition-opacity ${isCard ? '' : 'my-6'}`}>
                 <div className="w-12 text-right shrink-0">
                     <span className="font-mono text-xs font-bold text-neutral-300 dark:text-neutral-600">{timeStr}</span>
                 </div>
                 
                 {/* Dashed Line Separator */}
                 <div className="flex-1 flex items-center">
                     <div className="h-px bg-neutral-200 dark:bg-neutral-800 w-full dashed border-b border-dashed border-neutral-300 dark:border-neutral-700"></div>
                     <span className="px-2 text-[10px] font-black text-neutral-300 dark:text-neutral-600 uppercase tracking-widest whitespace-nowrap">
                         回合开始
                     </span>
                     <div className="h-px bg-neutral-200 dark:bg-neutral-800 w-full dashed border-b border-dashed border-neutral-300 dark:border-neutral-700"></div>
                 </div>
            </div>
        );
    }

    let content: React.ReactNode = <span className="text-neutral-500">Unknown Event</span>;
    let iconBg = "bg-neutral-100 dark:bg-neutral-800";
    let iconColor = "text-neutral-500";
    let iconSize = "w-7 h-7"; // Default larger size for readability
    let icon = <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full"></div>;
    
    // Player Colors Helper
    const getPColor = (side?: string) => side === 'CT' ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400';

    if (event.type === 'kill') {
        const isBomb = event.weapon?.toLowerCase().includes('planted_c4') || event.weapon?.toLowerCase().includes('bomb');
        const isWorld = getName(event.subject) === 'World' || getName(event.subject) === 'BOT' || isBomb;
        const isSuicide = getName(event.subject) === getName(event.target);

        iconBg = "bg-neutral-800 dark:bg-neutral-700 shadow-sm ring-1 ring-white/10";
        iconColor = "text-white";
        icon = <Icons.Kill />;
        
        let killerName = getName(event.subject);
        let killerSide = event.subject?.side;
        
        if (isBomb) {
            killerName = "C4 爆炸";
            killerSide = undefined;
        } else if (isWorld) {
            killerName = "环境";
            killerSide = undefined;
        }

        content = (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1">
                <span className={`font-bold text-sm ${killerSide ? getPColor(killerSide) : 'text-neutral-500'} ${isSuicide ? 'underline decoration-dotted decoration-neutral-400 underline-offset-4' : ''}`}>
                    {killerName}
                </span>
                
                {/* Weapon Badge */}
                {!isWorld && (
                    <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 shadow-sm">
                        <span className="text-[10px] font-bold font-mono uppercase tracking-tight">
                            {getWeaponName(event.weapon)}
                        </span>
                        {event.damage && (
                             <span className="text-[9px] text-red-500 font-mono pl-1 border-l border-neutral-300 dark:border-neutral-600">
                                 -{event.damage}
                             </span>
                        )}
                    </div>
                )}

                {/* Kill Modifiers */}
                <div className="flex gap-1">
                    {event.isHeadshot && <span title="爆头" className="text-red-500 bg-red-50 dark:bg-red-900/30 p-0.5 rounded shadow-sm"><Icons.Headshot /></span>}
                    {event.isWallbang && <span title="穿墙" className="text-neutral-500 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded shadow-sm"><Icons.Wallbang /></span>}
                    {event.isBlind && <span title="被致盲" className="text-neutral-500 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded shadow-sm"><Icons.Blind /></span>}
                    {event.isSmoke && <span title="混烟" className="text-neutral-500 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded shadow-sm"><Icons.Smoke /></span>}
                </div>
                
                <svg className="w-3 h-3 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                
                <span className={`font-bold text-sm ${getPColor(event.target?.side)}`}>
                    {getName(event.target)}
                </span>

                {/* Assists */}
                {assists.length > 0 && (
                    <div className="flex items-center gap-1 ml-2">
                        <span className="text-neutral-400 text-xs">+</span>
                        {assists.map((assist, idx) => (
                            <span key={idx} className={`text-xs font-medium ${getPColor(assist.subject?.side)} flex items-center gap-0.5`} title={assist.type === 'flash_assist' ? '闪光助攻' : '助攻'}>
                                {assist.type === 'flash_assist' && <Icons.Blind className="w-3 h-3 text-neutral-400" />}
                                {getName(assist.subject)}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        );
    } else if (event.type === 'plant') {
        iconBg = "bg-red-500 text-white shadow-md shadow-red-500/20 ring-2 ring-red-500/10";
        icon = <Icons.Bomb />;
        content = (
            <div className="flex items-center gap-2 py-1.5">
                <span className="font-bold text-red-600 dark:text-red-400 text-xs uppercase tracking-wider">C4 已安放</span>
                <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700"></span>
                <span className={`text-xs font-bold ${getPColor(event.subject?.side)}`}>{getName(event.subject)}</span>
            </div>
        );
    } else if (event.type === 'defuse') {
        iconBg = "bg-green-500 text-white shadow-md shadow-green-500/20 ring-2 ring-green-500/10";
        icon = <Icons.Defuse />;
         content = (
            <div className="flex items-center gap-2 py-1.5">
                <span className="font-bold text-green-600 dark:text-green-400 text-xs uppercase tracking-wider">C4 已拆除</span>
                <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700"></span>
                <span className={`text-xs font-bold ${getPColor(event.subject?.side)}`}>{getName(event.subject)}</span>
            </div>
        );
    } else if (event.type === 'explode') {
        iconBg = "bg-amber-500 text-white shadow-md shadow-amber-500/20 ring-2 ring-amber-500/10";
        icon = <Icons.Explode />;
        content = <div className="py-1.5"><span className="font-bold text-amber-600 dark:text-amber-400 text-xs uppercase tracking-wider">C4 爆炸</span></div>;
    } else if (event.type === 'hostage_rescued') {
        iconBg = "bg-blue-500 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-500/10";
        icon = <Icons.HostageRescued />;
        content = (
            <div className="flex items-center gap-2 py-1.5 flex-wrap">
                <span className="font-bold text-blue-600 dark:text-blue-400 text-[10px] uppercase tracking-wider bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">人质登机</span>
                <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700"></span>
                <span className={`text-xs font-bold ${getPColor(event.subject?.side)}`}>{getName(event.subject)}</span>
            </div>
        );
    } else if (event.type === 'hostage_killed') {
        iconBg = "bg-red-500 text-white shadow-md shadow-red-500/20 ring-2 ring-red-500/10";
        icon = <Icons.HostageKilled />;
        content = (
            <div className="flex items-center gap-2 py-1.5 flex-wrap">
                <span className="font-bold text-red-600 dark:text-red-400 text-[10px] uppercase tracking-wider bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">伤害人质</span>
                <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700"></span>
                <span className={`text-xs font-bold ${getPColor(event.subject?.side)}`}>{getName(event.subject)}</span>
            </div>
        );
    } else if (event.type === 'assist' || event.type === 'flash_assist') {
        iconBg = "bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-sm";
        iconSize = "w-6 h-6"; // Slightly smaller
        icon = <Icons.Assist />;
        const isFlash = event.type === 'flash_assist';
        content = (
             <div className="flex items-center gap-2 opacity-80 text-xs py-1">
                <span className="text-neutral-500 font-bold uppercase text-[9px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded tracking-tighter">
                    {isFlash ? '闪光助攻' : '助攻'}
                </span>
                <span className={`font-medium ${getPColor(event.subject?.side)}`}>
                    {getName(event.subject)}
                </span>
                {event.damage && !isFlash && (
                    <span className="text-[10px] text-neutral-400 font-mono">
                        ({event.damage} dmg)
                    </span>
                )}
             </div>
        );
    } else if (event.type === 'damage') {
        const isWorld = getName(event.subject) === 'World';
        const isBomb = event.weapon?.toLowerCase().includes('planted_c4') || event.weapon?.toLowerCase().includes('bomb');
        const isFall = event.weapon?.toLowerCase().includes('fall');

        iconBg = "bg-neutral-200 dark:bg-neutral-800 ring-2 ring-white dark:ring-neutral-900";
        iconSize = "w-3 h-3"; // Tiny dot
        icon = null;
        
        let sourceName = getName(event.subject);
        let sourceSide = event.subject?.side;
        
        if (isWorld) {
            if (isBomb) sourceName = "C4 爆炸";
            else if (isFall) sourceName = "坠落伤害";
            else sourceName = "环境伤害";
            sourceSide = undefined;
        }

        content = (
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 group-hover:text-neutral-500 dark:group-hover:text-neutral-400 transition-colors pt-0.5">
                <span className={sourceSide ? getPColor(sourceSide) : "text-neutral-500 font-medium"}>{sourceName}</span>
                <span className="font-mono text-red-400">-{event.damage}</span>
                <span className="opacity-50">to</span>
                <span className={getPColor(event.target?.side)}>{getName(event.target)}</span>
                {event.weapon && !isWorld && <span className="opacity-50 text-[9px] italic">({getWeaponName(event.weapon)})</span>}
            </div>
        );
    }
 else if (event.type === 'round_end') {
        return (
            <div className={`flex gap-4 relative group items-center opacity-60 hover:opacity-100 transition-opacity ${isCard ? '' : 'my-6'}`}>
                 <div className="w-12 text-right shrink-0">
                     <span className={`font-mono text-xs font-bold ${isBombActive ? 'text-red-500' : 'text-neutral-300 dark:text-neutral-600'}`}>{timeStr}</span>
                 </div>
                 
                 {/* Dashed Line Separator */}
                 <div className="flex-1 flex items-center">
                     <div className="h-px bg-neutral-200 dark:bg-neutral-800 w-full dashed border-b border-dashed border-neutral-300 dark:border-neutral-700"></div>
                     <span className="px-2 text-[10px] font-black text-neutral-300 dark:text-neutral-600 uppercase tracking-widest whitespace-nowrap">
                         回合结束
                     </span>
                     <div className="h-px bg-neutral-200 dark:bg-neutral-800 w-full dashed border-b border-dashed border-neutral-300 dark:border-neutral-700"></div>
                 </div>
            </div>
        );
    }

    // Default layout for most events
    return (
        <div 
            className={`flex gap-4 relative group min-h-[32px] ${event.wpaUpdates ? 'cursor-pointer' : ''}`}
            onClick={() => {
                if (event.wpaUpdates) setIsExpanded(!isExpanded);
            }}
        >
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
            <div className={`flex-1 pt-0.5 ${isCard ? '' : 'pb-4'}`}>
                <div className="transition-all duration-200 group-hover:translate-x-0.5">
                    {content}
                </div>
                
                {/* Win Probability Bar */}
                {showWinProb && event.winProb !== undefined && (
                    <div className="mt-2.5 mb-1 flex items-center gap-2 max-w-[220px] bg-neutral-100/50 dark:bg-neutral-800/30 p-1 rounded-full border border-neutral-200/50 dark:border-neutral-700/50">
                        <span className="text-[9px] font-black text-blue-500 dark:text-blue-400 w-9 text-right tabular-nums">{(100 - event.winProb * 100).toFixed(0)}%</span>
                        <div className="h-1.5 flex-1 bg-blue-100 dark:bg-blue-900/20 rounded-full overflow-hidden flex ring-1 ring-inset ring-black/5 dark:ring-white/5">
                            {/* T Win Prob Bar (Yellow) */}
                            <div 
                                className="h-full bg-linear-to-r from-yellow-400 to-amber-500 dark:from-yellow-600 dark:to-amber-700 transition-all duration-700 ease-out shadow-[0_0_8px_rgba(245,158,11,0.3)]" 
                                style={{ width: `${event.winProb * 100}%`, marginLeft: 'auto' }} 
                            ></div>
                        </div>
                        <span className="text-[9px] font-black text-yellow-500 dark:text-yellow-400 w-9 tabular-nums">{(event.winProb * 100).toFixed(0)}%</span>
                    </div>
                )}

                {/* Expanded WPA Details */}
                {isExpanded && event.wpaUpdates && (
                    <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700/50 text-xs shadow-sm">
                        <div className="mb-3 pb-2 border-b border-neutral-200 dark:border-neutral-700">
                            <div className="font-bold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
                                <span>CT 胜率变化</span>
                                <span className="text-neutral-400 font-normal text-[10px]">(基于当前局势)</span>
                            </div>
                            <div className="flex flex-wrap gap-x-8 gap-y-2 text-neutral-600 dark:text-neutral-400">
                                <div className="flex items-center gap-2">
                                    <span className="text-neutral-500">时间流逝:</span>
                                    <span className={`font-mono font-medium ${-event.wpaUpdates.timeProbDelta > 0 ? 'text-green-600 dark:text-green-400' : -event.wpaUpdates.timeProbDelta < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                                        {-event.wpaUpdates.timeProbDelta > 0 ? '+' : ''}{(-event.wpaUpdates.timeProbDelta * 100).toFixed(2)}%
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-neutral-500">事件影响:</span>
                                    <span className={`font-mono font-medium ${-event.wpaUpdates.eventProbDelta > 0 ? 'text-green-600 dark:text-green-400' : -event.wpaUpdates.eventProbDelta < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                                        {-event.wpaUpdates.eventProbDelta > 0 ? '+' : ''}{(-event.wpaUpdates.eventProbDelta * 100).toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Duel Stats */}
                        {event.duelStats && (
                            <div className="mb-3 pb-2 border-b border-neutral-200 dark:border-neutral-700">
                                <div className="font-bold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
                                    <Icons.Target className="w-3.5 h-3.5 text-neutral-400" />
                                    <span>对决详情</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 max-w-2xl">
                                    <div>
                                        <div className="text-xs text-neutral-500 mb-1.5 font-medium">击杀方 ({getName(event.subject)})</div>
                                        <ul className="space-y-1.5">
                                            <li className="flex justify-between items-center bg-white dark:bg-neutral-900/50 px-2.5 py-1.5 rounded border border-neutral-100 dark:border-neutral-800">
                                                <span className="text-neutral-500">武器</span>
                                                <span className="font-medium text-neutral-700 dark:text-neutral-300">{event.duelStats.attackerWeapon ? getWeaponName(event.duelStats.attackerWeapon) : '未知'}</span>
                                            </li>
                                            <li className="flex justify-between items-center bg-white dark:bg-neutral-900/50 px-2.5 py-1.5 rounded border border-neutral-100 dark:border-neutral-800">
                                                <span className="text-neutral-500">对决胜率</span>
                                                <span className="font-mono text-[11px] text-neutral-900 dark:text-white">
                                                    {event.duelStats.attackerWinProb !== undefined ? (event.duelStats.attackerWinProb * 100).toFixed(1) + '%' : '-'}
                                                </span>
                                            </li>
                                            {event.wpaUpdates?.ratingUpdates?.find(ru => ru.steamid === event.subject?.steamid) && (
                                                <li className="flex justify-between items-center bg-white dark:bg-neutral-900/50 px-2.5 py-1.5 rounded border border-neutral-100 dark:border-neutral-800">
                                                    <span className="text-neutral-500">击杀奖励 (Rating)</span>
                                                    <span className={`font-mono text-[11px] ${event.wpaUpdates.ratingUpdates.find(ru => ru.steamid === event.subject?.steamid)!.ratingDelta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {event.wpaUpdates.ratingUpdates.find(ru => ru.steamid === event.subject?.steamid)!.ratingDelta > 0 ? '+' : ''}{event.wpaUpdates.ratingUpdates.find(ru => ru.steamid === event.subject?.steamid)!.ratingDelta.toFixed(3)}
                                                    </span>
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                    <div>
                                        <div className="text-xs text-neutral-500 mb-1.5 font-medium">阵亡方 ({getName(event.target)})</div>
                                        <ul className="space-y-1.5">
                                            <li className="flex justify-between items-center bg-white dark:bg-neutral-900/50 px-2.5 py-1.5 rounded border border-neutral-100 dark:border-neutral-800">
                                                <span className="text-neutral-500">武器</span>
                                                <span className="font-medium text-neutral-700 dark:text-neutral-300">{event.duelStats.victimWeapon ? getWeaponName(event.duelStats.victimWeapon) : '未知'}</span>
                                            </li>
                                            <li className="flex justify-between items-center bg-white dark:bg-neutral-900/50 px-2.5 py-1.5 rounded border border-neutral-100 dark:border-neutral-800">
                                                <span className="text-neutral-500">对决胜率</span>
                                                <span className="font-mono text-[11px] text-neutral-900 dark:text-white">
                                                    {event.duelStats.victimWinProb !== undefined ? (event.duelStats.victimWinProb * 100).toFixed(1) + '%' : '-'}
                                                </span>
                                            </li>
                                            {event.wpaUpdates?.ratingUpdates?.find(ru => ru.steamid === event.target?.steamid) && (
                                                <li className="flex justify-between items-center bg-white dark:bg-neutral-900/50 px-2.5 py-1.5 rounded border border-neutral-100 dark:border-neutral-800">
                                                    <span className="text-neutral-500">死亡惩罚 (Rating)</span>
                                                    <span className={`font-mono text-[11px] ${event.wpaUpdates.ratingUpdates.find(ru => ru.steamid === event.target?.steamid)!.ratingDelta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {event.wpaUpdates.ratingUpdates.find(ru => ru.steamid === event.target?.steamid)!.ratingDelta > 0 ? '+' : ''}{event.wpaUpdates.ratingUpdates.find(ru => ru.steamid === event.target?.steamid)!.ratingDelta.toFixed(3)}
                                                    </span>
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Rating Updates */}
                        {event.wpaUpdates?.ratingUpdates && event.wpaUpdates.ratingUpdates.length > 0 && (
                            <div className="mb-3 pb-2 border-b border-neutral-200 dark:border-neutral-700">
                                <div className="font-bold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
                                    <Icons.Target className="w-3.5 h-3.5 text-neutral-400" />
                                    <span>Rating 影响</span>
                                    <span className="text-neutral-400 font-normal text-[10px]">(本回合 Rating 变化)</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 max-w-2xl">
                                    <ul className="space-y-1.5">
                                        {event.wpaUpdates.ratingUpdates.slice(0, Math.ceil(event.wpaUpdates.ratingUpdates.length / 2)).map((ru, idx) => {
                                            const isPositive = ru.ratingDelta > 0;
                                            
                                            // Robustly determine player side
                                            let playerSide = ru.playerSide || event.wpaUpdates?.timeUpdates?.find((u: any) => u.sid === ru.steamid)?.playerSide || 
                                                             event.wpaUpdates?.eventUpdates?.find((u: any) => u.sid === ru.steamid)?.playerSide;
                                            
                                            if (!playerSide) {
                                                if (event.subject?.steamid === ru.steamid) playerSide = event.subject.side;
                                                else if (event.target?.steamid === ru.steamid) playerSide = event.target.side;
                                                else if (assists?.some(a => a.subject?.steamid === ru.steamid)) {
                                                    playerSide = assists.find(a => a.subject?.steamid === ru.steamid)?.subject?.side;
                                                }
                                            }

                                            const displayName = (playerNameMap && playerNameMap[ru.steamid]) || resolveName(ru.steamid);
                                            return (
                                                <li key={idx} className="flex justify-between items-center bg-white dark:bg-neutral-900/50 px-2.5 py-1.5 rounded border border-neutral-100 dark:border-neutral-800">
                                                    <span className={`font-medium ${getPColor(playerSide)}`}>{displayName}</span>
                                                    <span className={`font-mono text-[11px] ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {isPositive ? '+' : ''}{ru.ratingDelta.toFixed(3)}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    <ul className="space-y-1.5">
                                        {event.wpaUpdates.ratingUpdates.slice(Math.ceil(event.wpaUpdates.ratingUpdates.length / 2)).map((ru, idx) => {
                                            const isPositive = ru.ratingDelta > 0;
                                            
                                            // Robustly determine player side
                                            let playerSide = ru.playerSide || event.wpaUpdates?.timeUpdates?.find((u: any) => u.sid === ru.steamid)?.playerSide || 
                                                             event.wpaUpdates?.eventUpdates?.find((u: any) => u.sid === ru.steamid)?.playerSide;
                                            
                                            if (!playerSide) {
                                                if (event.subject?.steamid === ru.steamid) playerSide = event.subject.side;
                                                else if (event.target?.steamid === ru.steamid) playerSide = event.target.side;
                                                else if (assists?.some(a => a.subject?.steamid === ru.steamid)) {
                                                    playerSide = assists.find(a => a.subject?.steamid === ru.steamid)?.subject?.side;
                                                }
                                            }

                                            const displayName = (playerNameMap && playerNameMap[ru.steamid]) || resolveName(ru.steamid);
                                            return (
                                                <li key={idx} className="flex justify-between items-center bg-white dark:bg-neutral-900/50 px-2.5 py-1.5 rounded border border-neutral-100 dark:border-neutral-800">
                                                    <span className={`font-medium ${getPColor(playerSide)}`}>{displayName}</span>
                                                    <span className={`font-mono text-[11px] ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {isPositive ? '+' : ''}{ru.ratingDelta.toFixed(3)}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 max-w-2xl">
                            <div>
                                <div className="font-bold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-1.5">
                                    <Icons.Timer className="w-3.5 h-3.5 text-neutral-400" />
                                    时间流逝加/扣分
                                </div>
                                <ul className="space-y-1.5">
                                    {event.wpaUpdates.timeUpdates.map((u: any, i: number) => (
                                        <li key={i} className="flex justify-between items-center bg-white dark:bg-neutral-900/50 px-2.5 py-1.5 rounded border border-neutral-100 dark:border-neutral-800">
                                            <span className={`font-medium ${getPColor(u.playerSide)}`}>{u.playerName}</span>
                                            <span className={`font-mono text-[11px] ${u.delta > 0 ? 'text-green-600 dark:text-green-400' : u.delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-neutral-500'}`}>
                                                {u.delta > 0 ? '+' : ''}{u.delta.toFixed(2)}%
                                            </span>
                                        </li>
                                    ))}
                                    {event.wpaUpdates.timeUpdates.length === 0 && <li className="text-neutral-400 italic px-2 py-1">无变化</li>}
                                </ul>
                            </div>
                            <div>
                                <div className="font-bold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-1.5">
                                    <Icons.Target className="w-3.5 h-3.5 text-neutral-400" />
                                    事件影响加/扣分
                                </div>
                                <ul className="space-y-1.5">
                                    {event.wpaUpdates.eventUpdates.map((u: any, i: number) => (
                                        <li key={i} className="flex justify-between items-center bg-white dark:bg-neutral-900/50 px-2.5 py-1.5 rounded border border-neutral-100 dark:border-neutral-800">
                                            <span className={`font-medium ${getPColor(u.playerSide)}`}>{u.playerName}</span>
                                            <span className={`font-mono text-[11px] ${u.delta > 0 ? 'text-green-600 dark:text-green-400' : u.delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-neutral-500'}`}>
                                                {u.delta > 0 ? '+' : ''}{u.delta.toFixed(2)}%
                                            </span>
                                        </li>
                                    ))}
                                    {event.wpaUpdates.eventUpdates.length === 0 && <li className="text-neutral-400 italic px-2 py-1">无变化</li>}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
