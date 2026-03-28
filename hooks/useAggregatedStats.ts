import { useMemo } from "react";
import { Match, PlayerMatchStats } from "../types";
import { MatchAggregator } from "../utils/analytics/matchAggregator";

type SideFilter = "ALL" | "CT" | "T";

export const useAggregatedStats = (
  match: Match,
  targetPlayers: PlayerMatchStats[],
  filter: SideFilter,
) =>
  useMemo(() => {
    return MatchAggregator.aggregateMatchBySide(match, targetPlayers, filter);
  }, [match.rounds, targetPlayers, filter]);
