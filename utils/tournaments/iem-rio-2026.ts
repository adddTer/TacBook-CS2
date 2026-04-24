import { Tournament } from "../../types";

export const iemRio2026: Tournament = {
    id: "iem-rio-2026",
    title: "Intel Extreme Masters Rio 2026",
    tier: "S-Tier",
    startDate: "2026-04-13",
    endDate: "2026-04-19",
    location: "Rio de Janeiro, Brazil",
    isPreCoded: true,
    prizePool: 300000,
    stages: [
        {
            id: "stage-1-groups",
            name: "Group Stage",
            format: "双败淘汰",
            matches: [
                {
                    id: "tbd-match",
                    team1: "TBD",
                    team2: "TBD",
                    score1: 0,
                    score2: 0,
                    status: "live",
                    bestOf: 3
                }
            ]
        }
    ]
};
