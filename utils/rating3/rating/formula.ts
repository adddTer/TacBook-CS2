
import type { RoundContext } from "../ratingTypes";

/**
 * Calculates the Rating 4.0 for a single round based on accumulated stats.
 * Returns the final rating and the calculated impact points.
 */
export const calculateRoundRating = (stats: RoundContext, startEconomyValue: number): { rating: number, impact: number } => {
    // 1. Kill Share Rating (RTG v5.0)
    // Replaces old Kill Rating (KPR) and Damage Rating (ADR) partially
    // Baseline: 1.0 per kill distributed.
    // We scale it down to match typical Rating 1.0 scale.
    // Old Kill (25%) + Dmg (15%) = 40% weight.
    // Let's say average round has 0.75 kills. 0.75 * 1.0 = 0.75 raw score.
    // We want this to contribute about 0.4 to the final rating.
    // So factor = 0.4 / 0.75 ≈ 0.53. Let's use 0.5.
    const scoreKillShare = stats.killShareRating * 0.50;

    // 2. Survival Rating
    const scoreSurv = stats.survived ? 0.30 : 0.0;

    // 3. Impact Rating (Multi-Kill Bonus)
    // Since base kill value is handled in KillShare, this is purely for "Multi-Kill" bonus
    // Non-linear scaling for multi-kills + Entry Bonus
    let impactVal = 0;
    // Bonus only starts at 2K because 1K is covered by KillShare
    if (stats.kills === 2) impactVal = 0.5; // Bonus for 2K
    else if (stats.kills >= 3) impactVal = 1.2; // Bonus for 3K+
    
    if (stats.isEntryKill) impactVal += 0.3; // Reduced from 0.5 because Entry Kill gets full KillShare usually
    
    const scoreImpact = impactVal * 0.30;

    // 4. KAST (Consistency)
    const isKast = stats.kills > 0 || stats.assists > 0 || stats.survived || stats.traded || stats.wasTraded;
    const scoreKast = isKast ? 0.20 : 0.0;

    // 5. Economy Rating (ROI)
    const startValue = startEconomyValue + 500; 
    const valueGenerated = stats.killValue; 
    let scoreEcon = 0;
    if (valueGenerated > 0) {
            scoreEcon = Math.log2(1 + (valueGenerated / startValue)) * 0.10;
    }

    // 6. Trade Adjustment
    const tradeScore = stats.tradeBonus - stats.tradePenalty;

    // 7. WPA Rating (RTG v5.0)
    // WPA is typically -0.5 to +0.5 (stored as -50 to +50 due to SCALING=100).
    // We want good WPA to boost rating significantly.
    // Coefficient 1.0 means +20% WPA adds +0.20 to Rating.
    // FIX: Divide by 100 because stats.wpa is scaled by 100 in WPAEngine.
    const scoreWPA = (stats.wpa / 100.0) * 1.0;

    // Summation
    let roundRating = scoreKillShare + scoreSurv + scoreImpact + scoreKast + scoreEcon + tradeScore + scoreWPA;
    
    // Apply Mapping Formula: 1.83 * RTG - 0.19
    const mappedRating = (roundRating * 1.83) - 0.19;

    return {
        rating: parseFloat(mappedRating.toFixed(3)),
        impact: scoreImpact + (stats.killShareRating * 0.5) // Impact includes kill share for display
    };
};
