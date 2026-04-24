import { Tournament } from "../../types";

export const eslProLeagueS23: Tournament = {
    id: "esl-pro-league-s23",
    title: "ESL Pro League Season 23",
    tier: "S-Tier",
    startDate: "2026-02-27",
    endDate: "2026-03-15",
    location: "Stockholm, Sweden",
    isPreCoded: true,
    prizePool: 275000,
    stages: [
        {
            id: "stage-playoffs",
            name: "Playoffs",
            format: "单败淘汰",
            matches: [
                {
                    id: "gf",
                    team1: "Natus Vincere",
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
