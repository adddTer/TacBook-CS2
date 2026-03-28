import React, { useState, useMemo } from "react";
import { Tournament, Match, PlayerMatchStats } from "../../types";
import { resolveName } from "../../utils/demo/helpers";

interface TournamentStatsProps {
  tournaments: Tournament[];
  allMatches: Match[];
}

export const TournamentStats: React.FC<TournamentStatsProps> = ({
  tournaments,
  allMatches,
}) => {
  const [timeFilter, setTimeFilter] = useState<
    "all" | "last30" | "last90" | "custom"
  >("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Filter tournaments based on time
  const filteredTournaments = useMemo(() => {
    if (timeFilter === "all") return tournaments;

    const now = new Date();
    let startDate = new Date(0);
    let endDate = new Date();

    if (timeFilter === "last30") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeFilter === "last90") {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (timeFilter === "custom") {
      startDate = customStartDate ? new Date(customStartDate) : new Date(0);
      endDate = customEndDate ? new Date(customEndDate) : new Date();
    }

    return tournaments.filter((t) => {
      const tDate = new Date(t.startDate);
      return tDate >= startDate && tDate <= endDate;
    });
  }, [tournaments, timeFilter, customStartDate, customEndDate]);

  // Aggregate stats for players in filtered tournaments
  const playerStats = useMemo(() => {
    const statsMap = new Map<
      string,
      {
        name: string;
        matches: number;
        kills: number;
        deaths: number;
        assists: number;
        damage: number;
        rounds: number;
        ratingSum: number;
      }
    >();

    filteredTournaments.forEach((tournament) => {
      const tMatches = allMatches.filter(
        (m) => m.tournamentId === tournament.id,
      );
      tMatches.forEach((match) => {
        if (!match.players) return;

        // We need total rounds for rating/damage calculations if not provided directly
        const totalRounds = match.score ? match.score.us + match.score.them : 0;

        match.players.forEach((stat) => {
          const existing = statsMap.get(stat.playerId) || {
            name: resolveName(stat.playerId),
            matches: 0,
            kills: 0,
            deaths: 0,
            assists: 0,
            damage: 0,
            rounds: 0,
            ratingSum: 0,
          };

          existing.matches += 1;
          existing.kills += stat.kills;
          existing.deaths += stat.deaths;
          existing.assists += stat.assists;
          existing.damage += stat.total_damage || 0;
          existing.rounds += totalRounds;
          existing.ratingSum += stat.rating || 0;

          statsMap.set(stat.playerId, existing);
        });
      });
    });

    return Array.from(statsMap.values())
      .map((stat) => ({
        ...stat,
        avgRating: stat.matches > 0 ? stat.ratingSum / stat.matches : 0,
        kdRatio: stat.deaths > 0 ? stat.kills / stat.deaths : stat.kills,
        adr: stat.rounds > 0 ? stat.damage / stat.rounds : 0,
      }))
      .sort((a, b) => b.avgRating - a.avgRating); // Sort by rating descending
  }, [filteredTournaments, allMatches]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            <button
              onClick={() => setTimeFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timeFilter === "all" ? "bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700/50"}`}
            >
              全部时间
            </button>
            <button
              onClick={() => setTimeFilter("last30")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timeFilter === "last30" ? "bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700/50"}`}
            >
              近30天
            </button>
            <button
              onClick={() => setTimeFilter("last90")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timeFilter === "last90" ? "bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700/50"}`}
            >
              近90天
            </button>
            <button
              onClick={() => setTimeFilter("custom")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timeFilter === "custom" ? "bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700/50"}`}
            >
              自定义
            </button>
          </div>

          {timeFilter === "custom" && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-2 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-neutral-400">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-2 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        <div className="mt-4 text-xs font-bold text-neutral-500">
          当前筛选包含 {filteredTournaments.length} 个赛事
        </div>
      </div>

      {/* Stats Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800">
                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  选手
                </th>
                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">
                  比赛数
                </th>
                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">
                  Rating
                </th>
                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">
                  K/D
                </th>
                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">
                  ADR
                </th>
                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">
                  总击杀
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
              {playerStats.map((stat, index) => (
                <tr
                  key={stat.name}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : index === 1
                              ? "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300"
                              : index === 2
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span className="font-bold text-neutral-900 dark:text-white">
                        {stat.name}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-center font-mono text-sm text-neutral-600 dark:text-neutral-400">
                    {stat.matches}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`font-mono text-sm font-bold ${
                        stat.avgRating >= 1.15
                          ? "text-green-600 dark:text-green-400"
                          : stat.avgRating >= 1.05
                            ? "text-blue-600 dark:text-blue-400"
                            : stat.avgRating < 0.9
                              ? "text-red-600 dark:text-red-400"
                              : "text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      {stat.avgRating.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-4 text-center font-mono text-sm text-neutral-600 dark:text-neutral-400">
                    {stat.kdRatio.toFixed(2)}
                  </td>
                  <td className="p-4 text-center font-mono text-sm text-neutral-600 dark:text-neutral-400">
                    {stat.adr.toFixed(1)}
                  </td>
                  <td className="p-4 text-center font-mono text-sm text-neutral-600 dark:text-neutral-400">
                    {stat.kills}
                  </td>
                </tr>
              ))}
              {playerStats.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-neutral-400 text-sm font-bold"
                  >
                    没有找到选手数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
