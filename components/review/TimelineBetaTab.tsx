import React, { useState, useMemo, useEffect } from 'react';
import { Match, MatchRound } from '../../types';
import { TimelineEventRow } from './TimelineEventRow';
import { getWinReasonText } from './TimelineHelpers';

interface TimelineBetaTabProps {
    match: Match;
}

export const TimelineBetaTab: React.FC<TimelineBetaTabProps> = ({ match }) => {
    const [selectedRoundNum, setSelectedRoundNum] = useState<number>(match.rounds?.[0]?.roundNumber || 1);
    const [showDetails, setShowDetails] = useState(false);
    const [timeMode, setTimeMode] = useState<'elapsed' | 'countdown'>('countdown');
    const [showWinProb, setShowWinProb] = useState(true);
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!match.rounds || match.rounds.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                <svg className="w-12 h-12 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm">暂无详细回合数据</p>
                <p className="text-xs opacity-60">请尝试重新导入 Demo JSON</p>
            </div>
        );
    }

    const selectedRound = match.rounds.find(r => r.roundNumber === selectedRoundNum);

    const duration = useMemo(() => {
        if (!selectedRound) return 120;
        if (selectedRound.duration) return Math.ceil(selectedRound.duration);
        if (selectedRound.timeline && selectedRound.timeline.length > 0) {
            return Math.ceil(selectedRound.timeline[selectedRound.timeline.length - 1].seconds);
        }
        return 120;
    }, [selectedRound]);

    const winProbSamples = useMemo(() => {
        if (!selectedRound) return [];
        const samples: { time: number, prob: number }[] = [];
        let tAlive = 5;
        let ctAlive = 5;
        let bombPlanted = false;
        
        const allEvents = selectedRound.timeline || [];
        
        // Add initial sample
        samples.push({ time: 0, prob: 0.5 });

        let lastTime = 0;

        const calculateProb = (tA: number, ctA: number, planted: boolean, time: number) => {
            if (tA === 0 && ctA === 0) return 0.5;
            if (tA === 0) return 0.0;
            if (ctA === 0) return 1.0;
            let p = tA / (tA + ctA);
            if (planted) {
                p += 0.2;
            } else {
                p -= (Math.min(1, time / 115)) * 0.15;
            }
            return Math.max(0.05, Math.min(0.95, p));
        };

        const addSample = (time: number) => {
            for (let t = Math.floor(lastTime) + 1; t <= Math.floor(time); t++) {
                samples.push({ time: t, prob: calculateProb(tAlive, ctAlive, bombPlanted, t) });
            }
            samples.push({ time, prob: calculateProb(tAlive, ctAlive, bombPlanted, time) });
            lastTime = time;
        };

        allEvents.forEach(ev => {
            addSample(ev.seconds);
            if (ev.type === 'kill') {
                if (ev.target?.side === 'T') tAlive = Math.max(0, tAlive - 1);
                if (ev.target?.side === 'CT') ctAlive = Math.max(0, ctAlive - 1);
            } else if (ev.type === 'plant') {
                bombPlanted = true;
            } else if (ev.type === 'defuse') {
                bombPlanted = false;
            }
            // Add sample immediately after state change
            samples.push({ time: ev.seconds, prob: calculateProb(tAlive, ctAlive, bombPlanted, ev.seconds) });
        });

        addSample(duration);

        // Snap to 1.0 or 0.0 at the end
        const winner = selectedRound.winnerSide;
        const finalProb = winner === 'T' ? 1.0 : 0.0;
        samples.push({ time: duration, prob: finalProb });

        return samples;
    }, [selectedRound, duration]);

    const groupedEvents = useMemo(() => {
        if (!selectedRound) return [];
        const result: any[] = [];
        const allEvents = selectedRound.timeline || [];
        
        for (let i = 0; i < allEvents.length; i++) {
            const event = allEvents[i];
            
            // Assign frontend calculated winProb
            const sample = winProbSamples.find(s => s.time >= event.seconds) || winProbSamples[winProbSamples.length - 1];
            const eventWithProb = { ...event, winProb: sample ? sample.prob : 0.5 };

            if (event.type === 'kill') {
                const assists = [];
                let j = i + 1;
                while (j < allEvents.length && allEvents[j].type === 'assist' && allEvents[j].tick === event.tick) {
                    assists.push(allEvents[j]);
                    j++;
                }
                result.push({ ...eventWithProb, assists });
                i = j - 1;
            } else if (event.type !== 'assist') {
                result.push(eventWithProb);
            }
        }
        
        if (!showDetails) {
            return result.filter(e => e.type === 'kill' || e.type === 'plant' || e.type === 'defuse' || e.type === 'explode' || e.type === 'round_end');
        }
        return result;
    }, [selectedRound, showDetails, winProbSamples]);

    const isMobile = windowWidth < 768;
    const pixelsPerSecond = isMobile ? 25 : 40;
    const CARD_WIDTH = isMobile ? 260 : 320;
    const CARD_HEIGHT = isMobile ? 60 : 80;

    const positionedEvents = useMemo(() => {
        const lanes: number[] = [];
        return groupedEvents.map(event => {
            const x = event.seconds * pixelsPerSecond;
            let lane = 0;
            while (lanes[lane] !== undefined && lanes[lane] > x) {
                lane++;
            }
            lanes[lane] = x + CARD_WIDTH + 16;
            return { ...event, x, lane };
        });
    }, [groupedEvents, pixelsPerSecond, CARD_WIDTH]);

    const maxLanes = Math.max(1, positionedEvents.reduce((max, e) => Math.max(max, e.lane), 0) + 1);
    const chartHeight = 240;
    const containerHeight = Math.max(chartHeight, maxLanes * (CARD_HEIGHT + 16) + 60);
    const containerWidth = Math.max(800, duration * pixelsPerSecond + CARD_WIDTH + 40);

    const playerNameMap = useMemo(() => {
        const map: Record<string, string> = {};
        match.players.forEach(p => { if (p.steamid) map[p.steamid] = p.playerId; });
        match.enemyPlayers.forEach(p => { if (p.steamid) map[p.steamid] = p.playerId; });
        return map;
    }, [match]);

    // SVG Points
    const tPoints = `0,${containerHeight} ` + winProbSamples.map(s => `${s.time * pixelsPerSecond},${(1 - s.prob) * containerHeight}`).join(' ') + ` ${duration * pixelsPerSecond},${containerHeight}`;
    const ctPoints = `0,0 ` + winProbSamples.map(s => `${s.time * pixelsPerSecond},${(1 - s.prob) * containerHeight}`).join(' ') + ` ${duration * pixelsPerSecond},0`;
    const linePoints = winProbSamples.map(s => `${s.time * pixelsPerSecond},${(1 - s.prob) * containerHeight}`).join(' ');

    return (
        <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-200px)]">
            {/* Left Sidebar: Round List */}
            <div className="w-full md:w-64 shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 pr-0 md:pr-2 custom-scrollbar">
                {match.rounds.map((round) => {
                    const isSelected = round.roundNumber === selectedRoundNum;
                    const isTWin = round.winnerSide === 'T';
                    const winColor = isTWin ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-500' : 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-500';
                    const inactiveColor = 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-700';
                    
                    const roundDuration = round.timeline && round.timeline.length > 0 ? Math.floor(round.timeline[round.timeline.length - 1].seconds) : 0;
                    const mins = Math.floor(roundDuration / 60);
                    const secs = roundDuration % 60;
                    
                    let tKills = 0;
                    let ctKills = 0;
                    round.timeline?.forEach(e => {
                        if (e.type === 'kill' && e.subject) {
                            if (e.subject.side === 'T') tKills++;
                            else if (e.subject.side === 'CT') ctKills++;
                        }
                    });

                    return (
                        <button
                            key={round.roundNumber}
                            onClick={() => setSelectedRoundNum(round.roundNumber)}
                            className={`flex flex-col p-3 rounded-xl border transition-all text-left shrink-0 w-48 md:w-auto ${isSelected ? winColor : inactiveColor}`}
                        >
                            <div className="flex items-center justify-between w-full mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${isSelected ? (isTWin ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white') : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                                        {round.roundNumber}
                                    </div>
                                    <div className="font-bold text-sm">{round.winnerSide} Win</div>
                                </div>
                                <div className="text-[10px] font-mono opacity-60">
                                    {mins}:{secs.toString().padStart(2, '0')}
                                </div>
                            </div>
                            <div className="flex items-center justify-between w-full text-xs">
                                <span className="opacity-70">{getWinReasonText(round.winReason)}</span>
                                <div className="flex items-center gap-1.5 font-mono">
                                    <span className="text-yellow-600 dark:text-yellow-500">{tKills}</span>
                                    <span className="opacity-30">-</span>
                                    <span className="text-blue-600 dark:text-blue-500">{ctKills}</span>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Right Content: Round Details */}
            <div className="flex-1 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col relative">
                
                {/* Header Controls */}
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-white/80 dark:bg-neutral-900/80 backdrop-blur z-20">
                    <div className="font-black text-lg">回合 {selectedRoundNum}</div>
                    <div className="flex gap-2">
                         <button 
                            onClick={() => setShowWinProb(!showWinProb)}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 border border-transparent
                                ${showWinProb 
                                    ? 'bg-blue-600 text-white shadow-sm' 
                                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200'}`}
                         >
                            {showWinProb ? '隐藏胜率' : '显示胜率'}
                         </button>
                         <button 
                            onClick={() => setTimeMode(timeMode === 'countdown' ? 'elapsed' : 'countdown')}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 transition-all active:scale-95 border border-transparent"
                         >
                            {timeMode === 'countdown' ? '倒计时' : '正计时'}
                         </button>
                         <button 
                            onClick={() => setShowDetails(!showDetails)}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 border border-transparent
                                ${showDetails 
                                    ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-black' 
                                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200'}`}
                         >
                            {showDetails ? '显示详情' : '简略模式'}
                         </button>
                    </div>
                </div>

                {/* Timeline Container */}
                <div className="flex-1 overflow-auto relative custom-scrollbar bg-neutral-50 dark:bg-neutral-950">
                    <div className="relative" style={{ width: `${containerWidth}px`, height: `${containerHeight}px` }}>
                        
                        {/* Time Ticks (X-Axis) */}
                        <div className="absolute top-0 left-0 w-full h-6 border-b border-neutral-200 dark:border-neutral-800 z-10 flex text-[10px] font-mono text-neutral-400 dark:text-neutral-600 pointer-events-none">
                            {Array.from({ length: Math.ceil(duration / 10) + 1 }).map((_, i) => (
                                <div key={i} className="absolute h-full border-l border-neutral-200 dark:border-neutral-800 pl-1 pt-1" style={{ left: `${i * 10 * pixelsPerSecond}px` }}>
                                    {i * 10}s
                                </div>
                            ))}
                        </div>

                        {/* Wave Background */}
                        {showWinProb && (
                            <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-50">
                                <svg viewBox={`0 0 ${duration * pixelsPerSecond} ${containerHeight}`} preserveAspectRatio="none" className="w-full h-full">
                                    {/* CT Area (Top) */}
                                    <polygon points={ctPoints} className="fill-blue-500" />
                                    {/* T Area (Bottom) */}
                                    <polygon points={tPoints} className="fill-yellow-500" />
                                    {/* Line */}
                                    <polyline points={linePoints} className="stroke-white dark:stroke-neutral-700" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />
                                </svg>
                            </div>
                        )}

                        {/* Event Cards */}
                        <div className="absolute inset-0 z-10 pt-8">
                            {positionedEvents.map((event, index) => (
                                <div 
                                    key={index} 
                                    className="absolute transition-all duration-300 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md hover:z-20 focus-within:z-20 overflow-hidden" 
                                    style={{ 
                                        left: `${event.x + 10}px`, // 10px padding from the exact time line
                                        top: `${event.lane * (CARD_HEIGHT + 16) + 32}px`,
                                        width: `${CARD_WIDTH}px`
                                    }}
                                >
                                    {/* Vertical line connecting card to its exact time */}
                                    <div className="absolute -left-[10px] top-4 w-[10px] h-px bg-neutral-300 dark:bg-neutral-700"></div>
                                    <div className="absolute -left-[10px] -top-[1000px] w-px h-[2000px] bg-neutral-300/50 dark:bg-neutral-700/50 border-l border-dashed border-neutral-400/50 dark:border-neutral-600/50"></div>

                                    <div className="p-3">
                                        <TimelineEventRow 
                                            event={event} 
                                            timeMode={timeMode} 
                                            showWinProb={showWinProb}
                                            assists={event.assists}
                                            playerNameMap={playerNameMap}
                                            isCard={true}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
