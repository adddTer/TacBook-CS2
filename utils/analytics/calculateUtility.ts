import { mapScore } from "./scoreMapper";

/**
 * Calculates Utility Score (0-100) using Piecewise Scaling.
 * Target: Average ~ 50 Points.
 */
export const calculateUtility = (
  utilityDamage: number,
  flashAssists: number,
  utilityKills: number,
  flashesThrown: number,
  blindDuration: number,
  enemiesBlinded: number,
  rounds: number,
): number => {
  if (rounds === 0) return 0;

  const isFlashDataBroken =
    (flashesThrown > 5 && enemiesBlinded === 0) ||
    (flashAssists > 0 && enemiesBlinded === 0);

  const faPerRound = flashAssists / rounds;
  const scoreFA = mapScore(faPerRound, 0, 0.04, 0.08, 30); // mean 0.04 FA/round

  let scoreBD = 0;
  if (!isFlashDataBroken) {
    const bdPerRound = blindDuration / rounds;
    scoreBD = mapScore(bdPerRound, 0, 1.2, 2.0, 30); // mean ~1.2s per round
  }

  const udPerRound = utilityDamage / rounds;
  const scoreUD = mapScore(udPerRound, 5, 18, 25, 30); // mean 18 UD/round

  const ukPerRound = utilityKills / rounds;
  const scoreUK = mapScore(ukPerRound, 0, 0.015, 0.03, 5);

  const ftPerRound = flashesThrown / rounds;
  // Make ftPerRound map start around 0.1, to not give baseline points for 0 flashes.
  const scoreFT = mapScore(ftPerRound, 0.1, 0.6, 1.0, 5);

  let totalScore = scoreFA + scoreBD + scoreUD + scoreUK + scoreFT;

  if (isFlashDataBroken) {
    totalScore = totalScore / 0.70;
  }

  return Math.min(100, Math.round(totalScore));
};
