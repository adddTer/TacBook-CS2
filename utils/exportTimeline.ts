import { Match, MatchRound, MatchTimelineEvent } from '../types';
import { getWinReasonText, formatTime, getWeaponName } from '../components/review/TimelineHelpers';

export const exportTimelineToTxt = (match: Match, showDetails: boolean): void => {
    const lines: string[] = [];

    // Header
    lines.push(`Match Timeline Export`);
    lines.push(`Map: ${match.mapId}`);
    lines.push(`Date: ${match.date}`);
    lines.push(`Score: ${match.score.us} : ${match.score.them}`);
    lines.push(`----------------------------------------\n`);

    match.rounds.forEach(round => {
        // Round Header
        const winReason = getWinReasonText(round.winReason);
        const duration = formatTime(round.duration, 'elapsed');
        lines.push(`Round ${round.roundNumber} - ${round.winnerSide} Win (${winReason}) - Duration: ${duration}`);
        
        // Sort events
        const events = [...round.timeline].sort((a, b) => a.seconds - b.seconds);

        // Identify bomb plant for timer calculations
        const plantEvent = events.find(e => e.type === 'plant');
        const plantTime = plantEvent ? plantEvent.seconds : undefined;

        events.forEach(e => {
            // Filter details if needed
            if (!showDetails && e.type === 'damage') return;

            const time = formatTime(e.seconds, 'countdown', plantTime);
            const line = formatEvent(e, time);
            if (line) lines.push(line);
        });

        lines.push(`\n----------------------------------------\n`);
    });

    // Download
    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `timeline_${match.mapId}_${match.date.split('T')[0]}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const formatEvent = (e: MatchTimelineEvent, time: string): string | null => {
    const subjectName = e.subject?.name || 'Unknown';
    const targetName = e.target?.name || 'Unknown';
    const weapon = e.weapon ? getWeaponName(e.weapon) : '';

    switch (e.type) {
        case 'kill':
            let killDetails = [];
            if (e.isHeadshot) killDetails.push('Headshot');
            if (e.isWallbang) killDetails.push('Wallbang');
            if (e.isSmoke) killDetails.push('Through Smoke');
            if (e.isBlind) killDetails.push('While Blind');
            const killDetailStr = killDetails.length > 0 ? ` (${killDetails.join(', ')})` : '';
            return `${time} - ${subjectName} [${weapon}] killed ${targetName}${killDetailStr}`;

        case 'assist':
            return `${time} - ${subjectName} assisted on ${targetName}`;

        case 'flash_assist':
            return `${time} - ${subjectName} flash assisted on ${targetName}`;

        case 'damage':
            let hitgroup = '';
            if (e.hitgroup === 1) hitgroup = 'Head';
            else if (e.hitgroup === 2) hitgroup = 'Chest';
            else if (e.hitgroup === 3) hitgroup = 'Stomach';
            else if (e.hitgroup === 4 || e.hitgroup === 5) hitgroup = 'Arm';
            else if (e.hitgroup === 6 || e.hitgroup === 7) hitgroup = 'Leg';
            const hitgroupStr = hitgroup ? ` (${hitgroup})` : '';
            const weaponStr = weapon ? ` [${weapon}]` : '';
            return `${time} - ${subjectName}${weaponStr} hit ${targetName} for ${e.damage} damage${hitgroupStr}`;

        case 'plant':
            return `${time} - ${subjectName} planted the bomb`;

        case 'defuse':
            return `${time} - ${subjectName} defused the bomb`;

        case 'explode':
            return `${time} - Bomb exploded`;

        default:
            return null;
    }
};
