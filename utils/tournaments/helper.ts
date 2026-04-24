import { TournamentStageMatch } from "../../types";

export const generateSwissMatches = (stagePrefix: string): TournamentStageMatch[] => {
    const matches: TournamentStageMatch[] = [];
    const pushM = (label: string, count: number, isBo3: boolean) => {
        for(let i=0; i<count; i++) {
            matches.push({
                id: `${stagePrefix}-${label}-${i+1}`,
                team1: 'TBD', team2: 'TBD',
                status: 'pending',
                groupLabel: label,
                bestOf: isBo3 ? 3 : 1
            });
        }
    };
    
    // Round 1
    pushM('0-0', 8, false);
    // Round 2
    pushM('1-0', 4, false);
    pushM('0-1', 4, false);
    // Round 3
    pushM('2-0', 2, true);
    pushM('1-1', 4, false);
    pushM('0-2', 2, true);
    // Round 4
    pushM('2-1', 3, true);
    pushM('1-2', 3, true);
    // Round 5
    pushM('2-2', 3, true);
    
    return matches;
};
