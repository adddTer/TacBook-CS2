
import React, { useState } from 'react';
import { Match, MatchRound, MatchTimelineEvent } from '../../types';
import { getRatingColorClass } from './ReviewShared';
import { ROSTER } from '../../constants/roster';

interface TimelineTabProps {
    match: Match;
}

// --- Mappings ---

const WIN_REASON_CN_MAP: Record<string, string> = {
    // Number keys (converted to string)
    '1': 'T 歼灭/C4爆炸',   
    '7': 'C4 拆除',        
    '8': 'T 全灭',         
    '9': 'CT 全灭',        
    '10': 'C4 爆炸',       
    '12': '时间耗尽',      
    '17': 'T 投降',
    '18': 'CT 投降',
    // String keys (common parser outputs)
    'target_bombed': 'C4 爆炸',
    'bomb_defused': 'C4 拆除',
    't_killed': 'T 全灭',
    'ct_killed': 'CT 全灭',
    'target_saved': '时间耗尽',
    'terrorists_surrender': 'T 投降',
    'ct_surrender': 'CT 投降',
    'bomb_exploded': 'C4 爆炸',
    'time_ran_out': '时间耗尽'
};

const getWinReasonText = (reason: number | string) => {
    return WIN_REASON_CN_MAP[String(reason)] || `Reason ${reason}`;
};

const WEAPON_CN_MAP: Record<string, string> = {
    'ak47': 'AK-47', 'm4a1': 'M4A4', 'm4a1_silencer': 'M4A1-S', 'galilar': 'Galil', 'famas': 'Famas',
    'sg553': 'SG 553', 'aug': 'AUG', 'awp': 'AWP', 'ssg08': '鸟狙', 'g3sg1': 'T连狙', 'scar20': 'CT连狙',
    'mac10': 'MAC-10', 'mp9': 'MP9', 'mp7': 'MP7', 'ump45': 'UMP-45', 'p90': 'P90', 'bizon': '野牛',
    'glock': 'Glock', 'hkp2000': 'P2000', 'usp_silencer': 'USP-S', 'p250': 'P250', 'tec9': 'Tec-9',
    'fiveseven': 'FN57', 'deagle': '沙鹰', 'cz75a': 'CZ75', 'elite': '双枪', 'revolver': 'R8',
    'nova': 'Nova', 'xm1014': 'XM1014', 'mag7': '警喷', 'sawedoff': '匪喷', 'm249': 'M249', 'negev': '内格夫',
    'hegrenade': '手雷', 'flashbang': '闪光', 'smokegrenade': '烟雾', 'incgrenade': '火', 'molotov': '火', 'decoy': '诱饵',
    'inferno': '火', 'taser': '电击', 'knife': '刀', 'world': '世界'
};

const getWeaponName = (code?: string) => {
    if (!code) return '';
    const clean = code.replace('weapon_', '').toLowerCase();
    return WEAPON_CN_MAP[clean] || clean.toUpperCase();
};

const ROUND_DURATION = 115; // 1:55 in seconds
const BOMB_DURATION = 41;   // 41 seconds bomb timer

const formatTime = (seconds: number, mode: 'elapsed' | 'countdown' = 'elapsed', plantTime?: number) => {
    let t = seconds;
    
    // Check if we are in a post-plant scenario
    const isPostPlant = plantTime !== undefined && seconds >= plantTime;

    if (mode === 'countdown') {
        if (isPostPlant) {
            // Bomb Countdown: 40s - (CurrentTime - PlantTime)
            t = BOMB_DURATION - (seconds - plantTime);
        } else {
            // Standard Round Countdown: 1:55 - CurrentTime
            // Note: If seconds is negative (freeze time), this naturally becomes > 1:55 (e.g. 1:55 - (-5) = 2:00)
            t = ROUND_DURATION - seconds;
        }
    }

    const sign = t < 0 ? '-' : '';
    const absT = Math.abs(t);
    const m = Math.floor(absT / 60);
    const s = Math.floor(absT % 60);
    
    return `${sign}${m}:${s.toString().padStart(2, '0')}`;
};

// --- Icons (SVG) ---

const Icons = {
    Kill: () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    Skull: () => <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5zm0 2a3 3 0 013 3v2H7V7a3 3 0 013-3zm0 8a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-4-1h2v2H6v-2zm8 0h2v2h-2v-2z" /></svg>, 
    Headshot: () => <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-5.5l2-2 2 2 1.5-1.5L13.5 11l2-2-1.5-1.5-2 2-2-2-1.5 1.5 2 2-2 2z"/></svg>,
    Assist: () => <svg className="w-3 h-3 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    Flash: () => <svg className="w-3 h-3 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    Blind: () => <svg className="w-3 h-3 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>,
    Wallbang: () => <svg className="w-3 h-3 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
    Smoke: () => <svg className="w-3 h-3 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>,
    Bomb: () => <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Defuse: () => <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0 0L3 3m5.758 5.758a3 3 0 104.243-4.243 3 3 0 00-4.243 4.243z" /></svg>,
    Explode: () => <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>,
    Flag: () => <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-8a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h6v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2zm0 0V3m0 6h.01" /></svg>
};

