
/**
 * Calculates Sniper Score (0-100).
 * 
 * Target: Dedicated AWPer ~80, Hybrid ~45, Rifler ~0.
 * Adjusted: Stricter thresholds (Raised).
 * 
 * Components:
 * 1. Sniper Ratio (30%): Target 0.90 (Harder)
 * 2. Sniper KPR (30%): Target 0.80 (Harder)
 * 3. Rounds w/ Sniper Kill % (15%): Target 60% (Harder)
 * 4. Multi-Kill Rounds (15%): Target 30% (Harder)
 * 5. Opening Kills (10%): Target 0.25 (Harder)
 */
export const calculateSniper = (
    sniperKills: number, 
    totalKills: number, 
    roundsWithSniperKills: number,
    sniperMultiKillRounds: number,
    sniperOpeningKills: number,
    rounds: number
): number => {
    if (rounds === 0 || totalKills === 0) return 0;
    
    // 1. Sniper Ratio (30%)
    const sniperRatio = sniperKills / totalKills; 
    const scoreRatio = (sniperRatio / 0.90) * 30;

    // 2. Sniper KPR (30%)
    const sniperKpr = sniperKills / rounds;
    const scoreKpr = (sniperKpr / 0.80) * 30;

    // 3. Consistency (15%)
    const consistency = roundsWithSniperKills / rounds;
    const scoreCons = (consistency / 0.60) * 15;

    // 4. Multi-Kill (15%)
    const mkRate = sniperMultiKillRounds / rounds;
    const scoreMk = (mkRate / 0.30) * 15; 

    // 5. Opening (10%)
    const opRate = sniperOpeningKills / rounds;
    const scoreOp = (opRate / 0.25) * 10;

    const totalScore = scoreRatio + scoreKpr + scoreCons + scoreMk + scoreOp;

    return Math.round(Math.max(0, totalScore));
};
