import { Match } from "../../types";
import { MatchAggregator } from "./matchAggregator";

export interface GlobalStats {
  avgRating: number;
  avgWpa: number;
  avgAdr: number;
  avgKpr: number;
  avgDpr: number;
  avgKast: number;
  avgMultiKillRate: number;
  avgHsPct: number;

  avgScoreFirepower: number;
  avgScoreEntry: number;
  avgScoreTrade: number;
  avgScoreOpening: number;
  avgScoreClutch: number;
  avgScoreSniper: number;
  avgScoreUtility: number;

  details: Record<string, number>;
  totalPlayers: number;
  totalRounds: number;

  totalPlayerRounds: number;
  totalAssists: number;
  totalDamage: number;
  totalHeadshots: number;
  entrySuccess: number;
  survivalRate: number;
  tradeSuccess: number;

  multiKills: {
    k0: number;
    k1: number;
    k2: number;
    k3: number;
    k4: number;
    k5: number;
  };
  ratingDist: {
    r0_5: number;
    r0_8: number;
    r1_05: number;
    r1_3: number;
    r1_5: number;
    rMax: number;
  };
  wpaDist: {
    w_neg10: number;
    w_0: number;
    w_10: number;
    w_20: number;
    w_max: number;
  };

  kastDist: number[];
  killsDist: number[];
  deathsDist: number[];

  kastPercentile: number;
  killsPercentile: number;
  deathsPercentile: number;
}

