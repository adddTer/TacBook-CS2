import { TeamProfile } from '../types';

const teamModules = import.meta.glob('../data/teams/*.json', { eager: true });

export const getTeams = (): TeamProfile[] => {
    const teams: TeamProfile[] = [];
    for (const path in teamModules) {
        const mod = teamModules[path] as any;
        const data = mod.default || mod;
        if (Array.isArray(data)) {
            teams.push(...data);
        } else {
            teams.push(data);
        }
    }
    return teams;
};

export const getAllPlayers = (): import('../types').PlayerProfile[] => {
    const teams = getTeams();
    const players: import('../types').PlayerProfile[] = [];
    teams?.forEach(team => {
        team.players?.forEach(p => {
            if (!players.find(existing => existing.id === p.id)) {
                players.push(p);
            }
        });
    });
    return players;
};
