import React, { useState } from 'react';
import { Match, PlayerMatchStats } from '../../types';
import { resolveName } from '../../utils/demo/helpers';
import { calculatePlayerStats } from '../../utils/analytics/playerStatsCalculator';
import { identifyRole } from '../../utils/analytics/roleIdentifier';
import { MatchAggregator } from '../../utils/analytics/matchAggregator';
import { getTeamNames } from '../../utils/matchHelpers';

interface MatchDataExporterModalProps {
    isOpen: boolean;
    onClose: () => void;
    match: Match;
}


export const MatchDataExporterModal: React.FC<MatchDataExporterModalProps> = ({ isOpen, onClose, match }) => {
    const [downloading, setDownloading] = useState<string | null>(null);

    if (!isOpen) return null;

    const mapName = match.mapId;
    const dateStr = match.date.split('T')[0];
    const baseFilename = `${mapName}_${dateStr}`;

    const triggerDownload = (content: string, filename: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // 1. Raw Data
    const getRawData = () => {
        return match.rawDemoJson ? match.rawDemoJson : match;
    };

    const downloadRawData = () => {
        setDownloading('raw');
        const data = getRawData();
        const jsonContent = JSON.stringify(data, null, 4);
        triggerDownload(jsonContent, `raw_match_data_${baseFilename}.json`, 'application/json;charset=utf-8;');
        setDownloading(null);
    };

    // Helpers
    const allPlayers = [...match.players, ...match.enemyPlayers];
    const { teamA: teamUsName, teamB: teamThemName } = getTeamNames(match);

    // 2. Scoreboard Processed
    const getScoreboardData = () => {
        const aggregatedAll = MatchAggregator.aggregateMatchBySide(match, allPlayers, 'ALL');
        return aggregatedAll.map(p => {
            const isEnemy = match.enemyPlayers.some(ep => ep.playerId === p.playerId);
            const name = p.steamid && resolveName(p.steamid) !== p.steamid ? resolveName(p.steamid) : resolveName(p.playerId);
            return {
                playerId: p.playerId,
                steamid: p.steamid,
                name,
                team: isEnemy ? teamThemName : teamUsName,
                kills: p.kills,
                deaths: p.deaths,
                assists: p.assists,
                adr: p.adr,
                rating: p.rating,
                kast: p.kast,
                hsRate: p.hsRate,
                entryKills: p.entry_kills,
                entryDeaths: p.entry_deaths,
                totalDamage: p.total_damage,
                mvp: p.isMvp || false,
                evp: p.isEvp || false
            };
        });
    };

    const downloadScoreboardJson = () => {
        setDownloading('scoreboard_json');
        const data = getScoreboardData();
        triggerDownload(JSON.stringify(data, null, 4), `scoreboard_processed_${baseFilename}.json`, 'application/json;charset=utf-8;');
        setDownloading(null);
    };

    const downloadScoreboardCsv = () => {
        setDownloading('scoreboard_csv');
        const data = getScoreboardData();
        const headers = ['Team', 'Player', 'K', 'D', 'A', '+/-', 'ADR', 'Rating', 'KAST%', 'HS%', 'Entry Kills', 'Entry Deaths', 'MVP', 'EVP'];
        const rows = [headers.join(',')];
        
        data.forEach(p => {
            const kdDiff = p.kills - p.deaths;
            rows.push([
                p.team,
                `"${p.name.replace(/"/g, '""')}"`,
                p.kills,
                p.deaths,
                p.assists,
                kdDiff > 0 ? `+${kdDiff}` : kdDiff,
                p.adr,
                p.rating,
                p.kast,
                p.hsRate,
                p.entryKills,
                p.entryDeaths,
                p.mvp ? 'Yes' : 'No',
                p.evp ? 'Yes' : 'No'
            ].join(','));
        });

        const csvContent = "\uFEFF" + rows.join('\n'); // Add BOM for Excel
        triggerDownload(csvContent, `scoreboard_${baseFilename}.csv`, 'text/csv;charset=utf-8;');
        setDownloading(null);
    };

    // 3. Performance Processed
    const getPerformanceData = () => {
        return allPlayers.map(p => {
            const isEnemy = match.enemyPlayers.some(ep => ep.playerId === p.playerId);
            const name = p.steamid && resolveName(p.steamid) !== p.steamid ? resolveName(p.steamid) : resolveName(p.playerId);
            const statsResult = calculatePlayerStats(p.playerId, [{ match, stats: p }], 'ALL');
            const role = identifyRole(statsResult.filtered);
            
            const multiKills = p.multikills || { k2: 0, k3: 0, k4: 0, k5: 0 };
            const totalMulti = (multiKills.k2||0) + (multiKills.k3||0) + (multiKills.k4||0) + (multiKills.k5||0);
            
            const clutches = p.clutches || { '1v1': { won: 0, lost: 0 }, '1v2': { won: 0, lost: 0 }, '1v3': { won: 0, lost: 0 }, '1v4': { won: 0, lost: 0 }, '1v5': { won: 0, lost: 0 } };
            const clutchWinCount = (clutches['1v1']?.won || 0) + (clutches['1v2']?.won || 0) + (clutches['1v3']?.won || 0) + (clutches['1v4']?.won || 0) + (clutches['1v5']?.won || 0);

            return {
                playerId: p.playerId,
                steamid: p.steamid,
                name,
                team: isEnemy ? teamThemName : teamUsName,
                role: role.name,
                roleDescription: role.description,
                entryKills: p.entry_kills || 0,
                totalMulti,
                multiKills,
                clutchWinCount,
                clutches,
                abilityScores: {
                    firepower: statsResult?.filtered?.scoreFirepower || 0,
                    entry: statsResult?.filtered?.scoreEntry || 0,
                    sniper: statsResult?.filtered?.scoreSniper || 0,
                    clutch: statsResult?.filtered?.scoreClutch || 0,
                    opening: statsResult?.filtered?.scoreOpening || 0,
                    trade: statsResult?.filtered?.scoreTrade || 0,
                    utility: statsResult?.filtered?.scoreUtility || 0
                }
            };
        });
    };

    const downloadPerformanceJson = () => {
        setDownloading('performance');
        const data = getPerformanceData();
        triggerDownload(JSON.stringify(data, null, 4), `performance_processed_${baseFilename}.json`, 'application/json;charset=utf-8;');
        setDownloading(null);
    };

    // 4. Timeline Processed
    const getTimelineData = () => {
        return match.rounds?.map(round => {
            return {
                roundNumber: round.roundNumber,
                winnerSide: round.winnerSide,
                winReason: round.winReason,
                durationSeconds: round.duration,
                equipValueUs: round.equip_value_us,
                equipValueThem: round.equip_value_them,
                events: round.timeline.map(e => ({
                    tick: e.tick,
                    seconds: e.seconds,
                    type: e.type,
                    subject: e.subject ? { name: e.subject.name, side: e.subject.side, steamid: e.subject.steamid } : null,
                    target: e.target ? { name: e.target.name, side: e.target.side, steamid: e.target.steamid } : null,
                    weapon: e.weapon || null,
                    damage: e.damage || null,
                    hitgroup: e.hitgroup || null,
                    isHeadshot: e.isHeadshot || false,
                    isWallbang: e.isWallbang || false,
                    isBlind: e.isBlind || false,
                    isSmoke: e.isSmoke || false,
                    winProb: e.winProb || null
                }))
            };
        }) || [];
    };

    const downloadTimelineJson = () => {
        setDownloading('timeline');
        const data = getTimelineData();
        triggerDownload(JSON.stringify(data, null, 4), `timeline_processed_${baseFilename}.json`, 'application/json;charset=utf-8;');
        setDownloading(null);
    };

    // 5. Duels Processed
    const getDuelsData = () => {
        const duelsList: any[] = [];
        match.players.forEach(p => {
            const pName = p.steamid && resolveName(p.steamid) !== p.steamid ? resolveName(p.steamid) : resolveName(p.playerId);
            match.enemyPlayers.forEach(ep => {
                const epName = ep.steamid && resolveName(ep.steamid) !== ep.steamid ? resolveName(ep.steamid) : resolveName(ep.playerId);
                const record = (ep.steamid && p.duels[ep.steamid]) || { kills: 0, deaths: 0 };
                if (record.kills > 0 || record.deaths > 0) {
                    duelsList.push({
                        player: pName,
                        playerTeam: teamUsName,
                        opponent: epName,
                        opponentTeam: teamThemName,
                        kills: record.kills,
                        deaths: record.deaths,
                        netDiff: record.kills - record.deaths
                    });
                }
            });
        });
        return duelsList;
    };

    const downloadDuelsJson = () => {
        setDownloading('duels');
        const data = getDuelsData();
        triggerDownload(JSON.stringify(data, null, 4), `duels_processed_${baseFilename}.json`, 'application/json;charset=utf-8;');
        setDownloading(null);
    };

    // 6. Utility Processed
    const getUtilityData = () => {
        return allPlayers.map(p => {
            const isEnemy = match.enemyPlayers.some(ep => ep.playerId === p.playerId);
            const name = p.steamid && resolveName(p.steamid) !== p.steamid ? resolveName(p.steamid) : resolveName(p.playerId);
            return {
                playerId: p.playerId,
                steamid: p.steamid,
                name,
                team: isEnemy ? teamThemName : teamUsName,
                smokesThrown: p.utility.smokesThrown,
                flashesThrown: p.utility.flashesThrown,
                enemiesBlinded: p.utility.enemiesBlinded,
                blindDurationSeconds: p.utility.blindDuration,
                heThrown: p.utility.heThrown,
                heDamage: p.utility.heDamage,
                molotovsThrown: p.utility.molotovsThrown,
                molotovDamage: p.utility.molotovDamage,
                flashAssists: p.flash_assists || 0,
                totalUtilityDamage: p.utility.heDamage + p.utility.molotovDamage
            };
        });
    };

    const downloadUtilityJson = () => {
        setDownloading('utility');
        const data = getUtilityData();
        triggerDownload(JSON.stringify(data, null, 4), `utility_processed_${baseFilename}.json`, 'application/json;charset=utf-8;');
        setDownloading(null);
    };

    // 7. Clutches Processed
    const getClutchesData = () => {
        return allPlayers.map(p => {
            const isEnemy = match.enemyPlayers.some(ep => ep.playerId === p.playerId);
            const name = p.steamid && resolveName(p.steamid) !== p.steamid ? resolveName(p.steamid) : resolveName(p.playerId);
            return {
                playerId: p.playerId,
                steamid: p.steamid,
                name,
                team: isEnemy ? teamThemName : teamUsName,
                clutchSummary: p.clutches,
                clutchHistory: p.clutchHistory?.map(h => ({
                    round: h.round,
                    opponentCount: h.opponentCount,
                    result: h.result,
                    kills: h.kills,
                    side: h.side,
                    mapName: h.mapName
                })) || []
            };
        });
    };

    const downloadClutchesJson = () => {
        setDownloading('clutches');
        const data = getClutchesData();
        triggerDownload(JSON.stringify(data, null, 4), `clutches_processed_${baseFilename}.json`, 'application/json;charset=utf-8;');
        setDownloading(null);
    };

    // Combined download
    const downloadAllCombined = () => {
        setDownloading('all');
        const combined = {
            exportMeta: {
                exportedAt: new Date().toISOString(),
                mapId: match.mapId,
                date: match.date,
                score: match.score,
                result: match.result,
                source: match.source,
                teamUs: teamUsName,
                teamThem: teamThemName
            },
            rawMatchData: getRawData(),
            processedViews: {
                scoreboard: getScoreboardData(),
                performance: getPerformanceData(),
                timeline: getTimelineData(),
                duels: getDuelsData(),
                utility: getUtilityData(),
                clutches: getClutchesData()
            }
        };
        triggerDownload(JSON.stringify(combined, null, 4), `complete_match_package_${baseFilename}.json`, 'application/json;charset=utf-8;');
        setDownloading(null);
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
                    <div>
                        <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            比赛数据多维导出工具
                        </h3>
                        <p className="text-xs text-neutral-400 mt-1">支持导出原始全量数据以及各分析板块的处理后定制数据</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    
                    {/* Big Package Download Button */}
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-blue-800 dark:text-blue-400">打包导出全量一键包</h4>
                            <p className="text-[11px] text-blue-600 dark:text-blue-500 leading-relaxed">
                                将包含原始 Demo 数据与 战报、表现、时间轴、对位、道具、残局 的全部处理后统计合并到一个大 JSON 中，最适合数据深度复盘分析。
                            </p>
                        </div>
                        <button
                            onClick={downloadAllCombined}
                            disabled={downloading !== null}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                        >
                            {downloading === 'all' ? (
                                <span className="animate-pulse">正在生成...</span>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    一键打包下载 (JSON)
                                </>
                            )}
                        </button>
                    </div>

                    <div className="text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-100 dark:border-neutral-800 pb-2">
                        拆分数据源导出
                    </div>

                    {/* Exporters List */}
                    <div className="grid grid-cols-1 gap-3">
                        
                        {/* 1. Raw JSON */}
                        <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex items-center justify-between gap-4 bg-white dark:bg-neutral-900/40 hover:border-blue-500/20 transition-all">
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black font-mono bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">JSON</span>
                                    <h5 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">1. 比赛原始全量数据</h5>
                                </div>
                                <p className="text-[11px] text-neutral-400">包含完整的 Demo 数据源或解析库产生的最底层结构化信息。</p>
                            </div>
                            <button
                                onClick={downloadRawData}
                                disabled={downloading !== null}
                                className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shrink-0"
                            >
                                {downloading === 'raw' ? '导出中...' : '下载'}
                            </button>
                        </div>

                        {/* 2. Scoreboard Processed */}
                        <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex items-center justify-between gap-4 bg-white dark:bg-neutral-900/40 hover:border-blue-500/20 transition-all">
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black font-mono bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400">JSON / CSV</span>
                                    <h5 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">2. 战报 (Scoreboard) 数据</h5>
                                </div>
                                <p className="text-[11px] text-neutral-400">包含两队所有选手的杀/死/助、ADR、Rating 3.0、首杀、KAST 与爆头率。</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={downloadScoreboardCsv}
                                    disabled={downloading !== null}
                                    className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs px-3 py-2 rounded-xl transition-all"
                                >
                                    CSV
                                </button>
                                <button
                                    onClick={downloadScoreboardJson}
                                    disabled={downloading !== null}
                                    className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs px-3 py-2 rounded-xl transition-all"
                                >
                                    JSON
                                </button>
                            </div>
                        </div>

                        {/* 3. Performance Processed */}
                        <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex items-center justify-between gap-4 bg-white dark:bg-neutral-900/40 hover:border-blue-500/20 transition-all">
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black font-mono bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">JSON</span>
                                    <h5 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">3. 表现 (Performance) 能力分析</h5>
                                </div>
                                <p className="text-[11px] text-neutral-400">包含多杀及残局胜数统计、选手角色定位分类，以及火力/首杀/道具等七维能力评分。</p>
                            </div>
                            <button
                                onClick={downloadPerformanceJson}
                                disabled={downloading !== null}
                                className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shrink-0"
                            >
                                {downloading === 'performance' ? '导出中...' : '下载'}
                            </button>
                        </div>

                        {/* 4. Timeline Processed */}
                        <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex items-center justify-between gap-4 bg-white dark:bg-neutral-900/40 hover:border-blue-500/20 transition-all">
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black font-mono bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">JSON</span>
                                    <h5 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">4. 时间轴 (Timeline) 详细回合流</h5>
                                </div>
                                <p className="text-[11px] text-neutral-400">包含每个回合的经济配备、胜方/获胜方式、以及详细事件流（击杀、下包、拆包及对应时机）。</p>
                            </div>
                            <button
                                onClick={downloadTimelineJson}
                                disabled={downloading !== null}
                                className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shrink-0"
                            >
                                {downloading === 'timeline' ? '导出中...' : '下载'}
                            </button>
                        </div>

                        {/* 5. Duels Processed */}
                        <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex items-center justify-between gap-4 bg-white dark:bg-neutral-900/40 hover:border-blue-500/20 transition-all">
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black font-mono bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">JSON</span>
                                    <h5 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">5. 选手对位 (Duels) 击杀矩阵</h5>
                                </div>
                                <p className="text-[11px] text-neutral-400">提取我方选手与敌方选手两两之间在全场对局中的 1v1 交火击杀与被杀次数关系。</p>
                            </div>
                            <button
                                onClick={downloadDuelsJson}
                                disabled={downloading !== null}
                                className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shrink-0"
                            >
                                {downloading === 'duels' ? '导出中...' : '下载'}
                            </button>
                        </div>

                        {/* 6. Utility Processed */}
                        <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex items-center justify-between gap-4 bg-white dark:bg-neutral-900/40 hover:border-blue-500/20 transition-all">
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black font-mono bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">JSON</span>
                                    <h5 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">6. 道具 (Utility) 效能统计</h5>
                                </div>
                                <p className="text-[11px] text-neutral-400">包含烟/闪/雷/火的投掷数量明细、造成的伤害，以及致盲人数/总时长和闪光助攻。</p>
                            </div>
                            <button
                                onClick={downloadUtilityJson}
                                disabled={downloading !== null}
                                className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shrink-0"
                            >
                                {downloading === 'utility' ? '导出中...' : '下载'}
                            </button>
                        </div>

                        {/* 7. Clutches Processed */}
                        <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex items-center justify-between gap-4 bg-white dark:bg-neutral-900/40 hover:border-blue-500/20 transition-all">
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black font-mono bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">JSON</span>
                                    <h5 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">7. 残局 (Clutches) 尝试历史</h5>
                                </div>
                                <p className="text-[11px] text-neutral-400">记录每个选手每次经历 1vN (N=1..5) 残局时的胜负判定以及击杀数明细。</p>
                            </div>
                            <button
                                onClick={downloadClutchesJson}
                                disabled={downloading !== null}
                                className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shrink-0"
                            >
                                {downloading === 'clutches' ? '导出中...' : '下载'}
                            </button>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-900/40 border-t border-neutral-100 dark:border-neutral-800 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold text-xs transition-colors shadow-sm"
                    >
                        关闭
                    </button>
                </div>

            </div>
        </div>
    );
};
