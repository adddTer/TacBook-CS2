import { mapScore } from "./scoreMapper";

/**
 * Calculates Firepower Score (0-100) using Piecewise Scaling.
 * Target: Average ~ 50 Points.
 */
export const calculateFirepower = (
  adr: number,
  kpr: number,
  rating: number,
  roundsWithKillPct: number,
  kprWin: number,
  damageInWins: number,
  multiKillRate: number,
): number => {
  const sRating = mapScore(rating, 0.65, 0.99, 1.13, 30);
  const sAdr = mapScore(adr, 53, 72, 80, 20);
  const sKpr = mapScore(kpr, 0.41, 0.65, 0.74, 20);
  const sKprWin = mapScore(kprWin, 0.66, 0.88, 1.03, 10);
  const sMulti = mapScore(multiKillRate, 8.6, 15.3, 18.8, 10);
  const sKwk = mapScore(roundsWithKillPct, 36.2, 43.2, 49.3, 10);

  const totalScore = sRating + sAdr + sKpr + sKprWin + sMulti + sKwk;

  return Math.min(100, Math.round(totalScore));
};
