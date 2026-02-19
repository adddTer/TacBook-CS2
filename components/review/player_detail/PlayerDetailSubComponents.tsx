
import React from 'react';
import { getScoreStyle, getValueStyleClass, getScoreHex } from '../../../utils/styleConstants';
import { ABILITY_INFO, AbilityType } from './config';

// --- Radar Chart ---

export const RadarChart = ({ data, size = 260 }: { data: { value: number; label: string; [key: string]: any }[]; size?: number }) => {
    const viewBoxSize = 300;
    const center = viewBoxSize / 2;
    const radius = viewBoxSize / 2 - 40; 
    const sides = data.length || 7;
    const angleStep = (2 * Math.PI) / sides;

    const getPoint = (index: number, val: number, offsetRadius: number = 0) => {
        const angle = -Math.PI / 2 + index * angleStep;
        const clampedVal = Math.min(100, Math.max(0, val));
        const effectiveRadius = (radius + offsetRadius) * (clampedVal / 100);
        return {
            x: center + effectiveRadius * Math.cos(angle),
            y: center + effectiveRadius * Math.sin(angle),
        };
    };

    const gridLevels = [25, 50, 75, 100];
    const dataPoints = data.map((d, i) => getPoint(i, d.value));
    const pathD = dataPoints.length > 0 
        ? `M ${dataPoints[0].x} ${dataPoints[0].y} ` + dataPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + " Z"
        : "";

    return (
        <div className="relative flex items-center justify-center w-full h-full aspect-square max-w-[300px] mx-auto">
            <svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} className="w-full h-full overflow-visible">
                {/* Grid */}
                {gridLevels.map((level, lvlIdx) => (
                    <polygon
                        key={level}
                        points={Array.from({ length: sides }).map((_, i) => {
                            const p = getPoint(i, level);
                            return `${p.x},${p.y}`;
                        }).join(' ')}
                        fill={lvlIdx === gridLevels.length - 1 ? "rgba(120,120,120,0.03)" : "none"}
                        stroke="currentColor"
                        className={`text-neutral-200 dark:text-neutral-800 ${lvlIdx === gridLevels.length - 1 ? 'stroke-[1.5]' : 'stroke-[0.5]'}`}
                        strokeDasharray={lvlIdx < gridLevels.length - 1 ? "4,4" : ""}
                    />
                ))}
                
                {/* Axes & Labels */}
                {Array.from({ length: sides }).map((_, i) => {
                    const p = getPoint(i, 100);
                    const labelPos = getPoint(i, 100, 25); 
                    
                    let textAnchor: "middle" | "end" | "start" = "middle";
                    if (labelPos.x < center - 10) textAnchor = "end";
                    if (labelPos.x > center + 10) textAnchor = "start";
                    
                    let baseline: "middle" | "auto" | "hanging" = "middle";
                    if (labelPos.y < center - 10) baseline = "auto"; 
                    if (labelPos.y > center + 10) baseline = "hanging";

                    return (
                        <React.Fragment key={i}>
                            <line
                                x1={center}
                                y1={center}
                                x2={p.x}
                                y2={p.y}
                                stroke="currentColor"
                                className="text-neutral-200 dark:text-neutral-800 stroke-[1]"
                            />
                            <text
                                x={labelPos.x}
                                y={labelPos.y}
                                textAnchor={textAnchor}
                                dominantBaseline={baseline}
                                className="text-[11px] font-bold fill-neutral-500 dark:fill-neutral-400 font-sans uppercase tracking-wider"
                            >
                                {data[i].label}
                            </text>
                        </React.Fragment>
                    );
                })}

                {/* Data Area */}
                <path
                    d={pathD}
                    fill="rgba(59, 130, 246, 0.15)" 
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    className="drop-shadow-sm filter blur-[0.5px] transition-all duration-700 ease-out"
                />
                <path
                    d={pathD}
                    fill="none" 
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    className="transition-all duration-700 ease-out"
                />
                
                {/* Points */}
                 {dataPoints.map((p, i) => (
                    <circle 
                        key={i} 
                        cx={p.x} 
                        cy={p.y} 
                        r="3.5" 
                        fill={getScoreHex(data[i].value)} 
                        stroke="white" 
                        strokeWidth="1.5"
                        className="dark:stroke-neutral-900 transition-all duration-700 ease-out"
                    />
                 ))}
            </svg>
        </div>
    );
};

// --- Ability Row (Desktop List) ---

interface AbilityRowProps {
    label: string;
    value: number;
    isPercentage?: boolean;
    isSelected: boolean;
    onClick: () => void;
}

