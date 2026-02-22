export interface HltvEvent {
    id: string;
    name: string;
    logoUrl: string;
    startDate: string;
    endDate: string;
    prizePool: string;
    location: string;
    type: 'Lan' | 'Online';
    stars: number; // 1-5 stars
    teams: number;
    status: 'Upcoming' | 'Ongoing' | 'Completed';
}

export interface HltvMatch {
    id: string;
    team1: { name: string; logoUrl: string; score?: number };
    team2: { name: string; logoUrl: string; score?: number };
    event: { name: string; logoUrl: string };
    time: string;
    stars: number;
    format: string; // BO1, BO3, etc.
}
