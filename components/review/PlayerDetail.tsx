import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PlayerMatchStats, Match } from '../../types';
import { getMapDisplayName, getRatingColorClass } from './ReviewShared';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { getScoreStyle, getValueStyleClass, getScoreHex } from '../../utils/styleConstants';
import { generatePlayerAnalysis } from '../../services/ai/agents/playerReportAgent';
import { getAIConfig } from '../../services/ai/config';
import { ConfirmModal } from '../ConfirmModal';

interface PlayerDetailProps {
    profile: any;
    history: { match: Match, stats: PlayerMatchStats }[];
    onBack: () => void;
    onMatchClick: (match: Match) => void;
}

type SideFilter = 'ALL' | 'CT' | 'T';
type AbilityType = 'firepower' | 'entry' | 'trade' | 'opening' | 'clutch' | 'sniper' | 'utility';

// --- Configuration ---

const ABILITY_INFO: Record<AbilityType, { 
    title: string, 
    desc: string, 
    metrics: { label: string, key: string, format?: string }[],
    evaluations: { outstanding: string, excellent: string, ordinary: string, poor: string }
}> = {
    firepower: {
        title: "火力",
        desc: "玩家的原始输出能力，得分基于击杀、伤害和多杀。这是属于明星选手的指标——或者那些手感正热的玩家。在这里生存率完全不重要；这纯粹是关于杀敌。",
        metrics: [
            { label: "回合击杀", key: "kpr", format: "0.00" },
            { label: "有击杀回合", key: "roundsWithKills", format: "0" },
            { label: "胜局击杀", key: "kprWin", format: "0.00" },
            { label: "Rating", key: "rating", format: "0.00" },
            { label: "回合伤害", key: "dpr", format: "0.0" },
            { label: "多杀回合", key: "multiKillRounds", format: "0" },
            { label: "胜局伤害", key: "dprWin", format: "0.0" },
            { label: "手枪局评分", key: "pistolRating", format: "0.00" },
        ],
        evaluations: {
            outstanding: "恐怖的火力输出机器，能在任何局势下摧毁对手防线。",
            excellent: "极为可靠的核心输出，能够持续提供高质量击杀。",
            ordinary: "具备基本的对枪能力，发挥稳定但缺乏爆发力。",
            poor: "正面交火能力较弱，难以在对枪中取得优势。"
        }
    },
    entry: {
        title: "破点",
        desc: "玩家为了队友而被牺牲的可能性。高分玩家通常是那些率先通过危险拐角（往往知道必死无疑）的人，或者是回合中期为了给明星队友拉扯空间而冲进包点的人。得分基于被补枪的死亡以及每回合被队友“救援”的频率。",
        metrics: [
            { label: "回合被队友救援数", key: "savedByTeammatePerRound", format: "0.00" },
            { label: "回合被补枪死亡数", key: "tradedDeathsPerRound", format: "0.00" },
            { label: "被补枪死亡占比", key: "tradedDeathsPct", format: "0.0%" },
            { label: "首死被补枪占比", key: "openingDeathsTradedPct", format: "0.0%" },
            { label: "回合助攻", key: "assistsPerRound", format: "0.00" },
            { label: "辅助回合", key: "supportRounds", format: "0" },
        ],
        evaluations: {
            outstanding: "顶级的突破专家，总能撕开缺口并为队友创造收割机会。",
            excellent: "优秀的破点手，敢于承担风险并有效拉扯防守阵型。",
            ordinary: "能够执行基本的突破任务，但在高压下生存率较低。",
            poor: "在突破位上表现挣扎，容易白给且难以换取有效信息。"
        }
    },
    trade: {
        title: "补枪",
        desc: "通常被称为“卖队友的人”，但这并非贬义词。能够通过补枪置换对手是职业 CS 中的一项关键技能。这里的关键在于补枪击杀，以及在队友受到伤害时及时救援队友的能力。",
        metrics: [
            { label: "回合救援队友数", key: "savedTeammatePerRound", format: "0.00" },
            { label: "回合补枪数", key: "tradeKillsPerRound", format: "0.00" },
            { label: "补枪占比", key: "tradeKillsPct", format: "0.0%" },
            { label: "助攻占比", key: "assistPct", format: "0.0%" },
            { label: "单杀伤害", key: "damagePerKill", format: "0.0" },
        ],
        evaluations: {
            outstanding: "完美的补枪效率，队友倒下的瞬间必定完成人头置换。",
            excellent: "嗅觉敏锐，能够紧跟队友节奏并及时完成补枪。",
            ordinary: "能完成基础补枪，但反应速度和位置选择有时欠佳。",
            poor: "补枪意识薄弱，经常出现脱节导致无法及时止损。"
        }
    },
    opening: {
        title: "开局",
        desc: "玩家通过回合早期的首杀来改变战局的可能性。鉴于职业比赛中 5 打 4 的胜率平均超过 70%，侵略性是每支队伍都需要的技能组合。得分基于每回合首杀和首杀尝试。",
        metrics: [
            { label: "回合首杀", key: "openingKillsPerRound", format: "0.00" },
            { label: "回合首死", key: "openingDeathsPerRound", format: "0.00" },
            { label: "首杀尝试", key: "openingAttempts", format: "0" },
            { label: "首杀成功率", key: "openingSuccessPct", format: "0.0%" },
            { label: "首杀后胜率", key: "winPctAfterOpening", format: "0.0%" },
            { label: "回合进攻次数", key: "attacksPerRound", format: "0.00" },
        ],
        evaluations: {
            outstanding: "开局杀手，极高的首杀成功率让队伍在回合初期即占据巨大优势。",
            excellent: "具备很强的首杀能力，经常能为队伍拿到人数优势。",
            ordinary: "偶尔尝试首杀，但成功率和风险控制较为平庸。",
            poor: "首杀尝试极其低效，甚至经常因激进而送出首死。"
        }
    },
    clutch: {
        title: "残局",
        desc: "回合后期选手和 1vN 专家，那些在下包后的防守和回防中值得信赖、能扭转乾坤的玩家。得分主要基于赢下的残局，并加入了一项风格化的衡量标准——“每回合存活时间”，以识别那些擅长活到最后的专家。",
        metrics: [
            { label: "回合残局分", key: "clutchPointsPerRound", format: "0.00" },
            { label: "存活至最后占比", key: "lastAlivePct", format: "0.0%" },
            { label: "1v1 胜率", key: "win1v1Pct", format: "0.0%" },
            { label: "回合存活时间", key: "timeAlivePerRound", format: "0.0s" },
            { label: "败局保枪数", key: "savesPerLoss", format: "0.00" },
        ],
        evaluations: {
            outstanding: "残局大师，拥有令人窒息的冷静和顶级的大脑，总能创造奇迹。",
            excellent: "残局处理非常老练，在少打多局面下依然极具威胁。",
            ordinary: "能够处理简单的残局，但在复杂博弈中容易失误。",
            poor: "残局心态容易崩盘，缺乏在关键时刻扭转局势的能力。"
        }
    },
    sniper: {
        title: "狙击",
        desc: "主狙击手。基于使用 AWP 和 SSG-08 的击杀及多杀数据。低分代表步枪手，中分代表混合型选手，高分则代表纯粹的专职狙击手。",
        metrics: [
            { label: "回合狙杀", key: "sniperKillsPerRound", format: "0.00" },
            { label: "狙杀占比", key: "sniperKillsPct", format: "0.0%" },
            { label: "有狙杀回合占比", key: "roundsWithSniperKillsPct", format: "0.0%" },
            { label: "狙击多杀回合", key: "sniperMultiKillRounds", format: "0" },
            { label: "回合狙击首杀", key: "sniperOpeningKillsPerRound", format: "0.00" },
        ],
        evaluations: {
            outstanding: "统治级狙击手，这把AWP就是对手无法逾越的禁区。",
            excellent: "精准且极具威慑力，能利用大狙有效控制关键区域。",
            ordinary: "具备基础狙击能力，但空枪率较高或走位不够灵活。",
            poor: "不适合担任主狙，经济投入与击杀回报严重不成正比。"
        }
    },
    utility: {
        title: "道具",
        desc: "一方的投掷手。在现代 CS 中有多种方式来提供“辅助”，但道具的使用仍然是其中的核心特征。总分结合了闪光弹统计数据和每回合的手雷伤害。",
        metrics: [
            { label: "回合道具伤害", key: "utilDmgPerRound", format: "0.0" },
            { label: "每百回合道具击杀", key: "utilKillsPer100", format: "0.00" },
            { label: "回合投掷闪光数", key: "flashesPerRound", format: "0.00" },
            { label: "回合闪光助攻", key: "flashAssistsPerRound", format: "0.00" },
            { label: "回合致盲敌人时间", key: "blindTimePerRound", format: "0.00s" },
        ],
        evaluations: {
            outstanding: "道具管理大师，每一颗投掷物都能完美配合战术意图。",
            excellent: "道具运用娴熟，能有效利用闪光和烟雾辅助队友。",
            ordinary: "掌握常规投掷物，但在瞬息万变的战局中缺乏灵性。",
            poor: "道具使用极其匮乏或经常失误，对团队战术支持有限。"
        }
    },
};

