
import type { RoundContext } from "../ratingTypes";

/**
 * Calculates the Rating 5.0 for a single round based on accumulated stats.
 * Returns the final rating and the calculated impact points.
 */
export const calculateRoundRating = (stats: RoundContext, startEconomyValue: number): { rating: number, impact: number } => {
    // 1. Kill Share (40% Weight)
    // K is the killShareRating which now includes damage, flash, trade compensation, and economy modifier.
    // Formula: 1.0 * K - 0.25
    const K = stats.killShareRating;
    const scoreKill = 1.0 * K - 0.25;

    // 2. Multi-kill (4% Weight)
    // M = max(0, kills - 1)
    const effectiveKills = stats.kills - (stats.botKills || 0);
    const M = Math.max(0, effectiveKills - 1);
    const scoreMulti = 0.272 * M - 0.02;

    // 3. WPA (33% Weight)
    // WPA is stored as -50 to +50. We need it as -0.5 to +0.5.
    const W = stats.wpa / 100.0;
    const scoreWPA = 2.0 * W + 0.33;

    // 4. Survival (15% Weight)
    // S = 1 if survived, 0 if died
    const S = stats.survived ? 1 : 0;
    const scoreSurv = 0.588 * S - 0.05;

    // 5. KAST (8% Weight)
    // A = 1 if KAST triggered, 0 otherwise
    const isKast = effectiveKills > 0 || stats.assists > 0 || stats.survived || stats.traded || stats.wasTraded;
    const A = isKast ? 1 : 0;
    const scoreKast = 0.178 * A - 0.05;

    // Summation
    let roundRating = scoreKill + scoreMulti + scoreWPA + scoreSurv + scoreKast;

    // Global Normalization
    roundRating *= 1.16;

    // Impact calculation (for display purposes)
    // Impact focuses on multi-kills, positive WPA, and raw kill share
    const impact = scoreMulti + Math.max(0, scoreWPA - 0.33) + (K * 0.5);

    return {
        rating: parseFloat(roundRating.toFixed(3)),
        impact: parseFloat(impact.toFixed(3))
    };
};
