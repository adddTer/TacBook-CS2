
import React, { useMemo } from 'react';
import { ROSTER_HISTORY } from '../../constants/history';

export const RosterTimelineView: React.FC = () => {
    // 1. Prepare Data
    const players = useMemo(() => {
        const pSet = new Set<string>();
        ROSTER_HISTORY.forEach(h => pSet.add(h.player));
        return Array.from(pSet);
    }, []);

    const timelineConfig = useMemo(() => {
        if (ROSTER_HISTORY.length === 0) return null;
        
        const dates = ROSTER_HISTORY.map(h => new Date(h.date).getTime());
        const minTime = Math.min(...dates);
        const maxTime = Math.max(...dates);

        // Start from the beginning of the month of the earliest event
        const startDate = new Date(minTime);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);

        // End at the end of the month of the latest event (or current date if later)
        const now = new Date();
        const latestDate = new Date(Math.max(maxTime, now.getTime()));
        const endDate = new Date(latestDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);

        const start = startDate.getTime();
        const end = endDate.getTime();
        const duration = end - start;

        // Generate month labels
        const labels: { label: string, pos: number, isYear?: boolean }[] = [];
        const curr = new Date(startDate);
        while (curr <= endDate) {
            const monthName = curr.toLocaleString('en-US', { month: 'short' });
            const year = curr.getFullYear();
            const pos = ((curr.getTime() - start) / duration) * 100;
            
            labels.push({
                label: curr.getMonth() === 0 ? year.toString() : monthName,
                pos,
                isYear: curr.getMonth() === 0
            });
            
            curr.setMonth(curr.getMonth() + 1);
        }

        return { start, end, duration, labels };
    }, []);

    const getPosition = (dateStr: string) => {
        if (!timelineConfig) return 0;
        const time = new Date(dateStr).getTime();
        return Math.max(0, Math.min(100, ((time - timelineConfig.start) / timelineConfig.duration) * 100));
    };

    const playerPeriods = useMemo(() => {
        if (!timelineConfig) return [];
        return players.map(player => {
            const events = ROSTER_HISTORY
                .filter(e => e.player === player)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            const segments: { start: number, end: number, type: string }[] = [];
            let currentStart: number | null = null;
            let currentType: string = 'active';

            events.forEach((event, idx) => {
                const pos = getPosition(event.date);
                
                if (event.type === 'in') {
                    currentStart = pos;
                    currentType = 'active';
                } else if (event.type === 'bench') {
                    if (currentStart !== null) {
                        segments.push({ start: currentStart, end: pos, type: currentType });
                    }
                    currentStart = pos;
                    currentType = 'bench';
                } else if (event.type === 'out') {
                    if (currentStart !== null) {
                        segments.push({ start: currentStart, end: pos, type: currentType });
                    }
                    currentStart = null;
                }
            });

            // If still in team
            if (currentStart !== null) {
                segments.push({ start: currentStart, end: 100, type: currentType });
            }

            return { name: player, segments };
        });
    }, [players, timelineConfig]);

    const todayPos = useMemo(() => {
        if (!timelineConfig) return -1;
        const now = new Date().getTime();
        if (now < timelineConfig.start || now > timelineConfig.end) return -1;
        return ((now - timelineConfig.start) / timelineConfig.duration) * 100;
    }, [timelineConfig]);

    const groupedHistory = useMemo(() => {
        const groups: Record<string, typeof ROSTER_HISTORY> = {};
        ROSTER_HISTORY.forEach(item => {
            if (!groups[item.date]) groups[item.date] = [];
            groups[item.date].push(item);
        });
        return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
    }, []);

    if (!timelineConfig) return null;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Timeline Visualization */}
            <div className="bg-neutral-900/50 dark:bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 overflow-x-auto">
                <div className="min-w-[600px]">
                    {/* Timeline Header */}
                    <div className="flex mb-4 relative h-6">
                        <div className="w-32 shrink-0"></div>
                        <div className="flex-1 relative">
                            {timelineConfig.labels.map((m, i) => (
                                <div 
                                    key={i} 
                                    className={`absolute text-[10px] font-bold uppercase tracking-wider transform -translate-x-1/2 ${m.isYear ? 'text-white bg-neutral-800 px-2 py-0.5 rounded' : 'text-neutral-500'}`}
                                    style={{ left: `${m.pos}%` }}
                                >
                                    {m.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Timeline Rows */}
                    <div className="space-y-4 relative">
                        {/* Vertical Grid Lines */}
                        <div className="absolute inset-0 pointer-events-none left-32">
                            {timelineConfig.labels.map((_, i) => (
                                <div 
                                    key={i} 
                                    className="absolute top-0 bottom-0 w-px border-l border-dashed border-neutral-800/50"
                                    style={{ left: `${_.pos}%` }}
                                ></div>
                            ))}
                        </div>

                        {playerPeriods.map((player, idx) => (
                            <div key={idx} className="flex items-center group">
                                <div className="w-32 shrink-0 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-neutral-800 flex items-center justify-center text-[10px] font-black text-neutral-500 group-hover:text-blue-400 transition-colors">
                                        {player.name[0]}
                                    </div>
                                    <span className="text-xs font-bold text-neutral-400 group-hover:text-white transition-colors truncate">{player.name}</span>
                                </div>
                                <div className="flex-1 h-6 relative flex items-center">
                                    {player.segments.map((seg, sIdx) => (
                                        <div 
                                            key={sIdx}
                                            className={`absolute h-1.5 rounded-full transition-all ${
                                                seg.type === 'active' ? 'bg-blue-500/40 group-hover:bg-blue-500/60' : 'bg-transparent'
                                            }`}
                                            style={{ left: `${seg.start}%`, width: `${seg.end - seg.start}%` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Current Date Indicator */}
                        {todayPos !== -1 && (
                            <div className="absolute top-0 bottom-0 w-px bg-blue-500/30 z-10" style={{ left: `calc(128px + ${todayPos}%)` }}>
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Detailed History List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {groupedHistory.map(([date, items]) => (
                    <div key={date} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                            <h4 className="font-black text-lg text-neutral-900 dark:text-white font-mono">{date}</h4>
                        </div>
                        <div className="space-y-3">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${
                                            item.type === 'in' ? 'bg-emerald-500' : 
                                            item.type === 'out' ? 'bg-red-500' : 
                                            item.type === 'role_change' ? 'bg-blue-500' : 'bg-amber-500'
                                        }`} />
                                        <span className="font-bold text-neutral-900 dark:text-white">{item.player}</span>
                                        {item.role && <span className="text-[10px] font-bold px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded uppercase tracking-wider">{item.role}</span>}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                        {item.type === 'in' && '加入'}
                                        {item.type === 'out' && '离队'}
                                        {item.type === 'bench' && '下放'}
                                        {item.type === 'role_change' && '角色调整'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
