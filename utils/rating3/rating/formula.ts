
import { RoundContext } from "../types";

/**
 * Calculates the Rating 4.0 for a single round based on accumulated stats.
 * Returns the final rating and the calculated impact points.
 */
export const calculateRoundRating = (stats: RoundContext, startEconomyValue: number): { rating: number, impact: number } => {
    // 1. Kill Rating
    // Baseline 0.75 KPR roughly equals average performance
    const scoreKill = (stats.kills / 0.75) * 0.25;

    // 2. Survival Rating
    const scoreSurv = stats.survived ? 0.30 : 0.0;

    // 3. Damage Rating
    // Baseline 80 ADR
    const scoreDmg = (stats.damage / 80.0) * 0.15;
    
    // 4. Impact Rating
    // Non-linear scaling for multi-kills + Entry Bonus
    let impactVal = 0;
    if (stats.kills === 1) impactVal = 1.0;
    else if (stats.kills === 2) impactVal = 2.2;
    else if (stats.kills >= 3) impactVal = 3.5;
    
    if (stats.isEntryKill) impactVal += 0.5;
    
    const scoreImpact = (impactVal / 1.3) * 0.25;

    // 5. KAST (Consistency)
    const isKast = stats.kills > 0 || stats.assists > 0 || stats.survived || stats.traded || stats.wasTraded;
    const scoreKast = isKast ? 0.20 : 0.0;

    // 6. Economy Rating (ROI)
    // Measures value generated (kills) vs value invested
    const startValue = startEconomyValue + 500; // Add 500 base to avoid skew on pistols
    const valueGenerated = stats.killValue; 
    let scoreEcon = 0;
    if (valueGenerated > 0) {
            scoreEcon = Math.log2(1 + (valueGenerated / startValue)) * 0.10;
    }

    // 7. Trade Adjustment
    const tradeScore = stats.tradeBonus - stats.tradePenalty;

    // Summation
    let roundRating = scoreKill + scoreSurv + scoreDmg + scoreImpact + scoreKast + scoreEcon + tradeScore;
    
    return {
        rating: parseFloat(roundRating.toFixed(3)),
        impact: scoreImpact
    };
};
