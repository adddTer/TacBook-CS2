import { Tournament } from '../types';
import { ALL_PRE_CODED_TOURNAMENTS } from './tournaments';

export const PRE_CODED_TOURNAMENTS: Tournament[] = ALL_PRE_CODED_TOURNAMENTS;

// 动态计算总奖金池
PRE_CODED_TOURNAMENTS.forEach(t => {
    if (t.prizes) {
        let total = 0;
        t.prizes.forEach(p => {
            let count = 1;
            if (p.placement.includes('-')) {
                const parts = p.placement.replace('th', '').replace('st', '').replace('nd', '').replace('rd', '').split('-');
                if (parts.length === 2) {
                    count = parseInt(parts[1]) - parseInt(parts[0]) + 1;
                }
            }
            total += p.amount * count;
        });
        t.prizePool = total;
    }
});