import { mapScore } from "./scoreMapper";

/**
 * Calculates Opening Score (0-100) using Piecewise Scaling.
 * Target: Average ~ 50 Points.
 */
export const calculateOpening = (
  openingKills: number,
  openingDeaths: number,
  roundsWonAfterEntry: number,
  rounds: number,
): number => {
  if (rounds === 0) return 0;

  const attempts = openingKills + openingDeaths;
  
  const successRate = attempts > 0 ? openingKills / attempts : 0;
  const scoreSuccess = mapScore(successRate, 0.30, 0.444, 0.60, 30); // P10 0.30, P50 0.444, P90 0.60

  const attemptRate = attempts / rounds;
  const scoreAttempts = mapScore(attemptRate, 0.108, 0.203, 0.27, 30); // P10 0.108, P50 0.203, P90 0.27

  const okpr = openingKills / rounds;
  const scoreOKPR = mapScore(okpr, 0.029, 0.092, 0.125, 25); // P10 0.029, P50 0.092, P90 0.125

  const winRate = openingKills > 0 ? roundsWonAfterEntry / openingKills : 0;
  const scoreWinRate = mapScore(winRate, 0.434, 0.68, 0.875, 15); // P10 0.434, P50 0.68, P90 0.875

  const totalScore = scoreSuccess + scoreAttempts + scoreOKPR + scoreWinRate;

  return Math.min(100, Math.round(totalScore));
};
