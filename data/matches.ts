
import { Match } from '../types';

export const MATCH_HISTORY: Match[] = [
    {
        id: '9223266999097414540',
        date: '2026-01-24T19:28:59',
        mapId: 'mirage',
        rank: 'B+',
        result: 'WIN',
        startingSide: 'CT', // We (Bottom team) started CT (Blue 9)
        score: {
            us: 13,
            them: 3,
            half1_us: 9,
            half1_them: 3,
            half2_us: 4,
            half2_them: 0
        },
        // Our Team (Winning Team - Bottom of screenshot)
        players: [
            { 
                playerId: '用户3123265', rank: 'B++', // Gold (MVP)
                kills: 18, deaths: 9, assists: 2, adr: 99, hsRate: 36, rating: 1.49, we: 12.6
            },
            { 
                playerId: 'addd_233', rank: 'B+', 
                kills: 15, deaths: 9, assists: 5, adr: 92, hsRate: 33, rating: 1.41, we: 11.2
            },
            { 
                playerId: '萨丝给', rank: 'B+', 
                kills: 13, deaths: 14, assists: 6, adr: 99, hsRate: 31, rating: 1.33, we: 10.2
            },
            { 
                playerId: 'mcdoug驱砂四...', rank: 'B+', 
                kills: 11, deaths: 11, assists: 5, adr: 73, hsRate: 45, rating: 1.10, we: 9.1
            },
            { 
                playerId: 'KOSAKA', rank: 'B+', 
                kills: 11, deaths: 12, assists: 4, adr: 75, hsRate: 36, rating: 1.04, we: 8.3
            }
        ],
        // Enemy Team (Losing Team - Top of screenshot)
        enemyPlayers: [
            { 
                playerId: '顺水啊.', rank: 'B+', // Blue (SVP) - Gold B+ is B++ rank, irrelevant to SVP
                kills: 17, deaths: 14, assists: 5, adr: 122, hsRate: 63, rating: 1.52, we: 11.1
            },
            { 
                playerId: '用户1628067', rank: 'B+', 
                kills: 11, deaths: 14, assists: 3, adr: 71, hsRate: 56, rating: 1.00, we: 8.5
            },
            { 
                playerId: '用户7980499', rank: 'B+', 
                kills: 14, deaths: 14, assists: 1, adr: 84, hsRate: 71, rating: 1.18, we: 6.8
            },
            { 
                playerId: '秋神GD', rank: 'B+', 
                kills: 9, deaths: 13, assists: 3, adr: 72, hsRate: 56, rating: 0.90, we: 6.2
            },
            { 
                playerId: 'CWWW', rank: 'B+', 
                kills: 4, deaths: 14, assists: 1, adr: 29, hsRate: 75, rating: 0.45, we: 3.9
            }
        ]
    }
];
