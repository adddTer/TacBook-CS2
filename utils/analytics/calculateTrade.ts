import { mapScore, inverseMapScore } from "./scoreMapper";

/**
 * Calculates Trade Score (0-100) using Piecewise Scaling.
 * Target: Average ~ 50 Points.
 */
export const calculateTrade = (
  tradeKills: number,
  totalKills: number,
  damage: number,
  teammatesSaved: number,
  assists: number,
  rounds: number,
): number => {
  if (rounds === 0) return 0;

  const tkpr = tradeKills / rounds;
  const scoreTKPR = mapScore(tkpr, 0.10, 0.135, 0.20, 35); // P10 0.10, P50 0.135, P90 0.20

  const tkRate = totalKills > 0 ? tradeKills / totalKills : 0;
  const scoreTKRate = mapScore(tkRate, 0.176, 0.226, 0.292, 25); // P10 0.176, P50 0.226, P90 0.292

  const savedRate = teammatesSaved / rounds;
  const scoreSaved = mapScore(savedRate, 0.058, 0.128, 0.176, 20); // P10 0.058, P50 0.128, P90 0.176

  const dpk = totalKills > 0 ? damage / totalKills : 100;
  // DPK is reversed: lower is better. Default uses maxPoor=118, mean=112, good=100
  const scoreDPK = inverseMapScore(dpk, 118, 112, 100, 10); 

  const assistRatio = totalKills > 0 ? assists / totalKills : 0;
  const scoreAssist = mapScore(assistRatio, 0.20, 0.325, 0.55, 10); // P10 0.20, P50 0.325, P90 0.55

  const totalScore = scoreTKPR + scoreTKRate + scoreSaved + scoreDPK + scoreAssist;

  return Math.min(100, Math.round(totalScore));
};
