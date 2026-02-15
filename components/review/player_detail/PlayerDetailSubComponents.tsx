
import React from 'react';
import { getScoreStyle, getValueStyleClass, getScoreHex } from '../../../utils/styleConstants';
import { ABILITY_INFO, AbilityType } from './config';

// --- Radar Chart ---

export const RadarChart = ({ data, size = 260 }: { data: { value: number; label: string; [key: string]: any }[]; size?: number }) => {
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
    
    // Generate data points for the path
    const dataPoints = data.map((d, i) => getPoint(i, d.value));
    
    // Create Path String "M x1 y1 L x2 y2 ... Z"
    const pathD = dataPoints.length > 0 
        ? `M ${dataPoints[0].x} ${dataPoints[0].y} ` + dataPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + " Z"
        : "";

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

                {/* Data Shape (Animated Path) */}
                <path
                    d={pathD}
                    fill="rgba(59, 130, 246, 0.2)" 
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    className="drop-shadow-sm transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                />
                
                {/* Data Points (Animated Circles) */}
                 {dataPoints.map((p, i) => (
                    <circle 
                        key={i} 
                        cx={p.x} 
                        cy={p.y} 
                        r="3" 
                        fill={getScoreHex(data[i].value)} 
                        stroke="white" 
                        strokeWidth="1"
                        className="dark:stroke-neutral-900 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                    />
                 ))}
            </svg>
        </div>
    );
};

// --- Ability Row ---

interface AbilityRowProps {
    label: string;
    value: number;
    isPercentage?: boolean;
    isSelected: boolean;
    onClick: () => void;
}

export const AbilityRow: React.FC<AbilityRowProps> = ({ label, value, isPercentage = false, isSelected, onClick }) => {
    const intValue = Math.round(Math.max(0, value)); // Actual value, not capped
    const barWidth = Math.min(100, intValue); // Visual width, capped at 100
    
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
             
             {/* Progress Track - Cleaned up background lines */}
             <div className="flex-1 relative h-3 bg-neutral-200 dark:bg-neutral-800 rounded-sm overflow-hidden group">
                 {/* Fill */}
                 <div 
                    className={`h-full rounded-sm transition-all duration-1000 ease-out relative ${barClass}`} 
                    style={{ width: `${barWidth}%` }}
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

// --- Stat Card ---

export const StatCard = ({ label, value, subLabel, colorClass }: { label: string, value: string | number, subLabel?: string, colorClass?: string }) => (
    <div className={`relative p-4 rounded-xl border flex flex-col items-center justify-center transition-all bg-neutral-50 dark:bg-neutral-900 border-transparent`}>
        <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">{label}</div>
        <div className={`text-2xl font-black font-mono tabular-nums leading-none tracking-tight ${colorClass || 'text-neutral-900 dark:text-white'}`}>
            {value}
        </div>
        {subLabel && <div className="text-[9px] text-neutral-400 font-medium mt-1">{subLabel}</div>}
    </div>
);

// --- Detail Card Components ---

export const MetricItem: React.FC<{ label: string, value: string | number }> = ({ label, value }) => (
    <div className="flex flex-col p-2 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-100 dark:border-neutral-800">
        <span className="text-[10px] text-neutral-400 font-medium mb-0.5">{label}</span>
        <span className="text-sm font-bold text-neutral-900 dark:text-white font-mono">{value}</span>
    </div>
);

export const DetailCard = ({ type, data, score }: { type: AbilityType, data: any, score: number }) => {
    const info = ABILITY_INFO[type];
    
    const getEvaluation = (s: number) => {
        if (s >= 80) return info.evaluations.outstanding;
        if (s >= 60) return info.evaluations.excellent;
        if (s >= 40) return info.evaluations.ordinary;
        return info.evaluations.poor;
    };

    const evalClass = getScoreStyle(score, 'bg');
    const evalTextClass = getScoreStyle(score, 'text');
    
    // Check if flash data is likely broken (missing parser events)
    // Same logic as UtilityTab
    const isUtilityBroken = type === 'utility' && (
        (data.totalFlashes > 5 && data.totalBlinded === 0) || 
        (data.totalFlashAssists > 0 && data.totalBlinded === 0)
    );

    // Helper to format values
    const formatValue = (key: string, fmt?: string) => {
        const val = data[key];
        if (val === undefined || val === null || (typeof val === 'number' && isNaN(val))) return '-';
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
            
            {/* Broken Data Warning */}
            {isUtilityBroken && (
                <div className="mb-4 flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-[10px] leading-relaxed font-bold">
                        检测到闪光数据异常 (解析缺失)<br/>
                        评分已自动忽略致盲时长并重新计算。
                    </div>
                </div>
            )}

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
