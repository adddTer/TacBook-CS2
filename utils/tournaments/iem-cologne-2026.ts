import { Tournament } from "../../types";
import { generateSwissMatches } from "./helper";

export const iemCologne2026: Tournament = {
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
            name: 'Stage 1', 
            format: '瑞士轮 Bo3',
            matches: generateSwissMatches('s1')
        },
        { 
            id: 'stage-2', 
            name: 'Stage 2', 
            format: '瑞士轮 Bo3',
            matches: generateSwissMatches('s2')
        },
        { 
            id: 'stage-3', 
            name: 'Stage 3', 
            format: '瑞士轮 Bo3',
            matches: generateSwissMatches('s3')
        },
        { 
            id: 'stage-4', 
            name: '淘汰赛', 
            format: '单败淘汰 Bo3\n- 总决赛 Bo5',
            matches: [
                { id: 'qf1', team1: 'TBD', team2: 'TBD', status: 'pending' },
                { id: 'qf2', team1: 'TBD', team2: 'TBD', status: 'pending' },
                { id: 'qf3', team1: 'TBD', team2: 'TBD', status: 'pending' },
                { id: 'qf4', team1: 'TBD', team2: 'TBD', status: 'pending' },
                { id: 'sf1', team1: 'TBD', team2: 'TBD', status: 'pending' },
                { id: 'sf2', team1: 'TBD', team2: 'TBD', status: 'pending' },
                { id: 'f1', team1: 'TBD', team2: 'TBD', status: 'pending', bestOf: 5 },
            ]
        },
    ]
};
