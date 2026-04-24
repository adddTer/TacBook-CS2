import { mapScore } from "./scoreMapper";

/**
 * Calculates Clutch Score (0-100) using Piecewise Scaling.
 * Target: Average ~ 50 Points.
 */
export const calculateClutch = (
  clutchPoints: number,
  w1v1: number,
  l1v1: number,
  roundsLastAlive: number,
  totalTimeAlive: number,
  savesInLosses: number,
  roundsLost: number,
  rounds: number,
): number => {
  if (rounds === 0) return 0;

  const cpPerRound = clutchPoints / rounds;
  const scoreCP = mapScore(cpPerRound, 0, 0.014, 0.054, 50); // P10 0, P50 0.014, P90 0.054

  const total1v1 = w1v1 + l1v1;
  let scoreWinRate = 0;
  let weightTotal = 50 + 10 + 5 + 5; // CP(50) + LastAlive(10) + Time(5) + Save(5)

  if (total1v1 > 0) {
    const winRate = w1v1 / total1v1;
    scoreWinRate = mapScore(winRate, 0.33, 0.666, 0.85, 30); // P50 0.666, adjusted good/min
    weightTotal += 30; 
  }

  const lastAliveRate = roundsLastAlive / rounds;
  const scoreLastAlive = mapScore(lastAliveRate, 0.03, 0.10, 0.146, 10); // P10 0.03, P50 0.10, P90 0.146

  const avgTimeAlive = totalTimeAlive / rounds;
  const scoreTime = mapScore(avgTimeAlive, 66, 77.5, 82.6, 5); // P10 66, P50 77.5, P90 82.6

  const saveRate = roundsLost > 0 ? savesInLosses / roundsLost : 0;
  const scoreSave = mapScore(saveRate, 0.046, 0.088, 0.155, 5); // P10 0.046, P50 0.088, P90 0.155

  const rawTotalScore = scoreCP + scoreWinRate + scoreLastAlive + scoreTime + scoreSave;
  const finalScore = (rawTotalScore / weightTotal) * 100;

  return Math.min(100, Math.round(finalScore));
};
