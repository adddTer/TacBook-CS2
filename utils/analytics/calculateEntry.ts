import { mapScore } from "./scoreMapper";

/**
 * Calculates Entry (Sacrifice) Score (0-100) using Piecewise Scaling.
 * Target: Average ~ 50 Points.
 */
export const calculateEntry = (
  tradedDeaths: number,
  openingDeaths: number,
  openingDeathsTraded: number,
  totalDeaths: number,
  savedByTeammate: number,
  assists: number,
  supportRounds: number,
  rounds: number,
): number => {
  if (rounds === 0) return 0;

  const odTradeRate = openingDeaths > 0 ? openingDeathsTraded / openingDeaths : 0;
  const scoreODT = mapScore(odTradeRate, 0.0, 0.31, 0.50, 30); // P10 0.0, P50 0.31, P90 0.50

  const tdRate = totalDeaths > 0 ? tradedDeaths / totalDeaths : 0;
  const scoreTDPct = mapScore(tdRate, 0.20, 0.276, 0.36, 20); // P10 0.20, P50 0.276, P90 0.36

  const tradedDeathPerRound = tradedDeaths / rounds;
  const scoreTDPR = mapScore(tradedDeathPerRound, 0.12, 0.18, 0.27, 20); // P10 0.12, P50 0.18, P90 0.27

  const savedRate = savedByTeammate / rounds;
  const scoreSaved = mapScore(savedRate, 0.14, 0.21, 0.29, 15); // P10 0.14, P50 0.21, P90 0.29

  const suppRoundRate = supportRounds / rounds;
  const scoreSupp = mapScore(suppRoundRate, 0.10, 0.26, 0.66, 15); // Adjusted P50 to 0.26

  const totalScore = scoreODT + scoreTDPct + scoreTDPR + scoreSaved + scoreSupp;
  return Math.min(100, Math.round(totalScore));
};
