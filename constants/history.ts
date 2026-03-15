
export interface RosterChange {
    date: string;
    type: 'in' | 'out' | 'bench' | 'role_change';
    player: string;
    role?: string;
}

export const ROSTER_HISTORY: RosterChange[] = [
    { date: '2026-03-14', type: 'bench', player: 'FuNct1on', role: '道具手' },
    { date: '2026-03-14', type: 'role_change', player: 'addd', role: '指挥/自由人' },
    { date: '2026-03-14', type: 'in', player: 'YinDaoMaYi', role: '补枪手' },
    { date: '2026-03-14', type: 'bench', player: 'electronics', role: '自由人' },
    { date: '2026-02-28', type: 'in', player: 'R1kaN', role: '突破手' },
    { date: '2026-02-28', type: 'in', player: 'electronics', role: '自由人' },
    { date: '2026-02-28', type: 'role_change', player: 'Ser1EN', role: '狙击手' },
    { date: '2026-02-28', type: 'role_change', player: 'addd', role: '指挥' },
    { date: '2026-02-24', type: 'bench', player: 'F1oyd', role: '狙击手' },
    { date: '2026-02-24', type: 'bench', player: 'Sanatio', role: '突破手' },
    { date: '2026-02-07', type: 'in', player: 'addd', role: '指挥/自由人' },
    { date: '2026-02-07', type: 'in', player: 'FuNct1on', role: '道具手' },
    { date: '2026-02-07', type: 'in', player: 'Ser1EN', role: '补枪手' },
    { date: '2026-02-07', type: 'in', player: 'Sanatio', role: '突破手' },
    { date: '2026-02-07', type: 'in', player: 'F1oyd', role: '狙击手' },
];