export const AbilityRow: React.FC<AbilityRowProps> = ({ label, value, isPercentage = false, isSelected, onClick }) => {
    const intValue = Math.round(Math.max(0, value)); 
    const barWidth = Math.min(100, intValue); 
    
    const barClass = getScoreStyle(value, 'bar');
    const textClass = getScoreStyle(value, 'text');

    return (
        <div 
            onClick={onClick}
            className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 overflow-hidden ${isSelected ? 'bg-neutral-100 dark:bg-neutral-800 shadow-inner' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}
        >
             {/* Selection Indicator */}
             {isSelected && <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-500 rounded-r-full"></div>}

             <div className={`w-10 shrink-0 text-xs font-bold truncate transition-colors ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300'}`}>
                 {label}
             </div>
             
             {/* Progress Track */}
             <div className="flex-1 relative h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                 <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${barClass}`} 
                    style={{ width: `${barWidth}%` }}
                 ></div>
             </div>
             
             {/* Score Value */}
             <div className={`w-10 shrink-0 text-right font-mono font-black text-sm leading-none ${textClass}`}>
                 {intValue}{isPercentage ? <span className="text-[9px] align-top text-neutral-400">%</span> : ''}
             </div>
        </div>
    );
};

// --- Mobile Tab Item ---

export const AbilityTabItem: React.FC<{ label: string, value: number, isSelected: boolean, onClick: () => void }> = ({ label, value, isSelected, onClick }) => {
    const colorClass = getScoreStyle(value, 'text');
    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all whitespace-nowrap snap-center
                ${isSelected 
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-black border-transparent shadow-md' 
                    : 'bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800'}
            `}
        >
            <span>{label}</span>
            <span className={`font-mono ${isSelected ? 'text-neutral-400 dark:text-neutral-500' : colorClass}`}>
                {Math.round(value)}
            </span>
        </button>
    );
};

// --- Stat Card (Grid Item) ---

export const StatCard = ({ label, value, subLabel, colorClass }: { label: string, value: string | number, subLabel?: string, colorClass?: string }) => (
    <div className={`relative p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 flex flex-col items-center justify-center transition-all`}>
        <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mb-1.5">{label}</div>
        <div className={`text-2xl lg:text-3xl font-black font-mono tabular-nums leading-none tracking-tight ${colorClass || 'text-neutral-900 dark:text-white'}`}>
            {value}
        </div>
        {subLabel && <div className="text-[9px] text-neutral-400 font-medium mt-1.5 opacity-80">{subLabel}</div>}
    </div>
);

// --- Detail Card ---

export const MetricItem: React.FC<{ label: string, value: string | number }> = ({ label, value }) => (
    <div className="flex flex-col justify-center p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-100 dark:border-neutral-800">
        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1 truncate">{label}</span>
        <span className="text-sm md:text-base font-black text-neutral-900 dark:text-white font-mono tabular-nums truncate">{value}</span>
    </div>
);

export const DetailCard = ({ type, data, score }: { type: AbilityType, data: any, score: number }) => {
    const info = ABILITY_INFO[type];
    
    // Map score 0-100 to index 0-8 for 9 levels of evaluations
    // Level 0: 0-19
    // Level 1: 20-29 ... Level 8: 90-100
    const getEvaluation = (s: number) => {
        let index = 0;
        if (s < 20) index = 0;
        else if (s >= 90) index = 8;
        else {
            index = Math.floor((s - 20) / 10) + 1;
        }
        // Safety check
        index = Math.max(0, Math.min(index, info.evaluations.length - 1));
        return info.evaluations[index];
    };

    const evalClass = getScoreStyle(score, 'bg');
    const evalTextClass = getScoreStyle(score, 'text');
    
    const isUtilityBroken = type === 'utility' && (
        (data.totalFlashes > 5 && data.totalBlinded === 0) || 
        (data.totalFlashAssists > 0 && data.totalBlinded === 0)
    );

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
        <div className="bg-white dark:bg-neutral-800/50 rounded-2xl p-5 border border-neutral-200 dark:border-neutral-800 h-full flex flex-col relative overflow-hidden">
            {/* Background Decoration */}
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-transparent to-current opacity-5 rounded-bl-full pointer-events-none ${evalTextClass}`}></div>

            <div className="flex justify-between items-start mb-2 relative z-10">
                <div>
                    <h4 className="text-lg font-black uppercase text-neutral-900 dark:text-white flex items-center gap-2">
                        {info.title}
                    </h4>
                </div>
                <div className={`font-mono text-3xl font-black ${evalTextClass}`}>{Math.round(score)}</div>
            </div>

            <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mb-4 leading-relaxed font-medium relative z-10">
                {info.desc}
            </div>
            
            <div className="mb-5 relative z-10">
                 <div className={`text-xs font-bold leading-relaxed py-2 pl-3 border-l-2 ${evalClass.replace('bg-', 'border-').split(' ')[0]} text-neutral-700 dark:text-neutral-200`}>
                     "{getEvaluation(score)}"
                 </div>
            </div>

            {isUtilityBroken && (
                <div className="mb-4 flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-[10px] leading-relaxed font-bold">
                        数据异常：闪光致盲数据缺失，评分已自动修正。
                    </div>
                </div>
            )}
            
            <div className="mt-auto">
                <div className="grid grid-cols-2 gap-2">
                    {info.metrics.map((m, idx) => (
                        <MetricItem 
                            key={idx} 
                            label={m.label} 
                            value={formatValue(m.key, m.format)} 
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
