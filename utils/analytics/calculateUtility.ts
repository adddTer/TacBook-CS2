
/**
 * Calculates Utility Score (0-100).
 * 
 * Target: Professional Average ~ 45 Points.
 * 
 * Components:
 * 1. Utility Damage per Round (30%) - Target: 55 UD (Avg ~20 -> 36pts)
 * 2. Flash Assists per Round (30%) - Target: 0.20 FA (Avg ~0.08 -> 40pts)
 * 3. Blind Duration per Round (20%) - Target: 5.0s (Avg ~2.5s -> 50pts)
 * 4. Utility Kills per 100 Rounds (10%) - Target: 0.12 (Avg ~0.05 -> 41pts)
 * 5. Flashes Thrown per Round (10%) - Target: 2.0 (Avg ~1.0 -> 50pts)
 */
export const calculateUtility = (
    utilityDamage: number, 
    flashAssists: number, 
    utilityKills: number,
    flashesThrown: number,
    blindDuration: number,
    enemiesBlinded: number,
    rounds: number
): number => {
    if (rounds === 0) return 0;

    // Data Integrity Check
    const isFlashDataBroken = (flashesThrown > 5 && enemiesBlinded === 0) || (flashAssists > 0 && enemiesBlinded === 0);

    // 1. Utility Damage Per Round (30%)
    const udPerRound = utilityDamage / rounds;
    const scoreUD = (udPerRound / 55) * 30;

    // 2. Flash Assists Per Round (30%)
    const faPerRound = flashAssists / rounds;
    const scoreFA = (faPerRound / 0.20) * 30;

    // 3. Blind Duration Per Round (20%)
    let scoreBD = 0;
    if (!isFlashDataBroken) {
        const bdPerRound = blindDuration / rounds;
        scoreBD = (bdPerRound / 5.0) * 20;
    }

    // 4. Utility Kills per Round (10%)
    const ukPerRound = utilityKills / rounds;
    const scoreUK = (ukPerRound / 0.12) * 10;

    // 5. Flashes Thrown Per Round (10%)
    const ftPerRound = flashesThrown / rounds;
    const scoreFT = (ftPerRound / 2.0) * 10;

    let totalScore = scoreUD + scoreFA + scoreBD + scoreUK + scoreFT;

    // Normalize if data was broken
    if (isFlashDataBroken) {
        totalScore = totalScore / 0.80;
    }

    return Math.round(Math.max(0, Math.min(100, totalScore)));
};
