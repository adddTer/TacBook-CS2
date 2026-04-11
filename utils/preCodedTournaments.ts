import { Tournament } from '../types';

export const PRE_CODED_TOURNAMENTS: Tournament[] = [
    {
        id: 'iem-cologne-2026',
        title: 'IEM 科隆 Major 2026',
        tier: 'Major',
        startDate: '2026-06-02',
        endDate: '2026-06-21',
        location: '德国，科隆',
        vrsInvitationDate: '2026-04-06',
        teamsCount: 32,
        isPreCoded: true,
        prizes: [
            { placement: '1st', amount: 500000 },
            { placement: '2nd', amount: 170000 },
            { placement: '3-4th', amount: 80000 },
            { placement: '5-8th', amount: 45000 },
            { placement: '9-11th', amount: 20000 },
            { placement: '12-14th', amount: 20000 },
            { placement: '15-16th', amount: 20000 },
            { placement: '17-19th', amount: 10000 },
            { placement: '20-22th', amount: 10000 },
            { placement: '23-24th', amount: 10000 },
            { placement: '25-27th', amount: 0 },
            { placement: '28-30th', amount: 0 },
            { placement: '31-32th', amount: 0 },
        ],
        stages: [
            { 
                id: 'stage-1', 
                name: '小组赛 1', 
                format: '瑞士轮 Bo3',
                matches: [
                    { id: 'm1', team1: 'TBD', team2: 'TBD', status: 'pending' },
                    { id: 'm2', team1: 'TBD', team2: 'TBD', status: 'pending' },
                    { id: 'm3', team1: 'TBD', team2: 'TBD', status: 'pending' },
                    { id: 'm4', team1: 'TBD', team2: 'TBD', status: 'pending' },
                ]
            },
            { 
                id: 'stage-2', 
                name: '小组赛 2', 
                format: '瑞士轮 Bo3',
                matches: [
                    { id: 'm5', team1: 'TBD', team2: 'TBD', status: 'pending' },
                    { id: 'm6', team1: 'TBD', team2: 'TBD', status: 'pending' },
                ]
            },
            { 
                id: 'stage-3', 
                name: '小组赛 3', 
                format: '瑞士轮 Bo3',
                matches: [
                    { id: 'm7', team1: 'TBD', team2: 'TBD', status: 'pending' },
                ]
            },
            { 
                id: 'stage-4', 
                name: '淘汰赛', 
                format: '单败淘汰 Bo3\n- 总决赛 Bo5',
                matches: [
                    { id: 'qf1', team1: 'TBD', team2: 'TBD', status: 'pending', date: '1/4 决赛' },
                    { id: 'qf2', team1: 'TBD', team2: 'TBD', status: 'pending', date: '1/4 决赛' },
                    { id: 'qf3', team1: 'TBD', team2: 'TBD', status: 'pending', date: '1/4 决赛' },
                    { id: 'qf4', team1: 'TBD', team2: 'TBD', status: 'pending', date: '1/4 决赛' },
                    { id: 'sf1', team1: 'TBD', team2: 'TBD', status: 'pending', date: '半决赛' },
                    { id: 'sf2', team1: 'TBD', team2: 'TBD', status: 'pending', date: '半决赛' },
                    { id: 'f1', team1: 'TBD', team2: 'TBD', status: 'pending', date: '总决赛' },
                ]
            },
        ]
    }
];

// Calculate total prize pool dynamically
PRE_CODED_TOURNAMENTS.forEach(t => {
    if (t.prizes) {
        let total = 0;
        t.prizes.forEach(p => {
            // Parse placement to see how many teams get this prize
            // e.g., "3-4th" means 2 teams, "5-8th" means 4 teams
            let count = 1;
            if (p.placement.includes('-')) {
                const parts = p.placement.replace('th', '').replace('st', '').replace('nd', '').replace('rd', '').split('-');
                if (parts.length === 2) {
                    count = parseInt(parts[1]) - parseInt(parts[0]) + 1;
                }
            }
            total += p.amount * count;
        });
        t.prizePool = total;
    }
});
