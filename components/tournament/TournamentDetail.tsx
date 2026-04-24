import React, { useState, useRef } from "react";
import { Tournament, Match, ContentGroup, MatchBon } from "../../types";
import { MatchList } from "../review/MatchList";
import { TournamentStats } from "./TournamentStats";
import { SwissBracket, SingleElimBracket } from "./TournamentBrackets";
import { parseDemoJson } from "../../utils/demoParser";
import { BonCreatorModal } from "../bon/BonCreatorModal";

interface TournamentDetailProps {
  tournament: Tournament;
  allMatches: Match[];
  writableGroups: ContentGroup[];
  onBack: () => void;
  onSaveMatch: (match: Match, groupId: string) => void;
  onDeleteMatch: (match: Match) => void;
  onSaveBon: (bon: MatchBon, groupId: string) => void;
}

export const TournamentDetail: React.FC<TournamentDetailProps> = ({
  tournament,
  allMatches,
  writableGroups,
  onBack,
  onSaveMatch,
  onDeleteMatch,
  onSaveBon,
}) => {
  const [viewMode, setViewMode] = useState<"matches" | "stats" | "schedule" | "prizes">("schedule");
  const [activeStageId, setActiveStageId] = useState<string | null>(tournament.stages?.[0]?.id || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  
  const [isBonCreatorOpen, setIsBonCreatorOpen] = useState(false);
  const [initialBonMatches, setInitialBonMatches] = useState<Match[]>([]);

  const tournamentMatches = allMatches.filter(
    (m) => m.tournamentId === tournament.id,
  );

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsParsing(true);
    setParseProgress(0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const match = parseDemoJson(json, file.lastModified);

        // Link to tournament
        match.tournamentId = tournament.id;

        // Save to the same group as the tournament
        onSaveMatch(
          match,
          tournament.groupId || writableGroups[0]?.metadata.id,
        );
      } catch (error) {
        console.error(`Failed to parse ${file.name}:`, error);
        // In a real app, we'd show an error toast here
      }
      setParseProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setIsParsing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleReparse = async (matchesToReparse: Match[]) => {
    setIsParsing(true);
    setParseProgress(0);

    for (let i = 0; i < matchesToReparse.length; i++) {
      const match = matchesToReparse[i];
      if (!match.rawDemoJson) continue;

      try {
        const updatedMatch = parseDemoJson(match.rawDemoJson);
        updatedMatch.id = match.id; // Keep original ID
        updatedMatch.date = match.date; // Keep original date
        updatedMatch.tournamentId = tournament.id;

        onSaveMatch(
          updatedMatch,
          tournament.groupId || writableGroups[0]?.metadata.id,
        );
      } catch (error) {
        console.error(`Failed to re-parse match ${match.id}:`, error);
      }
      setParseProgress(Math.round(((i + 1) / matchesToReparse.length) * 100));
    }

    setIsParsing(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-purple-500"></div>
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
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
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          返回赛事列表
        </button>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {tournament.tier && (
                <span className={`px-2 py-1 text-xs font-bold rounded-lg uppercase tracking-wider ${
                  tournament.tier.toLowerCase() === 'major' 
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' 
                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                }`}>
                  {tournament.tier}
                </span>
              )}
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-lg uppercase tracking-wider">
                赛事
              </span>
              <span className="text-sm font-medium text-neutral-500">
                {tournament.startDate}{" "}
                {tournament.endDate ? `- ${tournament.endDate}` : ""}
              </span>
            </div>
            <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-4">
              {tournament.title}
            </h1>
            
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {tournament.prizePool !== undefined && (
                    <div>
                        <div className="text-neutral-400 font-medium mb-1">总奖金</div>
                        <div className="font-bold text-neutral-900 dark:text-white">${tournament.prizePool.toLocaleString()}</div>
                    </div>
                )}
                {tournament.location && (
                    <div>
                        <div className="text-neutral-400 font-medium mb-1">举办地</div>
                        <div className="font-bold text-neutral-900 dark:text-white">{tournament.location}</div>
                    </div>
                )}
                {tournament.vrsInvitationDate && (
                    <div>
                        <div className="text-neutral-400 font-medium mb-1">VRS 邀请日期</div>
                        <div className="font-bold text-neutral-900 dark:text-white">{tournament.vrsInvitationDate}</div>
                    </div>
                )}
                {tournament.teamsCount && (
                    <div>
                        <div className="text-neutral-400 font-medium mb-1">参赛队伍</div>
                        <div className="font-bold text-neutral-900 dark:text-white">{tournament.teamsCount}</div>
                    </div>
                )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0 mt-4 md:mt-0">
            <input
              type="file"
              multiple
              accept=".json"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <button
              onClick={handleImportClick}
              disabled={isParsing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-transform active:scale-95 flex items-center gap-2"
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              {isParsing ? `导入中 ${parseProgress}%` : "导入比赛"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl w-fit">
        <button
          onClick={() => setViewMode("schedule")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === "schedule" ? "bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/50"}`}
        >
          赛程
        </button>
        <button
          onClick={() => setViewMode("prizes")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === "prizes" ? "bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/50"}`}
        >
          奖池
        </button>
        <button
          onClick={() => setViewMode("matches")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === "matches" ? "bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/50"}`}
        >
          比赛录像
        </button>
        <button
          onClick={() => setViewMode("stats")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === "stats" ? "bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/50"}`}
        >
          选手数据
        </button>
      </div>

      {/* Content */}
      {viewMode === "schedule" ? (
        <div className="space-y-6">
            {tournament.stages && tournament.stages.length > 0 ? (
                <>
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                        {tournament.stages.map(stage => (
                            <button
                                key={stage.id}
                                onClick={() => setActiveStageId(stage.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                                    activeStageId === stage.id 
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' 
                                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                }`}
                            >
                                {stage.name}
                            </button>
                        ))}
                    </div>

                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
                        {(() => {
                            const stage = tournament.stages.find(s => s.id === activeStageId);
                            if (!stage) return null;

                            const isSwiss = stage.format.includes('瑞士轮') || [22, 33, 44].includes(stage.matches?.length || 0);
                            const isSingleElim = stage.format.includes('淘汰') || stage.matches?.length === 3 || stage.matches?.length === 7 || stage.matches?.length === 15 || stage.matches?.length === 4 || stage.matches?.length === 8 || stage.matches?.length === 16;

                            return (
                                <>
                                    <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
                                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{stage.name}</h3>
                                        <p className="text-sm text-neutral-500 whitespace-pre-line mt-1">{stage.format}</p>
                                    </div>
                                    <div className="bg-neutral-50/50 dark:bg-neutral-900/50 flex-1 overflow-hidden relative group/bracket">
                                        {stage.matches && stage.matches.length > 0 ? (
                                            isSwiss ? <SwissBracket matches={stage.matches} onNodeClick={(stageMatch) => {
                                                // Try to locate a corresponding real match
                                                // Real matches might just have the same team names
                                                const realMatch = tournamentMatches.find(m => 
                                                    (m.teamNameUs === stageMatch.team1 && m.teamNameThem === stageMatch.team2) ||
                                                    (m.teamNameUs === stageMatch.team2 && m.teamNameThem === stageMatch.team1)
                                                );
                                                if (realMatch) {
                                                    window.dispatchEvent(new CustomEvent('open-match', { detail: realMatch.id }));
                                                }
                                            }} />
                                            : isSingleElim ? <SingleElimBracket matches={stage.matches} onNodeClick={(stageMatch) => {
                                                const realMatch = tournamentMatches.find(m => 
                                                    (m.teamNameUs === stageMatch.team1 && m.teamNameThem === stageMatch.team2) ||
                                                    (m.teamNameUs === stageMatch.team2 && m.teamNameThem === stageMatch.team1)
                                                );
                                                if (realMatch) {
                                                    window.dispatchEvent(new CustomEvent('open-match', { detail: realMatch.id }));
                                                }
                                            }} />
                                            : (
                                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {stage.matches.map(stageMatch => {
                                                        const realMatch = tournamentMatches.find(m => 
                                                            (m.teamNameUs === stageMatch.team1 && m.teamNameThem === stageMatch.team2) ||
                                                            (m.teamNameUs === stageMatch.team2 && m.teamNameThem === stageMatch.team1)
                                                        );
                                                        return (
                                                        <div 
                                                            key={stageMatch.id} 
                                                            onClick={realMatch ? () => window.dispatchEvent(new CustomEvent('open-match', { detail: realMatch.id })) : undefined}
                                                            className={`flex flex-col gap-1 p-2 rounded-lg transition-colors text-sm border border-neutral-200 dark:border-neutral-700 ${realMatch ? 'bg-white cursor-pointer hover:bg-neutral-100 shadow-sm dark:bg-neutral-800 dark:hover:bg-neutral-700' : 'bg-neutral-50 dark:bg-neutral-800/50 cursor-default'}`}
                                                        >
                                                            {stageMatch.date && <div className="text-xs text-neutral-400 font-medium">{stageMatch.date}</div>}
                                                            <div className="flex justify-between items-center">
                                                                <div className="flex items-center gap-2 flex-1">
                                                                    <span className="font-medium text-neutral-900 dark:text-white truncate">{stageMatch.team1}</span>
                                                                </div>
                                                                <div className="px-2 font-mono text-neutral-400">vs</div>
                                                                <div className="flex items-center gap-2 flex-1 justify-end">
                                                                    <span className="font-medium text-neutral-900 dark:text-white truncate">{stageMatch.team2}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )})}
                                                </div>
                                            )
                                        ) : (
                                            <div className="p-12 text-center text-neutral-500">该阶段暂无比赛数据</div>
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </>
            ) : (
                <div className="text-neutral-500 text-sm py-12 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">暂无赛程信息</div>
            )}
        </div>
      ) : viewMode === "prizes" ? (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden max-w-3xl">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">奖金分布</h2>
            </div>
            {tournament.prizes && tournament.prizes.length > 0 ? (
                <table className="w-full text-sm text-left">
                    <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 font-medium">
                        <tr>
                                    <th className="px-4 py-3">名次</th>
                                    <th className="px-4 py-3 text-right">奖金</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {tournament.prizes.map((prize, idx) => (
                            <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-neutral-900 dark:text-white">{prize.placement}</td>
                                <td className="px-6 py-4 text-right font-mono text-neutral-600 dark:text-neutral-400">
                                    {prize.amount > 0 ? `$${prize.amount.toLocaleString()}` : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="text-neutral-500 text-sm p-12 text-center">暂无奖金信息</div>
            )}
        </div>
      ) : viewMode === "matches" ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
              比赛 ({tournamentMatches.length})
            </h2>
            {tournamentMatches.length > 0 && (
              <button
                onClick={() => handleReparse(tournamentMatches)}
                disabled={isParsing}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
              >
                <svg
                  className={`w-3.5 h-3.5 ${isParsing ? "animate-spin" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {isParsing ? "重新解析中..." : "全部重新解析"}
              </button>
            )}
          </div>

          <MatchList
            matches={tournamentMatches}
            onSelectMatch={(match) => {
              window.dispatchEvent(new CustomEvent('open-match', { detail: match.id }));
            }}
            onBatchDelete={(items) => {
              items.forEach((item) => {
                const match = tournamentMatches.find((m) => m.id === item.id);
                if (match) onDeleteMatch(match);
              });
            }}
            onReparse={(matches) => handleReparse(matches)}
            onCreateBonFromMatches={(matches) => {
              setInitialBonMatches(matches);
              setIsBonCreatorOpen(true);
            }}
          />
        </div>
      ) : (
        <TournamentStats
          tournaments={[tournament]}
          allMatches={tournamentMatches}
        />
      )}

      <BonCreatorModal
        isOpen={isBonCreatorOpen}
        onClose={() => setIsBonCreatorOpen(false)}
        onSave={onSaveBon}
        writableGroups={writableGroups}
        initialMatches={initialBonMatches}
        tournamentId={tournament.id}
      />
    </div>
  );
};
