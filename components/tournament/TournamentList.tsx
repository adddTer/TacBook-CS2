import React from "react";
import { Tournament, Match } from "../../types";

interface TournamentListProps {
  tournaments: Tournament[];
  allMatches: Match[];
  onSelectTournament: (tournament: Tournament) => void;
  onDeleteTournament: (tournament: Tournament) => void;
}

export const TournamentList: React.FC<TournamentListProps> = ({
  tournaments,
  allMatches,
  onSelectTournament,
  onDeleteTournament,
}) => {
  if (tournaments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
        <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <p className="text-sm font-bold">暂无赛事</p>
        <p className="text-xs mt-1">点击右上角创建新赛事</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tournaments.map((tournament) => {
        const tournamentMatches = allMatches.filter(
          (m) => m.tournamentId === tournament.id,
        );

        return (
          <div
            key={tournament.id}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden flex flex-col"
            onClick={() => onSelectTournament(tournament)}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-purple-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>

            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-black text-neutral-900 dark:text-white leading-tight line-clamp-2">
                {tournament.title}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTournament(tournament);
                }}
                className="text-neutral-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-auto space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-500">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {tournament.startDate}{" "}
                {tournament.endDate ? `至 ${tournament.endDate}` : ""}
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-500">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                包含 {tournamentMatches.length} 场比赛
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