// --- Sub Components ---

const RadarChart = ({ data, size = 260 }: { data: { value: number; label: string; [key: string]: any }[]; size?: number }) => {
    const center = size / 2;
    // Reduce padding to make chart bigger within the SVG
    const radius = size / 2 - 20; 
    const sides = 7;
    const angleStep = (2 * Math.PI) / sides;

    const getPoint = (index: number, val: number, offsetRadius: number = 0) => {
        // -Math.PI / 2 starts at top (12 o'clock)
        const angle = -Math.PI / 2 + index * angleStep;
        // Clamp value to 0-100 visually for the chart shape
        const clampedVal = Math.min(100, Math.max(0, val));
        const effectiveRadius = (radius + offsetRadius) * (clampedVal / 100);
        return {
            x: center + effectiveRadius * Math.cos(angle),
            y: center + effectiveRadius * Math.sin(angle),
            angle: angle
        };
    };

    // Generate grid points (25, 50, 75, 100)
    const gridLevels = [25, 50, 75, 100];
    
    // Generate data points
    const dataPoints = data.map((d, i) => getPoint(i, d.value));
    const pointsStr = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

    return (
        <div className="flex items-center justify-center">
            <svg width={size} height={size} className="overflow-visible">
                {/* Background Grid */}
                {gridLevels.map((level, lvlIdx) => (
                    <polygon
                        key={level}
                        points={Array.from({ length: sides }).map((_, i) => {
                            const p = getPoint(i, level);
                            return `${p.x},${p.y}`;
                        }).join(' ')}
                        fill={lvlIdx === gridLevels.length - 1 ? "rgba(100,100,100,0.05)" : "none"}
                        stroke="currentColor"
                        className="text-neutral-200 dark:text-neutral-800"
                        strokeWidth="1"
                        strokeDasharray={lvlIdx < gridLevels.length - 1 ? "2,2" : ""}
                    />
                ))}
                
                {/* Axes and Labels */}
                {Array.from({ length: sides }).map((_, i) => {
                    const p = getPoint(i, 100);
                    const labelPos = getPoint(i, 100, 20); // Push text out further
                    
                    // Determine text anchor based on position relative to center
                    let textAnchor: "middle" | "end" | "start" = "middle";
                    if (labelPos.x < center - 10) textAnchor = "end";
                    if (labelPos.x > center + 10) textAnchor = "start";
                    
                    // Determine baseline
                    let baseline: "middle" | "auto" | "hanging" = "middle";
                    if (labelPos.y < center - 10) baseline = "auto"; // Top
                    if (labelPos.y > center + 10) baseline = "hanging"; // Bottom

                    return (
                        <React.Fragment key={i}>
                            <line
                                x1={center}
                                y1={center}
                                x2={p.x}
                                y2={p.y}
                                stroke="currentColor"
                                className="text-neutral-200 dark:text-neutral-800"
                                strokeWidth="1"
                            />
                            <text
                                x={labelPos.x}
                                y={labelPos.y}
                                textAnchor={textAnchor}
                                dominantBaseline={baseline}
                                className="text-[10px] font-bold fill-neutral-500 dark:fill-neutral-400 font-sans"
                            >
                                {data[i].label}
                            </text>
                        </React.Fragment>
                    );
                })}

                {/* Data Shape */}
                <polygon
                    points={pointsStr}
                    fill="rgba(59, 130, 246, 0.2)" 
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    className="drop-shadow-sm"
                />
                
                {/* Data Points */}
                 {dataPoints.map((p, i) => (
                    <circle 
                        key={i} 
                        cx={p.x} 
                        cy={p.y} 
                        r="3" 
                        fill={getScoreHex(data[i].value)} 
                        stroke="white" 
                        strokeWidth="1"
                        className="dark:stroke-neutral-900"
                    />
                 ))}
            </svg>
        </div>
    );
};

