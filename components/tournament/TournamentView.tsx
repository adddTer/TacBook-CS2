import React, { useState } from "react";
import { Tournament, Match, ContentGroup, MatchBon } from "../../types";
import { TournamentList } from "./TournamentList";
import { TournamentDetail } from "./TournamentDetail";
import { TournamentStats } from "./TournamentStats";
import { TournamentCreatorModal } from "./TournamentCreatorModal";
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
  allTournaments,
  allMatches,
  writableGroups,
  onSaveTournament,
  onDeleteTournament,
  onSaveMatch,
  onDeleteMatch,
  onSaveBon,
}) => {
  const [selectedTournament, setSelectedTournament] =
    useState<Tournament | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "stats">("list");
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);

  // Combine user tournaments and pre-coded tournaments
  const displayTournaments = [...allTournaments, ...PRE_CODED_TOURNAMENTS.filter(t => !allTournaments.find(ut => ut.id === t.id))];

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
        
        <button
          onClick={() => setIsCreatorOpen(true)}
          disabled={writableGroups.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          创建赛事
        </button>
      </div>

      {viewMode === "list" ? (
        <TournamentList
          tournaments={displayTournaments}
          allMatches={allMatches}
          onSelectTournament={setSelectedTournament}
          onDeleteTournament={(t) => {
              if (PRE_CODED_TOURNAMENTS.find(pt => pt.id === t.id)) {
                  alert('预设赛事无法删除。');
                  return;
              }
              onDeleteTournament(t);
          }}
        />
      ) : (
        <TournamentStats tournaments={displayTournaments} allMatches={allMatches} />
      )}

      <TournamentCreatorModal
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
        writableGroups={writableGroups}
        onSave={onSaveTournament}
      />
    </div>
  );
};