// --- Components ---

export const TimelineTab: React.FC<TimelineTabProps> = ({ match }) => {
    const [expandedRound, setExpandedRound] = useState<number | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [timeMode, setTimeMode] = useState<'elapsed' | 'countdown'>('countdown');

    if (!match.rounds || match.rounds.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                <svg className="w-12 h-12 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm">暂无详细回合数据</p>
                <p className="text-xs opacity-60">请尝试重新导入 Demo JSON</p>
            </div>
        );
    }

    const toggleRound = (r: number) => {
        setExpandedRound(expandedRound === r ? null : r);
    };

    return (
        <div className="space-y-4 pb-8">
            <div className="flex justify-end px-1 gap-2">
                 <button 
                    onClick={() => setTimeMode(timeMode === 'countdown' ? 'elapsed' : 'countdown')}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 transition-all active:scale-95 border border-transparent"
                 >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {timeMode === 'countdown' ? '倒计时' : '正计时'}
                 </button>

                 <button 
                    onClick={() => setShowDetails(!showDetails)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 border border-transparent
                        ${showDetails 
                            ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-black' 
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200'}`}
                 >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {showDetails ? '显示详情' : '简略模式'}
                 </button>
            </div>

            {match.rounds.map((round) => (
                <RoundCard 
                    key={round.roundNumber} 
                    round={round} 
                    isExpanded={expandedRound === round.roundNumber} 
                    onToggle={() => toggleRound(round.roundNumber)}
                    match={match}
                    showDetails={showDetails}
                    timeMode={timeMode}
                />
            ))}
        </div>
    );
};

const RoundCard = ({ round, isExpanded, onToggle, match, showDetails, timeMode }: { round: MatchRound, isExpanded: boolean, onToggle: () => void, match: Match, showDetails: boolean, timeMode: 'elapsed' | 'countdown' }) => {
    const isCTWin = round.winnerSide === 'CT';
    
    // Style configurations based on winner
    const cardBorderColor = isCTWin ? 'border-blue-500' : 'border-amber-500';
    const winTextColor = isCTWin ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400';
    const gradientBg = isCTWin 
        ? 'bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10' 
        : 'bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10';
    
    // Sort events by time
    const sortedEvents = [...round.timeline].sort((a,b) => a.seconds - b.seconds);
    
    // Identify bomb plant for timer calculations
    const plantEvent = sortedEvents.find(e => e.type === 'plant');
    const plantTime = plantEvent ? plantEvent.seconds : undefined;

    // Identify End Time of Bomb Logic (Defuse or Explode)
    const defuseEvent = sortedEvents.find(e => e.type === 'defuse');
    const explodeEvent = sortedEvents.find(e => e.type === 'explode');
    let bombEndTime: number | undefined = undefined;
    if (defuseEvent) bombEndTime = defuseEvent.seconds;
    if (explodeEvent) bombEndTime = explodeEvent.seconds;
    
    // Filter based on showDetails
    const displayEvents = sortedEvents.filter(ev => {
        if (ev.type === 'damage') return showDetails;
        return true;
    });

    // Summary data
    const killCount = sortedEvents.filter(e => e.type === 'kill').length;

    // Stats array preparation
    const statsArray = Object.entries(round.playerStats).map(([sid, stats]) => {
        let name = sid;
        const pMatch = match.players.find(p => p.steamid === sid) || match.enemyPlayers.find(p => p.steamid === sid);
        if (pMatch) name = pMatch.playerId;
        else {
            const roster = ROSTER.find(r => r.id === sid || r.name === sid);
            if (roster) name = roster.id;
        }
        return { name, ...stats, steamid: sid };
    });

    const sidePlayers = {
        CT: statsArray.filter(s => s.side === 'CT'),
        T: statsArray.filter(s => s.side === 'T')
    };

    return (
        <div className={`
            bg-white dark:bg-neutral-900 border-l-[3px] ${cardBorderColor} 
            border-y border-r border-neutral-200 dark:border-neutral-800 
            rounded-r-xl overflow-hidden shadow-sm transition-all hover:shadow-md
        `}>
            {/* Round Header */}
            <div 
                onClick={onToggle}
                className={`p-3 pr-4 flex items-center justify-between cursor-pointer ${gradientBg} hover:bg-opacity-80 transition-colors`}
            >
                <div className="flex items-center gap-4">
                    {/* Round Number Badge */}
                    <div className="flex flex-col items-center justify-center min-w-[2.5rem]">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Round</span>
                        <span className="font-mono text-lg font-black text-neutral-700 dark:text-neutral-200 leading-none">
                            {round.roundNumber}
                        </span>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700"></div>

                    {/* Info */}
                    <div>
                        <div className={`text-sm font-black ${winTextColor} flex items-center gap-2 mb-0.5`}>
                            {round.winnerSide} 胜利 
                            <span className="text-[10px] font-bold text-neutral-500 bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded border border-neutral-100 dark:border-neutral-800 backdrop-blur-sm">
                                {getWinReasonText(round.winReason)}
                            </span>
                        </div>
                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center gap-3 font-sans tabular-nums">
                            <span className="flex items-center gap-1" title="回合时长">
                                <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {formatTime(round.duration, 'elapsed')}
                            </span>
                            <span className="flex items-center gap-1" title="总击杀">
                                <Icons.Kill />
                                {killCount} 击杀
                            </span>
                            
                            {/* Objective Status Icons */}
                            {plantEvent && (
                                <span className={`flex items-center gap-1 font-bold ${
                                    defuseEvent ? 'text-green-500' : explodeEvent ? 'text-amber-500' : 'text-red-500'
                                }`}>
                                    <Icons.Bomb />
                                    {defuseEvent ? '已拆除' : explodeEvent ? '已爆炸' : '已安放'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} text-neutral-400`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t border-neutral-100 dark:border-neutral-800 animate-in slide-in-from-top-2 duration-200">
                    
                    {/* Events Timeline */}
                    <div className="p-4 sm:p-6 bg-neutral-50/50 dark:bg-neutral-950/30">
                        <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            时间线 ({timeMode === 'countdown' ? '倒计时' : '正计时'})
                        </h4>
                        
                        <div className="relative pl-3 space-y-0">
                            {/* Vertical Line Container */}
                            <div className="absolute left-[34px] top-3 bottom-4 w-0.5 bg-neutral-200 dark:bg-neutral-800 -z-10"></div>
                            
                            {displayEvents.map((ev, idx) => (
                                <TimelineEventRow key={idx} event={ev} timeMode={timeMode} plantTime={plantTime} bombEndTime={bombEndTime} />
                            ))}
                        </div>
                    </div>

                    {/* Round Stats Table */}
                    <div className="p-4 sm:p-6 border-t border-neutral-100 dark:border-neutral-800">
                         <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                             本局数据
                         </h4>
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                             <RoundTeamStats teamName="CT" players={sidePlayers.CT} color="text-blue-500" />
                             <RoundTeamStats teamName="T" players={sidePlayers.T} color="text-amber-500" />
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TimelineEventRow = ({ event, timeMode, plantTime, bombEndTime }: { event: MatchTimelineEvent, timeMode: 'elapsed' | 'countdown', plantTime?: number, bombEndTime?: number }) => {
    const timeStr = formatTime(event.seconds, timeMode, plantTime);
    
    // Only show red if:
    // 1. Bomb has been planted
    // 2. Current event is after planting
    // 3. Bomb has NOT YET ended (or this event is strictly before the end time)
    //    If seconds == bombEndTime, it means this is the defuse/explode event itself, we usually keep it red or special color?
    //    Requirement: "After defuse/explode, restore to white".
    //    So if event.seconds > bombEndTime, it is white.
    //    Strictly: while bomb is active.
    
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
            </div>
        </div>
    );
};

const RoundTeamStats = ({ teamName, players, color }: { teamName: string, players: any[], color: string }) => {
    return (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
            <h5 className={`text-[10px] font-black uppercase px-3 py-2 ${color} bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800`}>
                {teamName}
            </h5>
            <div className="p-1">
                {/* Header */}
                <div className="flex items-center justify-between text-[9px] font-bold text-neutral-400 px-2 py-1.5 border-b border-neutral-100 dark:border-neutral-800 mb-1">
                    <div className="w-24">ID</div>
                    <div className="flex gap-1 text-center flex-1 justify-end">
                        <div className="w-10">K / D</div>
                        <div className="w-10">DMG</div>
                        <div className="w-10">IMP</div>
                        <div className="w-10 text-right">RTG</div>
                    </div>
                </div>
                {/* Rows */}
                {players.sort((a,b) => b.rating - a.rating).map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors group">
                        <div className="flex items-center gap-2 w-24 truncate font-bold text-neutral-700 dark:text-neutral-300">
                            {p.survived ? 
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0 shadow-[0_0_5px_rgba(34,197,94,0.6)]" title="存活"></div> : 
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0 opacity-20" title="阵亡"></div>
                            }
                            <span className="truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{p.name}</span>
                        </div>
                        <div className="flex gap-1 text-center flex-1 justify-end">
                            <div className="w-10 font-mono text-[11px]">
                                <span className={p.kills > 0 ? 'text-neutral-900 dark:text-white font-bold' : 'text-neutral-400'}>{p.kills}</span>
                                <span className="text-neutral-300 mx-0.5">/</span>
                                <span className={p.deaths > 0 ? 'text-red-500' : 'text-neutral-400'}>{p.deaths}</span>
                            </div>
                            <div className="w-10 font-mono text-neutral-500 text-[11px]">{p.damage}</div>
                            <div className="w-10 font-mono text-blue-500 font-bold text-[11px]">{p.impact.toFixed(2)}</div>
                             <div className="w-10 text-right">
                                <div className={`font-mono font-black text-[11px] ${getRatingColorClass(p.rating)}`}>{p.rating.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
