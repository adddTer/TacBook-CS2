
import React from 'react';

// Re-export map helpers from utils to maintain compatibility with existing review components
export { getMapDisplayName, getMapEnName } from '../../utils/matchHelpers';

// --- Maps Theme Helper ---
export const getMapTheme = (mapName: string) => {
    const m = mapName.toLowerCase();
    if (m.includes('mirage')) return 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800';
    if (m.includes('inferno')) return 'from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800';
    if (m.includes('nuke')) return 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800';
    if (m.includes('overpass')) return 'from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border-teal-200 dark:border-teal-800';
    if (m.includes('ancient')) return 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800';
    if (m.includes('anubis')) return 'from-amber-50 to-stone-50 dark:from-amber-900/20 dark:to-stone-900/20 border-stone-200 dark:border-stone-800';
    if (m.includes('vertigo')) return 'from-gray-50 to-slate-50 dark:from-gray-800/30 dark:to-slate-800/30 border-gray-200 dark:border-gray-700';
    if (m.includes('dust')) return 'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-amber-200 dark:border-amber-800';
    return 'from-gray-50 to-neutral-50 dark:from-neutral-900 dark:to-neutral-900 border-neutral-200 dark:border-neutral-800';
};

// --- Rating Color Logic ---
export const getRatingColorClass = (rating: number, type: 'text' | 'bg' = 'text') => {
    if (type === 'text') {
        if (rating >= 1.45) return 'text-yellow-500 dark:text-yellow-400';
        if (rating >= 1.15) return 'text-green-600 dark:text-green-400';
        if (rating < 0.95) return 'text-red-500 dark:text-red-400';
        return 'text-neutral-900 dark:text-white';
    } else {
        // Background badges
        if (rating >= 1.45) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
        if (rating >= 1.15) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
        if (rating < 0.95) return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border-red-100 dark:border-red-800';
        return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700';
    }
};

// --- Badges ---

export const RankBadge = ({ rank }: { rank: string }) => {
    const isGold = rank.includes('++') || rank === 'S';
    const displayRank = rank.replace('++', '+'); 
    
    return (
        <span className={`
          text-[10px] font-black px-1.5 py-0.5 rounded border font-sans tabular-nums
          ${isGold 
              ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-black border-yellow-600 shadow-sm' 
              : 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400'}
        `}>
            {displayRank}
        </span>
    );
};

export const SourceBadge = ({ source }: { source: 'PWA' | 'Official' | 'Demo' }) => (
    <span className={`
      text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 font-sans
      ${source === 'PWA' 
          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800' 
          : source === 'Demo'
              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
              : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600'}
    `}>
        {source === 'Demo' && <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        {source === 'PWA' ? '完美世界' : source === 'Demo' ? 'DEMO' : '官方竞技'}
    </span>
);

export const StatBox = ({ label, value, subValue, colorClass, highlight }: any) => (
    <div className={`p-3 rounded-xl text-center border transition-all ${highlight ? 'bg-white dark:bg-neutral-800 shadow-sm border-neutral-200 dark:border-neutral-700' : 'bg-neutral-50 dark:bg-neutral-900 border-transparent'}`}>
        <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1 font-sans">{label}</div>
        <div className={`text-xl font-black font-sans tabular-nums tracking-tight ${colorClass || 'text-neutral-900 dark:text-white'}`}>{value}</div>
        {subValue && <div className="text-[10px] text-neutral-500 font-sans tabular-nums mt-0.5">{subValue}</div>}
    </div>
);

// --- Modals ---

export const DataDefinitionsModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2 font-sans">
                        <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        数据指标说明
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                        <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="space-y-3 overflow-y-auto pr-2 pb-4 font-sans">
                    <DefinitionItem title="Rating 4.0" color="text-blue-600 dark:text-blue-400" desc="基于 KPR、存活、ADR、多杀和经济修正计算。Balanced版本将平均分校准至1.0左右。包含'被补枪'补偿机制。" />
                    <DefinitionItem title="WPA" color="text-green-600 dark:text-green-400" desc="Win Probability Added (胜率贡献)。量化每名玩家的行动（击杀、下包等）对团队获胜概率的改变幅度。正值为正面贡献，负值为失误。" />
                    <DefinitionItem title="KAST%" color="text-orange-600 dark:text-orange-400" desc="击杀、助攻、存活或被交换的回合占比。衡量对团队贡献的稳定性。" />
                    <div className="grid grid-cols-2 gap-3">
                        <DefinitionItem title="F.Ast" color="text-purple-600 dark:text-purple-400" desc="闪光助攻数。" />
                        <DefinitionItem title="UD" color="text-red-600 dark:text-red-400" desc="道具造成的伤害总量。" />
                    </div>
                    <DefinitionItem title="1vN" color="text-yellow-600 dark:text-yellow-400" desc="残局获胜、失败或保枪记录。" />
                </div>
            </div>
        </div>
    );
};

const DefinitionItem = ({title, color, desc}: any) => (
    <div className="p-3.5 bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-100 dark:border-neutral-800 rounded-xl">
        <h4 className={`font-black text-xs uppercase mb-1.5 ${color}`}>{title}</h4>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">{desc}</p>
    </div>
);
