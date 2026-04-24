import { Tournament } from "../../types";

export const pglBucharest2026: Tournament = {
    id: "pgl-bucharest-2026",
    title: "PGL Bucharest 2026",
    tier: "S-Tier",
    startDate: "2026-04-04",
    endDate: "2026-04-11",
    location: "Bucharest, Romania",
    isPreCoded: true,
    prizePool: 1250000,
    stages: [
        {
            id: "stage-playoffs",
            name: "Playoffs",
            format: "单败淘汰 Bo3",
            matches: [
                {
                    id: "gf",
                    team1: "FUT",
                    team2: "Astralis",
                    score1: 0,
                    score2: 0,
                    status: "completed",
                    bestOf: 3
                }
            ]
        }
    ]
};