export function calculateGlobalStats(allMatches: Match[]): GlobalStats | null {
  if (!allMatches || allMatches.length === 0) return null;

  const aggregated = MatchAggregator.aggregateFull(allMatches);

  let totalRounds = 0;
  let sumRating = 0;
  let sumWpa = 0;
  let sumAdr = 0;
  let sumKpr = 0;
  let sumDpr = 0;
  let sumKast = 0;
  let sumMultiKillRate = 0;
  let sumHsPct = 0;

  let sumScoreFirepower = 0;
  let sumScoreEntry = 0;
  let sumScoreTrade = 0;
  let sumScoreOpening = 0;
  let sumScoreClutch = 0;
  let sumScoreSniper = 0;
  let sumScoreUtility = 0;

  const detailsAcc: Record<string, number> = {};
  const detailsWeight: Record<string, number> = {};

  aggregated.forEach((p) => {
    const rounds = p.basic.r3_rounds_played || 1;
    totalRounds += rounds;

    const f = p.full.filtered;
    sumRating += f.details.rating * rounds;
    sumWpa += f.wpaAvg * rounds;
    sumAdr += f.adr * rounds;
    sumKpr += f.kpr * rounds;
    sumDpr += f.dpr * rounds;
    sumKast += f.kast * rounds;
    sumMultiKillRate += f.multiKillRate * rounds;
    sumHsPct += f.headshotPct * rounds;

    sumScoreFirepower += f.scoreFirepower * rounds;
    sumScoreEntry += f.scoreEntry * rounds;
    sumScoreTrade += f.scoreTrade * rounds;
    sumScoreOpening += f.scoreOpening * rounds;
    sumScoreClutch += f.scoreClutch * rounds;
    sumScoreSniper += f.scoreSniper * rounds;
    sumScoreUtility += f.scoreUtility * rounds;

    const isUtilityBroken =
      (f.details.totalFlashes > 5 && f.details.totalBlinded === 0) ||
      (f.details.totalFlashAssists > 0 && f.details.totalBlinded === 0);

    Object.entries(f.details).forEach(([key, val]) => {
      if (
        val === null ||
        val === undefined ||
        typeof val !== "number" ||
        isNaN(val)
      )
        return;
      const isUtilityField = [
        "utilDmgPerRound",
        "utilKillsPer100",
        "flashesPerRound",
        "flashAssistsPerRound",
        "blindTimePerRound",
        "totalFlashes",
        "totalBlinded",
        "totalFlashAssists",
      ].includes(key);
      if (isUtilityField && isUtilityBroken) return;

      if (!detailsAcc[key]) {
        detailsAcc[key] = 0;
        detailsWeight[key] = 0;
      }
      detailsAcc[key] += val * rounds;
      detailsWeight[key] += rounds;
    });
  });

  const avgDetails: Record<string, number> = {};
  Object.keys(detailsAcc).forEach((key) => {
    avgDetails[key] =
      detailsWeight[key] > 0 ? detailsAcc[key] / detailsWeight[key] : 0;
  });

  // Helper to get percentile
  const getPercentile = (
    data: number[],
    value: number,
    isBetterHigher: boolean,
  ) => {
    if (data.length === 0) return 0;
    const countBelow = data.filter((d) => d <= value).length;
    const percentile = (countBelow / data.length) * 100;
    return isBetterHigher ? 100 - percentile : percentile;
  };

  // 2. Calculate fine-grained round distributions
  let totalPlayerRounds = 0;
  let totalAssists = 0;
  let totalDamage = 0;
  let totalHeadshots = 0;

  let totalEntryKills = 0;
  let totalEntryDeaths = 0;
  let totalTradeKills = 0;
  let totalTradedDeaths = 0;
  let totalSurvived = 0;

  let multiKills = { k0: 0, k1: 0, k2: 0, k3: 0, k4: 0, k5: 0 };
  let ratingDist = { r0_5: 0, r0_8: 0, r1_05: 0, r1_3: 0, r1_5: 0, rMax: 0 };
  let wpaDist = { w_neg10: 0, w_0: 0, w_10: 0, w_20: 0, w_max: 0 };

  let kastDist: number[] = [];
  let killsDist: number[] = [];
  let deathsDist: number[] = [];

  allMatches.forEach((match) => {
    match.rounds?.forEach((round) => {
      Object.values(round.playerStats).forEach((p) => {
        totalPlayerRounds++;

        totalAssists += p.assists;
        totalDamage += p.damage;
        totalHeadshots += p.headshots || 0;

        if (p.isEntryKill) totalEntryKills++;
        if (p.isEntryDeath) totalEntryDeaths++;
        if (p.traded) totalTradeKills++;
        if (p.wasTraded) totalTradedDeaths++;
        if (p.survived) totalSurvived++;

        // KAST
        const isKast =
          p.kills > 0 || p.assists > 0 || p.survived || p.wasTraded ? 1 : 0;
        kastDist.push(isKast * 100);

        // Kills/Deaths
        killsDist.push(p.kills);
        deathsDist.push(p.deaths);

        // Multi-kills
        if (p.kills === 0) multiKills.k0++;
        else if (p.kills === 1) multiKills.k1++;
        else if (p.kills === 2) multiKills.k2++;
        else if (p.kills === 3) multiKills.k3++;
        else if (p.kills === 4) multiKills.k4++;
        else if (p.kills >= 5) multiKills.k5++;

        // Rating dist
        if (p.rating < 0.5) ratingDist.r0_5++;
        else if (p.rating < 0.8) ratingDist.r0_8++;
        else if (p.rating < 1.05) ratingDist.r1_05++;
        else if (p.rating < 1.3) ratingDist.r1_3++;
        else if (p.rating < 1.5) ratingDist.r1_5++;
        else ratingDist.rMax++;

        // WPA dist
        if (p.wpa < -10) wpaDist.w_neg10++;
        else if (p.wpa < 0) wpaDist.w_0++;
        else if (p.wpa < 10) wpaDist.w_10++;
        else if (p.wpa < 20) wpaDist.w_20++;
        else wpaDist.w_max++;
      });
    });
  });

  const avgKast = totalRounds > 0 ? sumKast / totalRounds : 0;
  const avgKpr = totalRounds > 0 ? sumKpr / totalRounds : 0;
  const avgDpr = totalRounds > 0 ? sumDpr / totalRounds : 0;

  return {
    avgRating: totalRounds > 0 ? sumRating / totalRounds : 0,
    avgWpa: totalRounds > 0 ? sumWpa / totalRounds : 0,
    avgAdr: totalRounds > 0 ? sumAdr / totalRounds : 0,
    avgKpr: avgKpr,
    avgDpr: avgDpr,
    avgKast: avgKast,
    avgMultiKillRate: totalRounds > 0 ? sumMultiKillRate / totalRounds : 0,
    avgHsPct: totalRounds > 0 ? sumHsPct / totalRounds : 0,

    avgScoreFirepower: totalRounds > 0 ? sumScoreFirepower / totalRounds : 0,
    avgScoreEntry: totalRounds > 0 ? sumScoreEntry / totalRounds : 0,
    avgScoreTrade: totalRounds > 0 ? sumScoreTrade / totalRounds : 0,
    avgScoreOpening: totalRounds > 0 ? sumScoreOpening / totalRounds : 0,
    avgScoreClutch: totalRounds > 0 ? sumScoreClutch / totalRounds : 0,
    avgScoreSniper: totalRounds > 0 ? sumScoreSniper / totalRounds : 0,
    avgScoreUtility: totalRounds > 0 ? sumScoreUtility / totalRounds : 0,

    details: avgDetails,
    totalPlayers: aggregated.length,
    totalRounds,

    // New Dimensions
    totalPlayerRounds,
    totalAssists,
    totalDamage,
    totalHeadshots,
    entrySuccess:
      totalEntryKills + totalEntryDeaths > 0
        ? totalEntryKills / (totalEntryKills + totalEntryDeaths)
        : 0,
    survivalRate: totalPlayerRounds > 0 ? totalSurvived / totalPlayerRounds : 0,
    tradeSuccess:
      totalTradeKills + totalTradedDeaths > 0
        ? totalTradeKills / (totalTradeKills + totalTradedDeaths)
        : 0,
    multiKills,
    ratingDist,
    wpaDist,
    kastDist,
    killsDist,
    deathsDist,

    // Percentiles
    kastPercentile: getPercentile(kastDist, avgKast, true),
    killsPercentile: getPercentile(killsDist, avgKpr, true),
    deathsPercentile: getPercentile(deathsDist, avgDpr, false),
  };
}
