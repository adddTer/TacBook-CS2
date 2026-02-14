
/**
 * Calculates Sniper Score (0-100).
 * 
 * Target: Dedicated AWPer ~80, Hybrid ~45, Rifler ~0.
 * 
 * Components:
 * 1. Sniper KPR (30%): Target 0.60 (Dedicated AWPer lvl)
 * 2. Sniper Kill % (30%): Target 80%
 * 3. Rounds w/ Sniper Kill % (15%): Target 40%
 * 4. Multi-Kill Rounds (15%): Target 20%
 * 5. Opening Kills (10%): Target 0.15
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
    const scoreRatio = (sniperRatio / 0.80) * 30;

    // 2. Sniper KPR (30%)
    // Avg AWPer is usually 0.35-0.45
    const sniperKpr = sniperKills / rounds;
    const scoreKpr = (sniperKpr / 0.60) * 30;

    // 3. Consistency (15%)
    const consistency = roundsWithSniperKills / rounds;
    const scoreCons = (consistency / 0.40) * 15;

    // 4. Multi-Kill (15%)
    const mkRate = sniperMultiKillRounds / rounds;
    const scoreMk = (mkRate / 0.20) * 15; 

    // 5. Opening (10%)
    const opRate = sniperOpeningKills / rounds;
    const scoreOp = (opRate / 0.15) * 10;

    const totalScore = scoreRatio + scoreKpr + scoreCons + scoreMk + scoreOp;

    return Math.round(Math.max(0, Math.min(100, totalScore)));
};
