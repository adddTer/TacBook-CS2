import React, { useState } from "react";
import { Tournament, Match, ContentGroup, MatchBon } from "../../types";
import { TournamentList } from "./TournamentList";
import { TournamentDetail } from "./TournamentDetail";
import { TournamentStats } from "./TournamentStats";
import { PRE_CODED_TOURNAMENTS } from "../../utils/preCodedTournaments";

interface TournamentViewProps {
  allTournaments: Tournament[];
  allMatches: Match[];
  writableGroups: ContentGroup[];
  onSaveTournament: (tournament: Tournament, groupId: string) => void;
  onDeleteTournament: (tournament: Tournament) => void;
  onSaveMatch: (match: Match, groupId: string) => void;
  onDeleteMatch: (match: Match) => void;
  onSaveBon: (bon: MatchBon, groupId: string) => void;
}

export const TournamentView: React.FC<TournamentViewProps> = ({
  allMatches,
  writableGroups,
  onSaveMatch,
  onDeleteMatch,
  onSaveBon,
}) => {
  const [selectedTournament, setSelectedTournament] =
    useState<Tournament | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "stats">("list");

  // Use pre-coded tournaments
  const displayTournaments = PRE_CODED_TOURNAMENTS;

  if (selectedTournament) {
    return (
      <TournamentDetail
        tournament={selectedTournament}
        allMatches={allMatches}
        writableGroups={writableGroups}
        onBack={() => setSelectedTournament(null)}
        onSaveMatch={onSaveMatch}
        onDeleteMatch={onDeleteMatch}
        onSaveBon={onSaveBon}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 p-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl w-fit">
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === "list" ? "bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/50"}`}
          >
            赛事列表
          </button>
          <button
            onClick={() => setViewMode("stats")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === "stats" ? "bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/50"}`}
          >
            数据统计
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        <TournamentList
          tournaments={displayTournaments}
          allMatches={allMatches}
          onSelectTournament={setSelectedTournament}
          onDeleteTournament={() => {}} // Disabled for pre-coded
        />
      ) : (
        <TournamentStats tournaments={displayTournaments} allMatches={allMatches} />
      )}
    </div>
  );
};
