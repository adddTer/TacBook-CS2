
import { ROSTER_HISTORY } from '../constants/history';

/**
 * Calculates the tenure (time in team) for a player based on ROSTER_HISTORY.
 * Returns a human-readable string like "23 天" or "1 个月 5 天".
 */
export const calculateTenure = (playerName: string): string => {
    // Find all events for this player, sorted by date ascending
    const playerEvents = ROSTER_HISTORY
        .filter(e => e.player === playerName)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (playerEvents.length === 0) return '未知';

    // Find the last 'in' event that hasn't been followed by an 'out'
    let lastInDate: Date | null = null;
    let isActive = false;

    playerEvents.forEach(event => {
        if (event.type === 'in') {
            lastInDate = new Date(event.date);
            isActive = true;
        } else if (event.type === 'out') {
            isActive = false;
        }
    });

    if (!isActive || !lastInDate) return '已离队';

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastInDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
        return `${diffDays} 天`;
    } else {
        const months = Math.floor(diffDays / 30);
        const remainingDays = diffDays % 30;
        if (remainingDays === 0) return `${months} 个月`;
        return `${months} 个月 ${remainingDays} 天`;
    }
};

/**
 * Returns raw days in team for visual indicators.
 */
export const getRawTenureDays = (playerName: string): number => {
    const playerEvents = ROSTER_HISTORY
        .filter(e => e.player === playerName)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (playerEvents.length === 0) return 0;

    let lastInDate: Date | null = null;
    let isActive = false;

    playerEvents.forEach(event => {
        if (event.type === 'in') {
            lastInDate = new Date(event.date);
            isActive = true;
        } else if (event.type === 'out') {
            isActive = false;
        }
    });

    if (!isActive || !lastInDate) return 0;

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastInDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
