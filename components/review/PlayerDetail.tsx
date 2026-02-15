
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PlayerMatchStats, Match } from '../../types';
import { getMapDisplayName, getRatingColorClass } from './ReviewShared';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { getValueStyleClass } from '../../utils/styleConstants';
import { generatePlayerAnalysis } from '../../services/ai/agents/playerReportAgent';
import { getAIConfig, getSelectedModel } from '../../services/ai/config';
import { PlayerAnalysisReport } from '../../services/ai/types';
import { ConfirmModal } from '../ConfirmModal';
import { AiConfigModal } from '../AiConfigModal'; // Import local config modal
import { AbilityType } from './player_detail/config';
import { RadarChart, AbilityRow, DetailCard, StatCard } from './player_detail/PlayerDetailSubComponents';

interface PlayerDetailProps {
    profile: any;
    history: { match: Match, stats: PlayerMatchStats }[];
    onBack: () => void;
    onMatchClick: (match: Match) => void;
}

type SideFilter = 'ALL' | 'CT' | 'T';

export const PlayerDetail: React.FC<PlayerDetailProps> = ({ profile, history, onBack, onMatchClick }) => {
    const [sideFilter, setSideFilter] = useState<SideFilter>('ALL');
    const [selectedAbility, setSelectedAbility] = useState<AbilityType>('firepower');
    
    // AI Report State
    const [analysis, setAnalysis] = useState<PlayerAnalysisReport | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [showAiConfig, setShowAiConfig] = useState(false); // Local config state

    // Check Config
    const aiConfig = getAIConfig();
    const hasApiKey = !!aiConfig.apiKey;
    const currentModel = getSelectedModel();

    // Confirm Modal State
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    // Use custom hook for logic
    const { overall, filtered } = usePlayerStats(profile.id, history, sideFilter);

    // Load saved report from localStorage on mount or when key filters change
    useEffect(() => {
        const key = `tacbook_ai_report_v2_${profile.id}_${sideFilter}`; // Changed key for v2 structure
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                setAnalysis(JSON.parse(saved));
            } catch (e) {
                setAnalysis(null);
            }
        } else {
            setAnalysis(null);
        }
    }, [profile.id, sideFilter]);

    // Optimized Order for Radar Chart
    const abilities: { id: AbilityType, label: string, value: number, isPct?: boolean }[] = [
        { id: 'firepower', label: '火力', value: filtered.scoreFirepower }, 
        { id: 'entry', label: '破点', value: filtered.scoreEntry }, 
        { id: 'sniper', label: '狙击', value: filtered.scoreSniper }, 
        { id: 'clutch', label: '残局', value: filtered.scoreClutch }, 
        { id: 'opening', label: '开局', value: filtered.scoreOpening, isPct: false }, 
        { id: 'trade', label: '补枪', value: filtered.scoreTrade }, 
        { id: 'utility', label: '道具', value: filtered.scoreUtility }, 
    ];

    const selectedScore = abilities.find(a => a.id === selectedAbility)?.value || 0;

    const runAnalysis = async () => {
        if (!getAIConfig().apiKey) {
            setShowAiConfig(true);
            return;
        }

        setIsAnalyzing(true);
        setAnalysisError(null);
        
        try {
            const result = await generatePlayerAnalysis(profile, { overall, filtered });
            setAnalysis(result);
            // Save to localStorage
            const key = `tacbook_ai_report_v2_${profile.id}_${sideFilter}`;
            localStorage.setItem(key, JSON.stringify(result));
            
        } catch (e: any) {
            console.error(e);
            setAnalysisError(e.message || "生成失败");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRegenerate = () => {
        setConfirmConfig({
            isOpen: true,
            title: "重新生成报告",
            message: "重新生成将消耗 Token，且会覆盖当前已保存的报告。是否继续？",
            onConfirm: () => {
                setAnalysis(null);
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                runAnalysis();
            }
        });
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20 font-sans">
            
            {/* 1. Header Toolbar */}
            <div className="sticky top-[56px] z-30 bg-neutral-50/95 dark:bg-neutral-950/95 backdrop-blur-md py-3 -mx-4 px-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                 <button 
                    onClick={onBack}
                    className="flex items-center text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    BACK
                </button>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsReportOpen(true)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-sm ${
                            analysis 
                            ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700' 
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-transparent'
                        }`}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <span>{analysis ? '查看 AI 报告' : 'AI 深度分析'}</span>
                    </button>
                    
                    <div className="flex p-0.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg">
                        {(['ALL', 'CT', 'T'] as const).map(side => (
                            <button
                                key={side}
                                onClick={() => setSideFilter(side)}
                                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${sideFilter === side ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
                            >
                                {side}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2. Hero Card: Profile & Rating */}
            <div className="bg-white dark:bg-neutral-900 rounded-3xl p-1 shadow-sm border border-neutral-200 dark:border-neutral-800">
                <div className="bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-neutral-800 dark:via-neutral-900 dark:to-black rounded-[20px] p-6 relative overflow-hidden">
                    {/* Background Deco */}
                    <div className="absolute top-0 right-0 p-10 opacity-5 dark:opacity-10 pointer-events-none">
                         <span className="text-9xl font-black">{profile.id[0]}</span>
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        {/* Profile Info */}
                        <div className="flex items-center gap-5">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-4xl font-black text-white shadow-xl shadow-blue-500/20 shrink-0">
                                {profile.id[0]}
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-neutral-900 dark:text-white leading-none tracking-tight">{profile.id}</h1>
                                <p className="text-sm text-neutral-500 font-medium mt-1 mb-2">{profile.role}</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-neutral-400 border border-neutral-200 dark:border-neutral-700 px-1.5 py-0.5 rounded">
                                        {profile.matches} MAPS
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Big Rating */}
                        <div className="flex items-center gap-6 md:gap-8 bg-white/50 dark:bg-black/20 p-4 rounded-2xl backdrop-blur-sm border border-neutral-100 dark:border-neutral-800">
                            <div className="text-center">
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Rating 4.0</div>
                                <div className={`text-5xl font-black tracking-tighter tabular-nums ${getRatingColorClass(overall.rating)}`}>
                                    {overall.rating.toFixed(2)}
                                </div>
                            </div>
                            <div className="h-10 w-px bg-neutral-300 dark:bg-neutral-700"></div>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between gap-4 text-xs font-mono font-bold">
                                    <span className="text-blue-500">CT</span>
                                    <span className="text-neutral-700 dark:text-neutral-300">{overall.ctRating.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 text-xs font-mono font-bold">
                                    <span className="text-yellow-600 dark:text-yellow-500">T</span>
                                    <span className="text-neutral-700 dark:text-neutral-300">{overall.tRating.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard label="ADR" value={filtered.adr.toFixed(1)} subLabel="Damage / Round" colorClass={getValueStyleClass(filtered.adr, [95, 80, 65])} />
                <StatCard label="K/D Ratio" value={filtered.kdr.toFixed(2)} subLabel="Kill / Death" colorClass={getValueStyleClass(filtered.kdr, [1.3, 1.1, 0.9])} />
                <StatCard label="KAST" value={`${filtered.kast.toFixed(1)}%`} subLabel="Consistency" colorClass={getValueStyleClass(filtered.kast, [78, 72, 65])} />
                <StatCard label="WPA" value={(filtered.wpaAvg > 0 ? '+' : '') + filtered.wpaAvg.toFixed(1) + '%'} subLabel="Win Prob Added" colorClass={getValueStyleClass(filtered.wpaAvg, [5, 2, -2])} />
                <StatCard label="Multi-Kill" value={`${filtered.multiKillRate.toFixed(1)}%`} subLabel="2+ Kills Rounds" colorClass={getValueStyleClass(filtered.multiKillRate, [22, 17, 12])} />
                <StatCard label="DPR" value={filtered.dpr.toFixed(2)} subLabel="Deaths / Round" colorClass={getValueStyleClass(filtered.dpr, [0.58, 0.66, 0.75], 'text', true)} />
            </div>

            {/* 4. Ability Analysis (Split Layout) */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        综合能力评估
                    </h3>
                    <div className="text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">点击条目查看详情</div>
                </div>
                
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Left: Radar */}
                    <div className="flex justify-center p-2 lg:w-1/3">
                        <RadarChart data={abilities} size={300} />
                    </div>

                    {/* Middle: Selectable List */}
                    <div className="flex-1 space-y-2 w-full">
                        {abilities.map((ability) => (
                            <AbilityRow 
                                key={ability.id} 
                                label={ability.label} 
                                value={ability.value} 
                                isPercentage={ability.isPct}
                                isSelected={selectedAbility === ability.id}
                                onClick={() => setSelectedAbility(ability.id)}
                            />
                        ))}
                    </div>

                    {/* Right: Detailed Card */}
                    <div className="lg:w-1/3 min-h-[300px] w-full">
                        <DetailCard type={selectedAbility} data={filtered.details} score={selectedScore} />
                    </div>
                </div>
            </div>

            {/* 5. Match History Ledger */}
            <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 px-1">近期比赛 History</h3>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800 shadow-sm">
                    {history.map(({ match, stats }) => {
                        const mapName = getMapDisplayName(match.mapId);
                        const kdDiff = stats.kills - stats.deaths;

                        // Calculate Result relative to this player
                        const isPlayerOnMyTeam = match.players.some(p => p.steamid === stats.steamid || p.playerId === stats.playerId);

                        let resultForPlayer = match.result;
                        if (match.result !== 'TIE') {
                            if (!isPlayerOnMyTeam) {
                                resultForPlayer = match.result === 'WIN' ? 'LOSS' : 'WIN';
                            }
                        }

                        const scoreLeft = isPlayerOnMyTeam ? match.score.us : match.score.them;
                        const scoreRight = isPlayerOnMyTeam ? match.score.them : match.score.us;
                        
                        const winColor = resultForPlayer === 'WIN' ? 'text-green-600 dark:text-green-500' : resultForPlayer === 'LOSS' ? 'text-red-500' : 'text-yellow-500';

                        return (
                            <div 
                                key={match.id} 
                                onClick={() => onMatchClick(match)}
                                className="p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-1.5 h-10 rounded-full ${resultForPlayer === 'WIN' ? 'bg-green-500' : resultForPlayer === 'LOSS' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-sm text-neutral-900 dark:text-white">{mapName}</span>
                                            <span className={`text-xs font-mono font-bold ${winColor}`}>{scoreLeft}:{scoreRight}</span>
                                        </div>
                                        <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{match.date.split('T')[0]}</div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-6 text-right">
                                    <div className="hidden sm:block">
                                        <div className="text-[9px] font-bold text-neutral-400 uppercase">ADR</div>
                                        <div className="text-xs font-mono font-bold text-neutral-600 dark:text-neutral-300">{stats.adr.toFixed(0)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-bold text-neutral-400 uppercase">K-D</div>
                                        <div className={`text-xs font-mono font-bold ${kdDiff > 0 ? 'text-green-500' : kdDiff < 0 ? 'text-red-500' : 'text-neutral-500'}`}>
                                            {stats.kills}-{stats.deaths}
                                        </div>
                                    </div>
                                    
                                    <div className={`w-14 text-right font-black font-mono text-lg ${getRatingColorClass(stats.rating)}`}>
                                        {stats.rating.toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* AI Report FULLSCREEN Interface */}
            {isReportOpen && (
                <div 
                    className="fixed inset-0 z-[300] bg-neutral-100 dark:bg-black overflow-y-auto animate-in fade-in duration-200"
                >
                    {/* Sticky Header */}
                    <div className="sticky top-0 z-20 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-lg">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-black text-lg text-neutral-900 dark:text-white leading-none">AI 表现评估</h3>
                                <p className="text-xs text-neutral-500 font-mono mt-0.5">TARGET: {profile.id}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {analysis && !isAnalyzing && (
                                <button
                                    onClick={handleRegenerate}
                                    className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                                    title="重新生成"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                </button>
                            )}
                            <button 
                                onClick={() => setIsReportOpen(false)}
                                className="p-2 bg-neutral-200 dark:bg-neutral-800 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                            >
                                <svg className="w-5 h-5 text-neutral-600 dark:text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>

                    <div className="max-w-4xl mx-auto p-6 md:p-10">
                        {analysisError ? (
                             <div className="flex flex-col items-center justify-center py-20 text-red-500">
                                 <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                 </div>
                                 <p className="text-lg font-bold">生成失败</p>
                                 <p className="text-sm opacity-70 mt-2 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg font-mono">{analysisError}</p>
                             </div>
                         ) : isAnalyzing ? (
                             <div className="flex flex-col items-center justify-center py-32 text-neutral-400">
                                 <div className="relative w-20 h-20 mb-8">
                                    <div className="absolute inset-0 border-4 border-neutral-200 dark:border-neutral-800 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                 </div>
                                 <h4 className="text-xl font-bold text-neutral-800 dark:text-white animate-pulse">正在深度分析比赛数据...</h4>
                                 <p className="text-sm opacity-50 mt-3 font-mono">{currentModel}</p>
                             </div>
                         ) : analysis ? (
                            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                                {/* 1. Summary Card */}
                                <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 shadow-xl border border-neutral-200 dark:border-neutral-800">
                                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">表现总结</h4>
                                    <p className="text-lg md:text-xl font-medium text-neutral-800 dark:text-neutral-100 leading-relaxed">
                                        {analysis.summary}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* 2. Strengths */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                            <h4 className="font-bold text-neutral-900 dark:text-white">高光表现</h4>
                                        </div>
                                        {analysis.strengths.map((item, i) => (
                                            <div key={i} className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border-l-4 border-green-500 shadow-sm">
                                                <div className="font-bold text-neutral-900 dark:text-white mb-2">{item.title}</div>
                                                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{item.description}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* 3. Weaknesses */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            </div>
                                            <h4 className="font-bold text-neutral-900 dark:text-white">改进建议</h4>
                                        </div>
                                        {analysis.weaknesses.map((item, i) => (
                                            <div key={i} className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border-l-4 border-orange-500 shadow-sm">
                                                <div className="font-bold text-neutral-900 dark:text-white mb-2">{item.title}</div>
                                                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{item.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 4. Role Evaluation */}
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-3xl p-8 border border-blue-100 dark:border-blue-900/30">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                                            Role: {profile.role}
                                        </div>
                                        <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 uppercase tracking-widest">职责评估</h4>
                                    </div>
                                    <p className="text-neutral-700 dark:text-neutral-300 leading-8">
                                        {analysis.roleEvaluation}
                                    </p>
                                </div>
                            </div>
                         ) : (
                            // Empty State
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 mb-8 transform rotate-3 hover:rotate-6 transition-transform duration-500">
                                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                </div>
                                <div className="max-w-md space-y-4 mb-8">
                                    <h3 className="text-3xl font-black text-neutral-900 dark:text-white">生成专属表现评估</h3>
                                    <p className="text-base text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                        AI 将基于当前筛选的 <span className="font-bold text-neutral-800 dark:text-white">{sideFilter === 'ALL' ? '全场' : sideFilter}</span> 数据，深度分析 {profile.id} 的各项能力指标。
                                    </p>
                                </div>
                                
                                <div className="flex gap-3">
                                    <button 
                                        onClick={runAnalysis}
                                        className="px-10 py-4 bg-neutral-900 dark:bg-white text-white dark:text-black font-bold text-lg rounded-2xl hover:scale-105 transition-transform shadow-xl flex items-center gap-2"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        开始生成报告
                                    </button>
                                    <button
                                        onClick={() => setShowAiConfig(true)}
                                        className="p-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-2xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                                        title="API 设置"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.572 1.065c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </button>
                                </div>
                                <div className="mt-6 text-xs text-neutral-400 font-mono">
                                    Current Model: {currentModel}
                                </div>
                             </div>
                         )}
                    </div>
                </div>
            )}
            
            <ConfirmModal 
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            />

            {/* Local Instance of Config Modal for Shortcut */}
            {showAiConfig && (
                <AiConfigModal 
                    onClose={() => setShowAiConfig(false)}
                    onSave={() => setShowAiConfig(false)}
                />
            )}
        </div>
    );
};
