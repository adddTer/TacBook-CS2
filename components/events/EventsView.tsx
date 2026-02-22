import React, { useEffect, useState } from 'react';
import { HltvEvent } from '../../types/hltv';
import { fetchHltvEvents } from '../../services/hltvService';

export const EventsView: React.FC = () => {
    const [events, setEvents] = useState<HltvEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadEvents = async () => {
            try {
                const data = await fetchHltvEvents();
                setEvents(data);
            } catch (error) {
                console.error("Failed to load events", error);
            } finally {
                setLoading(false);
            }
        };
        loadEvents();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <div className="text-sm font-medium">正在加载赛事数据...</div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm font-bold tracking-wider">HLTV</span>
                    近期重要赛事
                </h2>
                <div className="text-xs font-medium text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-full">
                    数据来源: HLTV.org
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map(event => (
                    <EventCard key={event.id} event={event} />
                ))}
            </div>
        </div>
    );
};

const EventCard: React.FC<{ event: HltvEvent }> = ({ event }) => {
    const isUpcoming = event.status === 'Upcoming';
    const isOngoing = event.status === 'Ongoing';
    
    return (
        <div className="group relative bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200 dark:border-neutral-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/5 overflow-hidden">
            {/* Status Badge */}
            <div className={`absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                isOngoing ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 animate-pulse' :
                isUpcoming ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
            }`}>
                {isOngoing ? '进行中' : isUpcoming ? '即将开始' : '已结束'}
            </div>

            <div className="flex items-start gap-4">
                {/* Logo Placeholder */}
                <div className="w-16 h-16 shrink-0 bg-neutral-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center text-neutral-300 dark:text-neutral-600 font-black text-2xl">
                    {event.name.charAt(0)}
                </div>
                
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white truncate pr-16 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {event.name}
                    </h3>
                    
                    <div className="flex flex-wrap gap-y-2 gap-x-4 mt-3 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                        <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {event.startDate} - {event.endDate}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {event.location}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {event.prizePool}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
