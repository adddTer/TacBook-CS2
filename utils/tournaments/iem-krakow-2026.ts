import { Tournament } from "../../types";

export const iemKrakow2026: Tournament = {
    id: "iem-krakow-2026",
    title: "Intel Extreme Masters Kraków 2026",
    tier: "S-Tier",
    startDate: "2026-01-28",
    endDate: "2026-02-08",
    location: "Kraków, Poland",
    isPreCoded: true,
    prizePool: 1000000,
    stages: [
        {
            id: "stage-playoffs",
            name: "Playoffs",
            format: "单败淘汰 Bo3\n- 总决赛 Bo5",
            matches: [
                {
                    id: "gf",
                    team1: "Team Vitality",
                    team2: "Team Spirit",
                    score1: 3,
                    score2: 0,
                    status: "completed",
                    bestOf: 5
                }
            ]
        }
    ]
};
