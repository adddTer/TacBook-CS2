
export interface RosterChange {
    date: string;
    type: 'in' | 'out' | 'bench';
    player: string;
    role?: string;
}

export const ROSTER_HISTORY: RosterChange[] = [
    { date: '2026-02-24', type: 'bench', player: 'F1oyd', role: '狙击手' },
    { date: '2026-02-24', type: 'bench', player: 'Sanatio', role: '突破手' },
];
