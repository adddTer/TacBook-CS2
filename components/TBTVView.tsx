
import React, { useState, useMemo, useRef } from 'react';
import { MATCH_HISTORY } from '../data/matches';
import { ROSTER } from '../constants/roster';
import { MAPS } from '../constants';
import { Match, PlayerMatchStats, Rank } from '../types';

// Mapping for in-game names to Roster IDs
const NAME_MAPPING: Record<string, string> = {
  'addd_233': 'addd',
  // Add other alias mappings here if needed
};

const getRosterId = (name: string) => NAME_MAPPING[name] || name;

export const TBTVView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'matches' | 'players'>('matches');
  const [matches, setMatches] = useState<Match[]>(MATCH_HISTORY);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Calculations ---
  const playerStats = useMemo(() => {
    return ROSTER.map(player => {
        const matchesPlayed = matches
            .filter(m => m.players.some(p => getRosterId(p.playerId) === player.id))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
        const totalMatches = matchesPlayed.length;
        
        if (totalMatches === 0) {
            return { 
                ...player, 
                matches: 0,
                currentRank: '?' as Rank,
                avgRating: '0.00',
                avgAdr: '0.0',
                avgWe: '0.00',
                avgHs: '0.0',
                totalK: 0,
                totalD: 0,
                totalA: 0,
                kdRatio: '0.00'
            };
        }

        const latestMatchPlayer = matchesPlayed[0].players.find(p => getRosterId(p.playerId) === player.id);
        const currentRank = latestMatchPlayer?.rank || '?';

        let sums = {
            k: 0, d: 0, a: 0,
            rating: 0, adr: 0, we: 0, hsRate: 0
        };

        matchesPlayed.forEach(m => {
            const p = m.players.find(p => getRosterId(p.playerId) === player.id)!;
            sums.k += p.kills;
            sums.d += p.deaths;
            sums.a += p.assists;
            sums.rating += p.rating;
            sums.adr += p.adr;
            sums.we += p.we;
            sums.hsRate += p.hsRate;
        });

        return {
            ...player,
            matches: totalMatches,
            currentRank,
            avgRating: (sums.rating / totalMatches).toFixed(2),
            avgAdr: (sums.adr / totalMatches).toFixed(1),
            avgWe: (sums.we / totalMatches).toFixed(2),
            avgHs: (sums.hsRate / totalMatches).toFixed(1),
            totalK: sums.k,
            totalD: sums.d,
            totalA: sums.a,
            kdRatio: (sums.k / (sums.d || 1)).toFixed(2)
        };
    });
  }, [matches]);

  const selectedPlayerStats = useMemo(() => {
      if (!selectedPlayerId) return null;
      const profile = playerStats.find(p => p.id === selectedPlayerId);
      const history = matches.filter(m => m.players.some(p => getRosterId(p.playerId) === selectedPlayerId))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map(m => {
            const stats = m.players.find(p => getRosterId(p.playerId) === selectedPlayerId)!;
            return { match: m, stats };
        });
      return { profile, history };
  }, [selectedPlayerId, playerStats, matches]);

  // --- Handlers ---
  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.json')) {
          // Real JSON Import
          const reader = new FileReader();
          reader.onload = (ev) => {
              try {
                  const content = ev.target?.result as string;
                  const data = JSON.parse(content);
                  if (Array.isArray(data)) {
                       setMatches(prev => [...data, ...prev]);
                  } else {
                       setMatches(prev => [data, ...prev]);
                  }
                  alert('数据导入成功');
              } catch (err) {
                  alert('JSON 格式错误');
              }
          };
          reader.readAsText(file);
      } else {
          alert('仅支持 .json 数据文件');
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Helper Components ---
  
  const RankBadge = ({ rank }: { rank: string }) => {
      const isGold = rank.includes('++') || rank === 'S';
      const displayRank = rank.replace('++', '+'); 
      
      return (
          <span className={`
            text-[9px] font-black px-1.5 py-0.5 rounded border
            ${isGold 
                ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-black border-yellow-600 shadow-sm shadow-yellow-500/30' 
                : 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400'}
          `}>
              {displayRank}
          </span>
      );
  };

  const SourceBadge = ({ source }: { source: 'PWA' | 'Official' }) => (
      <span className={`
        text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider
        ${source === 'PWA' 
            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800' 
            : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600'}
      `}>
          {source === 'PWA' ? '完美世界' : '官方竞技'}
      </span>
  );

  const StatBox = ({ label, value, subValue, colorClass }: any) => (
      <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl text-center border border-neutral-100 dark:border-neutral-700">
          <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{label}</div>
          <div className={`text-xl font-black ${colorClass || 'text-neutral-900 dark:text-white'}`}>{value}</div>
          {subValue && <div className="text-[10px] text-neutral-500 font-mono">{subValue}</div>}
      </div>
  );

  const ScoreboardTable = ({ players, isTeam }: { players: PlayerMatchStats[], isTeam: boolean }) => (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className={`text-[10px] uppercase font-bold border-b ${isTeam ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 text-blue-500' : 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 text-red-500'}`}>
                <tr>
                    <th className="px-3 py-2 sticky left-0 z-10 bg-inherit">{isTeam ? 'Our Team' : 'Enemy Team'}</th>
                    <th className="px-1 py-2 text-center">Rank</th>
                    <th className="px-1 py-2 text-center">K</th>
                    <th className="px-1 py-2 text-center">D</th>
                    <th className="px-1 py-2 text-center">A</th>
                    <th className="px-1 py-2 text-center">+/-</th>
                    <th className="px-1 py-2 text-center">ADR</th>
                    <th className="px-1 py-2 text-center">HS%</th>
                    <th className="px-1 py-2 text-center">WE</th>
                    <th className="px-3 py-2 text-right">Rating</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {[...players].sort((a,b) => b.rating - a.rating).map(p => {
                    const kdDiff = p.kills - p.deaths;
                    const rosterId = getRosterId(p.playerId);
                    const isRosterMember = ROSTER.some(r => r.id === rosterId);
                    
                    return (
                        <tr 
                            key={p.playerId} 
                            onClick={() => {
                                if (isRosterMember) {
                                    setSelectedMatch(null);
                                    setSelectedPlayerId(rosterId);
                                }
                            }}
                            className={`
                                transition-colors group
                                ${isRosterMember ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}
                            `}
                        >
                            <td className={`
                                px-3 py-2 font-bold sticky left-0 transition-colors border-r border-transparent 
                                ${isRosterMember 
                                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-neutral-900 group-hover:border-blue-200 dark:group-hover:border-blue-800' 
                                    : 'text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 group-hover:bg-neutral-50 dark:group-hover:bg-neutral-800/50 group-hover:border-neutral-200 dark:group-hover:border-neutral-800'}
                            `}>
                                <div className="flex items-center gap-2">
                                    {isRosterMember && (
                                        <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center">
                                            {rosterId[0]}
                                        </div>
                                    )}
                                    {isRosterMember ? rosterId : p.playerId}
                                </div>
                            </td>
                            <td className="px-1 py-2 text-center">
                                <RankBadge rank={p.rank} />
                            </td>
                            <td className="px-1 py-2 text-center font-mono text-neutral-900 dark:text-white">{p.kills}</td>
                            <td className="px-1 py-2 text-center font-mono text-neutral-400">{p.deaths}</td>
                            <td className="px-1 py-2 text-center font-mono text-neutral-400">{p.assists}</td>
                            <td className={`px-1 py-2 text-center font-mono font-bold ${kdDiff > 0 ? 'text-green-500' : kdDiff < 0 ? 'text-red-500' : 'text-neutral-400'}`}>
                                {kdDiff > 0 ? `+${kdDiff}` : kdDiff}
                            </td>
                            <td className="px-1 py-2 text-center font-mono text-neutral-600 dark:text-neutral-300">{p.adr.toFixed(0)}</td>
                            <td className="px-1 py-2 text-center font-mono text-neutral-500">{p.hsRate}%</td>
                            <td className="px-1 py-2 text-center font-mono text-neutral-500">{p.we}</td>
                            <td className="px-3 py-2 text-right">
                                <span className={`font-black ${p.rating >= 1.3 ? 'text-red-500' : p.rating >= 1.1 ? 'text-green-500' : 'text-neutral-500'}`}>
                                    {p.rating}
                                </span>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
      </div>
  );

  // --- Views ---

  // 1. Player Detail View
  if (selectedPlayerId && selectedPlayerStats && selectedPlayerStats.profile) {
      const { profile, history } = selectedPlayerStats;
      return (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <button 
                onClick={() => setSelectedPlayerId(null)}
                className="flex items-center text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  返回列表
              </button>

              {/* Profile Card */}
              <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-5 font-black text-8xl text-neutral-900 dark:text-white select-none pointer-events-none transform translate-x-10 -translate-y-10">
                       {profile.id}
                   </div>
                   
                   <div className="relative z-10">
                       <div className="flex justify-between items-start mb-6">
                           <div className="flex items-center gap-4">
                               <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-blue-500/20">
                                   {profile.id[0]}
                               </div>
                               <div>
                                   <h2 className="text-2xl font-black text-neutral-900 dark:text-white leading-none">{profile.id}</h2>
                                   <p className="text-xs font-bold text-neutral-500 mt-1">{profile.role}</p>
                                   <div className="flex items-center gap-2 mt-2">
                                       <RankBadge rank={profile.currentRank} />
                                       <span className="text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                                           {profile.matches} Matches
                                       </span>
                                   </div>
                               </div>
                           </div>
                           
                           <div className="text-right">
                               <div className="text-[10px] font-bold text-neutral-400 uppercase">Avg Rating</div>
                               <div className={`text-4xl font-black tracking-tighter ${Number(profile.avgRating) >= 1.2 ? 'text-red-500' : Number(profile.avgRating) >= 1.05 ? 'text-green-500' : 'text-neutral-800 dark:text-neutral-200'}`}>
                                   {profile.avgRating}
                               </div>
                           </div>
                       </div>

                       <div className="grid grid-cols-4 gap-2 mb-2">
                           <StatBox label="K / D" value={profile.kdRatio} />
                           <StatBox label="ADR" value={profile.avgAdr} />
                           <StatBox label="HS%" value={`${profile.avgHs}%`} />
                           <StatBox label="WE" value={profile.avgWe} />
                       </div>
                       <div className="grid grid-cols-1 mt-2">
                           <StatBox label="Kills" value={profile.totalK} subValue="Total" />
                       </div>
                   </div>
              </div>

              {/* Match History List */}
              <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      近期比赛
                  </h3>
                  <div className="space-y-3">
                      {history.map(({ match, stats }) => {
                          const mapName = MAPS.find(m => m.id === match.mapId)?.name || match.mapId;
                          return (
                              <button 
                                key={match.id} 
                                onClick={() => { setSelectedPlayerId(null); setSelectedMatch(match); }}
                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 rounded-xl flex items-center justify-between hover:border-blue-500/50 transition-all active:scale-[0.99]"
                              >
                                  <div className="flex items-center gap-3">
                                      <div className={`w-1 h-12 rounded-full ${match.result === 'WIN' ? 'bg-green-500' : match.result === 'LOSS' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                      <div className="text-left">
                                          <div className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                              {mapName}
                                              <SourceBadge source={match.source} />
                                          </div>
                                          <div className="text-[10px] text-neutral-400 font-mono mt-0.5 text-left">
                                              {match.date.split('T')[0]} • Rank {stats.rank}
                                          </div>
                                      </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4 text-right">
                                      <div className="hidden sm:block">
                                          <div className="text-[9px] text-neutral-400 uppercase font-bold">ADR</div>
                                          <div className="text-sm font-mono font-bold text-neutral-600 dark:text-neutral-300">{stats.adr.toFixed(0)}</div>
                                      </div>
                                      <div>
                                          <div className="text-[9px] text-neutral-400 uppercase font-bold">K - D</div>
                                          <div className="text-sm font-mono font-bold text-neutral-800 dark:text-neutral-200">
                                              {stats.kills}-{stats.deaths}
                                          </div>
                                      </div>
                                      <div className="min-w-[40px]">
                                          <div className="text-[9px] text-neutral-400 uppercase font-bold">RTG</div>
                                          <div className={`text-lg font-black leading-none ${stats.rating >= 1.3 ? 'text-red-500' : stats.rating >= 1.1 ? 'text-green-500' : 'text-neutral-600 dark:text-neutral-400'}`}>
                                              {stats.rating}
                                          </div>
                                      </div>
                                  </div>
                              </button>
                          );
                      })}
                  </div>
              </div>
          </div>
      );
  }

  // 2. Match Detail View (Scoreboard)
  if (selectedMatch) {
      const mapName = MAPS.find(m => m.id === selectedMatch.mapId)?.name || selectedMatch.mapId;
      const startSide = selectedMatch.startingSide || 'CT';
      const ctColor = 'text-blue-500 dark:text-blue-400';
      const tColor = 'text-yellow-500 dark:text-yellow-400';
      const half1UsColor = startSide === 'CT' ? ctColor : tColor;
      const half1ThemColor = startSide === 'CT' ? tColor : ctColor;
      const half2UsColor = startSide === 'CT' ? tColor : ctColor;
      const half2ThemColor = startSide === 'CT' ? ctColor : tColor;

      return (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <button 
                onClick={() => setSelectedMatch(null)}
                className="flex items-center text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  返回赛程
              </button>

              {/* Match Header */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden relative shadow-sm">
                  <div className={`absolute top-0 w-full h-1 ${selectedMatch.result === 'WIN' ? 'bg-green-500' : selectedMatch.result === 'LOSS' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                  
                  <div className="p-6 text-center">
                       <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                            <span>{selectedMatch.date.split('T')[0]}</span>
                            <span>{selectedMatch.date.split('T')[1].substring(0,5)}</span>
                            <span>•</span>
                            <span>LOBBY {selectedMatch.rank}</span>
                       </div>
                       <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-2">{mapName}</h2>
                       <div className="flex justify-center mb-6">
                           <SourceBadge source={selectedMatch.source} />
                       </div>
                       
                       <div className="flex items-center justify-center gap-10">
                           <div className="text-right">
                               <div className={`text-5xl font-black ${selectedMatch.result === 'LOSS' ? 'text-red-600 dark:text-red-500' : 'text-neutral-400'}`}>
                                   {selectedMatch.score.them}
                               </div>
                               <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Opponent</div>
                           </div>
                           <div className="text-2xl text-neutral-300 font-light opacity-50">:</div>
                           <div className="text-left">
                                <div className={`text-5xl font-black ${selectedMatch.result === 'WIN' ? 'text-green-600 dark:text-green-500' : 'text-neutral-900 dark:text-white'}`}>
                                   {selectedMatch.score.us}
                               </div>
                               <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Our Team</div>
                           </div>
                       </div>
                       
                       <div className="mt-6 flex justify-center gap-4 text-xs font-mono font-bold bg-neutral-50 dark:bg-neutral-800 py-2 rounded-lg max-w-[220px] mx-auto">
                           <span>( <span className={half1ThemColor}>{selectedMatch.score.half1_them}</span>-<span className={half1UsColor}>{selectedMatch.score.half1_us}</span> )</span>
                           <span>( <span className={half2ThemColor}>{selectedMatch.score.half2_them}</span>-<span className={half2UsColor}>{selectedMatch.score.half2_us}</span> )</span>
                       </div>
                  </div>
              </div>

              {/* Detailed Scoreboard */}
              <div>
                  <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-3 px-1">Match Scoreboard</h3>
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm space-y-4 pb-4">
                       <ScoreboardTable players={selectedMatch.players} isTeam={true} />
                       <div className="h-px bg-neutral-100 dark:bg-neutral-800 mx-4"></div>
                       <ScoreboardTable players={selectedMatch.enemyPlayers} isTeam={false} />
                  </div>
              </div>
          </div>
      );
  }

  // 3. Main List View
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Action Bar */}
        <div className="flex gap-2">
             <div className="flex flex-1 p-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl">
                <button
                    onClick={() => setActiveTab('matches')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'matches' ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
                >
                    赛程
                </button>
                <button
                    onClick={() => setActiveTab('players')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'players' ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
                >
                    队员
                </button>
            </div>
            
            <button 
                onClick={handleImportClick}
                className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-blue-500/20"
                title="导入数据"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
            </button>
            {/* Hidden Input */}
            <input 
                ref={fileInputRef}
                type="file" 
                accept=".json" 
                className="hidden" 
                onChange={handleFileChange}
            />
        </div>

        {/* Matches Tab */}
        {activeTab === 'matches' && (
            <div className="space-y-3">
                {matches.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(match => {
                    const mapName = MAPS.find(m => m.id === match.mapId)?.name || match.mapId;
                    return (
                        <div 
                            key={match.id} 
                            onClick={() => setSelectedMatch(match)}
                            className="relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl group cursor-pointer hover:border-blue-500/50 transition-all active:scale-[0.99]"
                        >
                            <div className={`absolute top-0 right-0 w-24 h-full opacity-10 -skew-x-12 transform translate-x-8 ${match.result === 'WIN' ? 'bg-green-500' : 'bg-red-500'}`}></div>

                            <div className="p-5 relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-white ${match.result === 'WIN' ? 'bg-green-600' : 'bg-red-600'}`}>
                                            {match.result}
                                        </span>
                                        <SourceBadge source={match.source} />
                                    </div>
                                    <span className="text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-1 rounded">
                                        {match.date.split('T')[0]}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-xs text-neutral-500 uppercase">
                                            {match.mapId.substring(0,2)}
                                        </div>
                                        <div>
                                            <div className="text-lg font-black text-neutral-900 dark:text-white leading-none">
                                                {mapName}
                                            </div>
                                            <div className="text-[10px] text-neutral-400 font-medium mt-1">
                                                半场: {match.score.half1_us}-{match.score.half1_them} / {match.score.half2_us}-{match.score.half2_them}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-3xl font-black font-mono tracking-tighter">
                                        <span className={match.result === 'WIN' ? 'text-green-500' : 'text-neutral-900 dark:text-white'}>{match.score.us}</span>
                                        <span className="text-neutral-300 mx-1">:</span>
                                        <span className={match.result === 'LOSS' ? 'text-red-500' : 'text-neutral-900 dark:text-white'}>{match.score.them}</span>
                                    </div>
                                </div>
                                
                                <div className="absolute bottom-2 right-14 text-[10px] text-neutral-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    详情 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

        {/* Players Tab */}
        {activeTab === 'players' && (
            <div className="space-y-3">
                {playerStats.map(player => (
                    <div 
                        key={player.id} 
                        onClick={() => setSelectedPlayerId(player.id)}
                        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:border-blue-500/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-neutral-500">
                                {player.id[0]}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="font-bold text-neutral-900 dark:text-white">{player.name}</div>
                                    <RankBadge rank={player.currentRank} />
                                </div>
                                <div className="text-[10px] text-neutral-500">{player.role.split(' ')[0]}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                             <div>
                                <div className="text-[9px] text-neutral-400 uppercase font-bold">Matches</div>
                                <div className="text-xs font-bold">{player.matches}</div>
                             </div>
                             <div>
                                <div className="text-[9px] text-neutral-400 uppercase font-bold">Rating</div>
                                <div className={`text-sm font-black ${Number(player.avgRating) >= 1.1 ? 'text-green-500' : 'text-neutral-800 dark:text-neutral-200'}`}>{player.avgRating}</div>
                             </div>
                             <svg className="w-4 h-4 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                             </svg>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};
