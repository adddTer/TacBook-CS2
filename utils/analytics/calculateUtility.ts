
/**
 * Calculates Utility Score (0-100).
 * 
 * Target: Professional Average ~ 50 Points (Easier).
 * 
 * Components (Weights Adjusted - Focus on Flash Effectiveness):
 * 1. Flash Assists per Round (35%) - Target: 0.10 FA.
 * 2. Blind Duration per Round (35%) - Target: 3.0s.
 * 3. Utility Damage per Round (20%) - Target: 25 UD.
 * 4. Utility Kills per 100 Rounds (5%) - Target: 0.04.
 * 5. Flashes Thrown per Round (5%) - Target: 1.0.
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

    // Data Integrity Check: If threw flashes but blinded no one, data is likely broken (or player is terrible, but we assume data error for fairness)
    const isFlashDataBroken = (flashesThrown > 5 && enemiesBlinded === 0) || (flashAssists > 0 && enemiesBlinded === 0);

    // 1. Flash Assists Per Round (35%) - High Impact Support
    const faPerRound = flashAssists / rounds;
    const scoreFA = (faPerRound / 0.10) * 35;

    // 2. Blind Duration Per Round (35%) - High Impact Control
    let scoreBD = 0;
    if (!isFlashDataBroken) {
        const bdPerRound = blindDuration / rounds;
        scoreBD = (bdPerRound / 3.0) * 35;
    }

    // 3. Utility Damage Per Round (20%) - Secondary Metric
    const udPerRound = utilityDamage / rounds;
    const scoreUD = (udPerRound / 25) * 20;

    // 4. Utility Kills per Round (5%)
    const ukPerRound = utilityKills / rounds;
    const scoreUK = (ukPerRound / 0.04) * 5;

    // 5. Flashes Thrown Per Round (5%) - Volume
    const ftPerRound = flashesThrown / rounds;
    const scoreFT = (ftPerRound / 1.0) * 5;

    let totalScore = scoreFA + scoreBD + scoreUD + scoreUK + scoreFT;

    // Normalize if data was broken (remove blind related weights 35%)
    // Remaining weights: 35 (FA) + 20 (UD) + 5 (UK) + 5 (FT) = 65%
    if (isFlashDataBroken) {
        totalScore = totalScore / 0.65;
    }

    return Math.round(Math.max(0, totalScore));
};