interface AbilityRowProps {
    label: string;
    value: number;
    isPercentage?: boolean;
    isSelected: boolean;
    onClick: () => void;
}

const AbilityRow: React.FC<AbilityRowProps> = ({ label, value, isPercentage = false, isSelected, onClick }) => {
    const intValue = Math.round(Math.max(0, Math.min(100, value)));
    
    const barClass = getScoreStyle(value, 'bar');
    const textClass = getScoreStyle(value, 'text');

    return (
        <div 
            onClick={onClick}
            className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-sm' : 'border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}
        >
             <div className={`w-12 shrink-0 text-xs font-bold text-right truncate transition-colors ${isSelected ? 'text-black dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>
                 {label}
             </div>
             
             {/* Progress Track */}
             <div className="flex-1 relative h-3 bg-neutral-200 dark:bg-neutral-800 rounded-sm overflow-hidden group">
                 {/* Tier Markers (Background Lines) */}
                 <div className="absolute top-0 bottom-0 left-[40%] w-px bg-white/50 dark:bg-white/10 z-10"></div>
                 <div className="absolute top-0 bottom-0 left-[60%] w-px bg-white/50 dark:bg-white/10 z-10"></div>
                 <div className="absolute top-0 bottom-0 left-[80%] w-px bg-white/50 dark:bg-white/10 z-10"></div>
                 
                 {/* Average Marker (45%) */}
                 <div className="absolute top-0 bottom-0 left-[45%] w-0.5 bg-black/20 dark:bg-white/20 z-10"></div>
                 {/* Tooltip for Avg */}
                 <div className="absolute -top-4 left-[45%] -translate-x-1/2 text-[8px] font-mono text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                     AVG
                 </div>

                 {/* Fill */}
                 <div 
                    className={`h-full rounded-sm transition-all duration-1000 ease-out relative ${barClass}`} 
                    style={{ width: `${intValue}%` }}
                 >
                 </div>
             </div>
             
             {/* Score Value - Larger and Colored */}
             <div className={`w-12 shrink-0 text-right font-mono font-black text-lg leading-none ${textClass}`}>
                 {intValue}{isPercentage ? <span className="text-xs align-top text-neutral-400">%</span> : ''}
             </div>
        </div>
    );
};

const StatCard = ({ label, value, subLabel, colorClass }: { label: string, value: string | number, subLabel?: string, colorClass?: string }) => (
    <div className={`relative p-4 rounded-xl border flex flex-col items-center justify-center transition-all bg-neutral-50 dark:bg-neutral-900 border-transparent`}>
        <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">{label}</div>
        <div className={`text-2xl font-black font-mono tabular-nums leading-none tracking-tight ${colorClass || 'text-neutral-900 dark:text-white'}`}>
            {value}
        </div>
        {subLabel && <div className="text-[9px] text-neutral-400 font-medium mt-1">{subLabel}</div>}
    </div>
);

const MetricItem: React.FC<{ label: string, value: string | number }> = ({ label, value }) => (
    <div className="flex flex-col p-2 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-100 dark:border-neutral-800">
        <span className="text-[10px] text-neutral-400 font-medium mb-0.5">{label}</span>
        <span className="text-sm font-bold text-neutral-900 dark:text-white font-mono">{value}</span>
    </div>
);

const DetailCard = ({ type, data, score }: { type: AbilityType, data: any, score: number }) => {
    const info = ABILITY_INFO[type];
    
    const getEvaluation = (s: number) => {
        if (s >= 80) return info.evaluations.outstanding;
        if (s >= 60) return info.evaluations.excellent;
        if (s >= 40) return info.evaluations.ordinary;
        return info.evaluations.poor;
    };

    const evalClass = getScoreStyle(score, 'bg');
    const evalTextClass = getScoreStyle(score, 'text');

    // Helper to format values
    const formatValue = (key: string, fmt?: string) => {
        const val = data[key];
        if (val === undefined || isNaN(val)) return '-';
        if (fmt === '0.0%') return (val).toFixed(1) + '%';
        if (fmt === '0%') return (val).toFixed(0) + '%';
        if (fmt === '0.00') return (val).toFixed(2);
        if (fmt === '0.0') return (val).toFixed(1);
        if (fmt === '0.0s') return (val).toFixed(1) + 's';
        if (fmt === '0.00s') return (val).toFixed(2) + 's';
        return Math.round(val);
    };

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 border border-neutral-200 dark:border-neutral-700 h-full animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <h4 className="text-sm font-black uppercase mb-3 flex items-center justify-between text-neutral-900 dark:text-white">
                {info.title}
                <span className={`font-mono text-xl ${evalTextClass}`}>{Math.round(score)}</span>
            </h4>
            
            <div className="mb-4 bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-lg border border-neutral-100 dark:border-neutral-700/50 flex items-center gap-3">
                 <div className={`w-1 h-8 rounded-full ${evalClass.split(' ')[0]}`}></div>
                 <div className="flex-1">
                     <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">评价</div>
                     <div className="text-xs font-bold text-neutral-700 dark:text-neutral-200">
                         {getEvaluation(score)}
                     </div>
                 </div>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6 font-medium">
                {info.desc}
            </p>
            <div className="grid grid-cols-2 gap-2 mt-auto">
                {info.metrics.map((m, idx) => (
                    <MetricItem 
                        key={idx} 
                        label={m.label} 
                        value={formatValue(m.key, m.format)} 
                    />
                ))}
            </div>
        </div>
    );
};

export const PlayerDetail: React.FC<PlayerDetailProps> = ({ profile, history, onBack, onMatchClick }) => {
    const [sideFilter, setSideFilter] = useState<SideFilter>('ALL');
    const [selectedAbility, setSelectedAbility] = useState<AbilityType>('firepower');
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    // Check Config
    const hasApiKey = !!getAIConfig().apiKey;

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
        const key = `tacbook_ai_report_${profile.id}_${sideFilter}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            setAnalysis(saved);
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
        if (!hasApiKey) return;

        setIsAnalyzing(true);
        setAnalysisError(null);
        
        try {
            const result = await generatePlayerAnalysis(profile, { overall, filtered });
            setAnalysis(result);
            // Save to localStorage
            const key = `tacbook_ai_report_${profile.id}_${sideFilter}`;
            localStorage.setItem(key, result);
            
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
                    {hasApiKey && (
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
                    )}
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
                
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left: Radar */}
                    <div className="flex justify-center p-2 lg:w-1/3">
                        <RadarChart data={abilities} size={300} />
                    </div>

                    {/* Middle: Selectable List */}
                    <div className="flex-1 space-y-2">
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
                    <div className="lg:w-1/3 min-h-[300px]">
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

            {/* Report Modal */}
            {isReportOpen && (
                <div 
                    className="fixed inset-0 z-[300] bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setIsReportOpen(false)}
                >
                    <div 
                        className="bg-white dark:bg-neutral-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-8 duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                         <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-white/50 dark:bg-neutral-950/50 backdrop-blur-sm shrink-0">
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                 </div>
                                 <div>
                                     <h3 className="font-bold text-lg text-neutral-900 dark:text-white leading-none">AI 战术顾问</h3>
                                     <p className="text-xs text-neutral-500 mt-1">Player: {profile.id}</p>
                                 </div>
                             </div>
                             <div className="flex items-center gap-2">
                                {analysis && (
                                    <button
                                        onClick={handleRegenerate}
                                        title="重新生成 (消耗额度)"
                                        className="p-2 rounded-full text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    </button>
                                )}
                                <button 
                                    onClick={() => setIsReportOpen(false)}
                                    className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-500"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                             </div>
                         </div>
                         
                         <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-neutral-50 dark:bg-neutral-950">
                             {analysisError ? (
                                 <div className="flex flex-col items-center justify-center h-full text-red-500">
                                     <svg className="w-10 h-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                     <p className="text-sm font-bold">生成失败</p>
                                     <p className="text-xs opacity-70 mt-1">{analysisError}</p>
                                 </div>
                             ) : isAnalyzing ? (
                                 <div className="flex flex-col items-center justify-center h-full text-neutral-400">
                                     <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                                     <p className="text-sm">正在分析比赛数据...</p>
                                     <p className="text-xs opacity-50 mt-1">这可能需要几秒钟</p>
                                 </div>
                             ) : analysis ? (
                                 <div className="prose prose-base dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300 
                                    prose-headings:font-bold prose-headings:text-neutral-900 dark:prose-headings:text-white
                                    prose-h3:text-lg prose-h3:border-b prose-h3:border-neutral-200 dark:prose-h3:border-neutral-800 prose-h3:pb-2 prose-h3:mt-8 prose-h3:mb-4
                                    prose-p:leading-8 prose-p:mb-4 prose-p:text-neutral-600 dark:prose-p:text-neutral-400
                                    prose-li:text-neutral-600 dark:prose-li:text-neutral-400 prose-li:my-2
                                    prose-strong:text-blue-700 dark:prose-strong:text-blue-400 prose-strong:font-bold
                                    prose-blockquote:border-l-4 prose-blockquote:border-neutral-300 prose-blockquote:bg-neutral-100 dark:prose-blockquote:bg-neutral-800/50 dark:prose-blockquote:border-neutral-700 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-neutral-600 dark:prose-blockquote:text-neutral-400
                                 ">
                                     <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis || ''}</ReactMarkdown>
                                 </div>
                             ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    </div>
                                    <div className="max-w-md">
                                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">生成 AI 表现评估</h3>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                            AI 将基于当前筛选条件 ({sideFilter === 'ALL' ? '全场' : sideFilter} 数据)，分析 {profile.id} 的各项能力指标，提供战术建议和改进方向。
                                        </p>
                                    </div>
                                    <button 
                                        onClick={runAnalysis}
                                        className="px-8 py-3 bg-neutral-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:scale-105 transition-transform shadow-lg"
                                    >
                                        开始生成
                                    </button>
                                </div>
                             )}
                         </div>
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
        </div>
    );
};