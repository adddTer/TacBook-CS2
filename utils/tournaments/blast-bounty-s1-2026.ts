import { Tournament } from "../../types";

export const blastBountyS12026: Tournament = {
    id: "blast-bounty-s1-2026",
    title: "BLAST Premier Bounty Season 1 2026",
    tier: "S-Tier",
    startDate: "2026-01-13",
    endDate: "2026-01-25",
    location: "Malta",
    isPreCoded: true,
    stages: [
        {
            id: "stage-2-playoffs",
            name: "Playoffs",
            format: "单败淘汰 Bo3\n- 总决赛 Bo5",
            matches: [
                {
                    id: "gf",
                    team1: "PARIVISION",
                    team2: "TBD",
                    score1: 0,
                    score2: 0,
                    status: "completed",
                    bestOf: 5
                }
            ]
        }
    ]
};
