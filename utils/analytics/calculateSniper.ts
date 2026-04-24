import { mapScore } from "./scoreMapper";

/**
 * Calculates Sniper Score (0-100) using Piecewise Scaling.
 * Target: Average ~ 50 Points.
 */
export const calculateSniper = (
  sniperKills: number,
  totalKills: number,
  roundsWithSniperKills: number,
  sniperMultiKillRounds: number,
  sniperOpeningKills: number,
  rounds: number,
): number => {
  if (rounds === 0 || totalKills === 0) return 0;

  const sniperRatio = sniperKills / totalKills;
  const scoreRatio = mapScore(sniperRatio, 0.0, 0.15, 0.35, 30); // P90 was 0.348

  const sniperKpr = sniperKills / rounds;
  const scoreKpr = mapScore(sniperKpr, 0.0, 0.10, 0.25, 30); // P90 was 0.21

  const consistency = roundsWithSniperKills / rounds;
  const scoreCons = mapScore(consistency, 0.0, 0.08, 0.18, 15); // P90 was 0.174

  const mkRate = sniperMultiKillRounds / rounds;
  const scoreMk = mapScore(mkRate, 0.0, 0.02, 0.05, 15); // P90 was ~0.02

  const opRate = sniperOpeningKills / rounds;
  const scoreOp = mapScore(opRate, 0.0, 0.015, 0.03, 10); // P90 was 0.014

  const totalScore = scoreRatio + scoreKpr + scoreCons + scoreMk + scoreOp;

  return Math.min(100, Math.round(totalScore));
};
