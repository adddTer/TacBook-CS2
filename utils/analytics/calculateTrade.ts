
/**
 * Calculates Trade Score (0-100).
 * 
 * Target: Professional Average ~ 45 Points.
 * 
 * Components:
 * 1. Trade Kills per Round (35%): Target 0.25 (Avg ~0.11 -> 44pts)
 * 2. Trade Kills % (25%): Target 35% (Avg ~18% -> 32pts)
 * 3. Saved Teammate per Round (20%): Target 0.20 (Avg ~0.08 -> 40pts)
 * 4. Damage per Kill (10%): Target <80.
 * 5. Assist Ratio (10%): Target 0.50 (Avg ~0.25 -> 50pts)
 */
export const calculateTrade = (
    tradeKills: number, 
    totalKills: number,
    damage: number,
    teammatesSaved: number,
    assists: number,
    rounds: number
): number => {
    if (rounds === 0) return 0;

    // 1. Trade Kills per Round (35%)
    const tkpr = tradeKills / rounds;
    const scoreTKPR = (tkpr / 0.25) * 35;

    // 2. Trade Kill % (25%)
    const tkRate = totalKills > 0 ? tradeKills / totalKills : 0;
    const scoreTKRate = (tkRate / 0.35) * 25;

    // 3. Saved Teammate per Round (20%)
    const savedRate = teammatesSaved / rounds;
    const scoreSaved = (savedRate / 0.20) * 20;

    // 4. Damage per Kill (10%)
    // Efficient killers (low dmg/kill) trade better. 
    // <80 = Max Score. 100 = 50% Score.
    const dpk = totalKills > 0 ? damage / totalKills : 100;
    let scoreDPK = 0;
    if (dpk <= 80) scoreDPK = 10;
    else if (dpk >= 120) scoreDPK = 0;
    else scoreDPK = 10 * ((120 - dpk) / 40);

    // 5. Assist Ratio (10%)
    const assistRatio = totalKills > 0 ? assists / totalKills : 0;
    const scoreAssist = (assistRatio / 0.50) * 10;

    const totalScore = scoreTKPR + scoreTKRate + scoreSaved + scoreDPK + scoreAssist;

    return Math.round(Math.max(0, Math.min(100, totalScore)));
};
