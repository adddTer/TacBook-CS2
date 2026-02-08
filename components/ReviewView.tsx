
import React, { useState, useMemo, useRef } from 'react';
import { ROSTER } from '../constants/roster';
import { MAPS } from '../constants';
import { Match, PlayerMatchStats, Rank, DemoData, ContentGroup } from '../types';
import { parseDemoJson } from '../utils/demoParser';
import { JsonDebugger } from './JsonDebugger';
import { shareFile, downloadBlob } from '../utils/shareHelper';
import { ConfirmModal } from './ConfirmModal';

// Helper to match roster IDs even if they vary slightly in legacy data
const getRosterId = (name: string) => {
    return name;
};

interface ReviewViewProps {
    allMatches: Match[];
    onSaveMatch: (match: Match, targetGroupId: string) => void;
    onDeleteMatch: (match: Match) => void;
    writableGroups: ContentGroup[];
}

// Data Definitions Modal Component
const DataDefinitionsModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        数据指标说明
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                        <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="space-y-4 overflow-y-auto pr-2 pb-4">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                        <h4 className="font-bold text-blue-600 dark:text-blue-400 text-sm mb-1">Rating</h4>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">综合 K/D、ADR、生存率和助攻计算的效率值。1.0 为基准，1.2+ 为优秀。</p>
                    </div>
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                        <h4 className="font-bold text-green-600 dark:text-green-400 text-sm mb-1">ADR</h4>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">场均造成伤害。80+ 是优秀输出手的标准（已剔除队友伤害）。</p>
                    </div>
                     <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                        <h4 className="font-bold text-orange-600 dark:text-orange-400 text-sm mb-1">KAST%</h4>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">击杀、助攻、存活或被交换的回合占比。衡量对团队贡献的稳定性。</p>
                    </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                            <h4 className="font-bold text-purple-600 dark:text-purple-400 text-sm mb-1">F.Ast</h4>
                            <p className="text-xs text-neutral-600 dark:text-neutral-300">闪光助攻数。</p>
                        </div>
                        <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                            <h4 className="font-bold text-red-600 dark:text-red-400 text-sm mb-1">UD</h4>
                            <p className="text-xs text-neutral-600 dark:text-neutral-300">道具造成的伤害总量。</p>
                        </div>
                     </div>
                     <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                        <h4 className="font-bold text-neutral-700 dark:text-neutral-200 text-sm mb-1">EF</h4>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300">成功致盲敌人的总人次。</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Sub-components for Match Detail ---

const MatchOverviewTable = ({ players, isEnemy = false, onPlayerClick }: { players: PlayerMatchStats[], isEnemy?: boolean, onPlayerClick: (id: string) => void }) => {
    const sortedPlayers = [...players].sort((a,b) => b.rating - a.rating);

    // Desktop View (Table)
    const DesktopView = (
        <div className="hidden md:block overflow-x-auto -mx-4 px-4 pb-2">
            <table className="w-full text-sm text-left whitespace-nowrap min-w-[600px] border-collapse">
                <thead>
                    <tr className="text-[10px] uppercase font-bold text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">
                        <th className="px-2 py-3 sticky left-0 z-10 bg-white dark:bg-neutral-900 w-32">{isEnemy ? '敌方' : '我方'}</th>
                        <th className="px-2 py-3 text-center w-16">K / D / A</th>
                        <th className="px-2 py-3 text-center w-12">+/-</th>
                        <th className="px-2 py-3 text-center w-12">ADR</th>
                        <th className="px-2 py-3 text-center w-12">HS%</th>
                        <th className="px-2 py-3 text-center w-12">UD</th>
                        <th className="px-2 py-3 text-right w-16">RATING</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                    {sortedPlayers.map((p, idx) => {
                        const kdDiff = p.kills - p.deaths;
                        const rosterId = getRosterId(p.playerId);
                        const isRosterMember = ROSTER.some(r => r.id === rosterId);

                        return (
                            <tr 
                                key={p.steamid || idx} 
                                className={`group transition-colors ${isRosterMember ? 'cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'}`}
                                onClick={isRosterMember ? () => onPlayerClick(rosterId) : undefined}
                            >
                                <td className={`px-2 py-3 font-bold sticky left-0 z-10 bg-white dark:bg-neutral-900 border-r border-transparent group-hover:border-neutral-100 dark:group-hover:border-neutral-800 truncate flex items-center gap-2 ${isRosterMember ? 'text-blue-600 dark:text-blue-400 group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/10' : 'text-neutral-800 dark:text-neutral-200 group-hover:bg-neutral-50 dark:group-hover:bg-neutral-800/30'}`}>
                                    {isRosterMember && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                                    {p.playerId}
                                </td>
                                <td className="px-2 py-3 text-center font-mono text-xs">
                                    <span className="text-neutral-900 dark:text-white font-bold">{p.kills}</span>
                                    <span className="text-neutral-300 mx-1">/</span>
                                    <span className="text-red-500">{p.deaths}</span>
                                    <span className="text-neutral-300 mx-1">/</span>
                                    <span className="text-neutral-500">{p.assists}</span>
                                </td>
                                <td className={`px-2 py-3 text-center font-mono text-xs font-bold ${kdDiff > 0 ? 'text-green-500' : kdDiff < 0 ? 'text-red-500' : 'text-neutral-300'}`}>
                                    {kdDiff > 0 ? `+${kdDiff}` : kdDiff}
                                </td>
                                <td className="px-2 py-3 text-center font-mono text-xs text-neutral-600 dark:text-neutral-400">
                                    {p.adr.toFixed(0)}
                                </td>
                                <td className="px-2 py-3 text-center font-mono text-xs text-neutral-400">
                                    {p.hsRate}%
                                </td>
                                <td className="px-2 py-3 text-center font-mono text-xs text-neutral-400">
                                    {p.utility.heDamage + p.utility.molotovDamage}
                                </td>
                                <td className="px-2 py-3 text-right">
                                    <div className={`inline-block px-1.5 py-0.5 rounded text-xs font-black min-w-[3em] text-center
                                        ${p.rating >= 1.2 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                                          p.rating >= 1.0 ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300' : 
                                          'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500'}`}>
                                        {p.rating.toFixed(2)}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    // Mobile View (Cards)
    const MobileView = (
        <div className="md:hidden space-y-2">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1 mb-2">{isEnemy ? '敌方数据' : '我方数据'}</h3>
            {sortedPlayers.map((p, idx) => {
                const kdDiff = p.kills - p.deaths;
                const rosterId = getRosterId(p.playerId);
                const isRosterMember = ROSTER.some(r => r.id === rosterId);

                return (
                    <div 
                        key={p.steamid || idx}
                        onClick={isRosterMember ? () => onPlayerClick(rosterId) : undefined}
                        className={`
                            border rounded-xl p-3 flex items-center justify-between shadow-sm transition-all
                            ${isRosterMember 
                                ? 'bg-blue-50/10 border-blue-200 dark:border-blue-900/50 active:bg-blue-50/20' 
                                : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800'}
                        `}
                    >
                        <div className="flex-1 min-w-0 mr-4">
                            <div className="flex items-center gap-2 mb-1">
                                {isRosterMember && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>}
                                <span className={`font-bold text-sm truncate ${isRosterMember ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-900 dark:text-white'}`}>
                                    {p.playerId}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-mono text-neutral-500 dark:text-neutral-400">
                                <span>{p.kills}/{p.deaths}/{p.assists}</span>
                                <span className={`${kdDiff > 0 ? 'text-green-500' : kdDiff < 0 ? 'text-red-500' : 'text-neutral-400'}`}>
                                    {kdDiff > 0 ? `+${kdDiff}` : kdDiff}
                                </span>
                                <span className="opacity-50">|</span>
                                <span>ADR {p.adr.toFixed(0)}</span>
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                            <div className={`inline-block px-2 py-1 rounded-lg text-xs font-black min-w-[3em] text-center mb-1
                                ${p.rating >= 1.2 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                                  p.rating >= 1.0 ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300' : 
                                  'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500'}`}>
                                {p.rating.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono">
                                HS {p.hsRate}%
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <>
            {DesktopView}
            {MobileView}
        </>
    );
};

const DuelsMatrix = ({ players, enemyPlayers }: { players: PlayerMatchStats[], enemyPlayers: PlayerMatchStats[] }) => {
    // Helper to calculate duel stats and styles
    const getDuelStats = (p: PlayerMatchStats, enemy: PlayerMatchStats) => {
        const record = (enemy.steamid && p.duels[enemy.steamid]) || { kills: 0, deaths: 0 };
        const k = record.kills;
        const d = record.deaths;
        const diff = k - d;
        
        let bgClass = "bg-neutral-50 dark:bg-neutral-800";
        let textClass = "text-neutral-400";
        let borderClass = "border-transparent";

        if (k + d > 0) {
            textClass = "text-neutral-900 dark:text-white";
            if (diff > 0) {
                bgClass = "bg-green-50 dark:bg-green-900/20";
                borderClass = "border-green-100 dark:border-green-800/30";
                textClass = "text-green-700 dark:text-green-400";
            } else if (diff < 0) {
                bgClass = "bg-red-50 dark:bg-red-900/20";
                borderClass = "border-red-100 dark:border-red-800/30";
                textClass = "text-red-700 dark:text-red-400";
            } else {
                 bgClass = "bg-white dark:bg-neutral-900";
                 borderClass = "border-neutral-200 dark:border-neutral-800";
            }
        }
        
        return { k, d, bgClass, textClass, borderClass };
    };

    // Desktop Table View
    const DesktopView = (
        <div className="hidden md:block overflow-x-auto -mx-4 px-4 pb-2">
            <div className="min-w-[600px]">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr>
                            <th className="p-2 text-left text-neutral-400 font-bold uppercase sticky left-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 w-24">
                                VS
                            </th>
                            {enemyPlayers.map((enemy, i) => (
                                <th key={enemy.steamid || `enemy-${i}`} className="p-2 text-center text-neutral-600 dark:text-neutral-300 font-bold border-b border-neutral-100 dark:border-neutral-800 max-w-[80px] truncate" title={enemy.playerId}>
                                    {enemy.playerId}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {players.map((p, i) => (
                            <tr key={p.steamid || `player-${i}`}>
                                <td className="p-2 text-left font-bold text-neutral-900 dark:text-white sticky left-0 z-10 bg-white dark:bg-neutral-900 border-r border-neutral-100 dark:border-neutral-800 truncate max-w-[100px]">
                                    {p.playerId}
                                </td>
                                {enemyPlayers.map((enemy, j) => {
                                    const { k, d, bgClass, textClass, borderClass } = getDuelStats(p, enemy);
                                    const isEmpty = k === 0 && d === 0;

                                    return (
                                        <td key={`${p.steamid}-vs-${enemy.steamid}` || `cell-${i}-${j}`} className={`p-2 text-center border ${isEmpty ? 'border-neutral-100 dark:border-neutral-800/50' : borderClass} ${bgClass}`}>
                                            <span className={`font-mono font-bold ${textClass}`}>
                                                {isEmpty ? '-' : `${k} : ${d}`}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 text-[10px] text-neutral-400 text-center flex items-center justify-center gap-4">
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span> 优势</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-neutral-400 rounded-full"></span> 均势</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span> 劣势</div>
            </div>
        </div>
    );

    // Mobile Card View
    const MobileView = (
        <div className="md:hidden space-y-4">
             {/* Legend */}
             <div className="text-[10px] text-neutral-400 flex gap-3 justify-end px-1">
                 <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>优势</span>
                 <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>劣势</span>
             </div>

             {players.map((p, i) => (
                 <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-xl p-3 shadow-sm">
                     <div className="font-bold text-sm text-neutral-900 dark:text-white mb-3 border-b border-neutral-50 dark:border-neutral-800 pb-2">
                         {p.playerId}
                     </div>
                     <div className="grid grid-cols-5 gap-2">
                         {enemyPlayers.map((enemy, j) => {
                             const { k, d, bgClass, textClass, borderClass } = getDuelStats(p, enemy);
                             return (
                                 <div key={j} className={`flex flex-col items-center justify-center p-1.5 rounded-lg border ${borderClass} ${bgClass}`}>
                                     <div className="text-[9px] text-neutral-500 dark:text-neutral-400 truncate w-full text-center mb-0.5" title={enemy.playerId}>
                                         {enemy.playerId.substring(0, 4)}
                                     </div>
                                     <div className={`text-xs font-black font-mono ${textClass}`}>
                                         {k}:{d}
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                 </div>
             ))}
        </div>
    );

    return (
        <>
            {DesktopView}
            {MobileView}
        </>
    );
};

const UtilityStatsView = ({ players }: { players: PlayerMatchStats[] }) => {
    // Mobile Card View
    const MobileView = (
        <div className="md:hidden space-y-3">
             {players.sort((a,b) => (b.utility.heDamage + b.utility.molotovDamage) - (a.utility.heDamage + a.utility.molotovDamage)).map((p, idx) => (
                 <div key={idx} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-xl p-3 shadow-sm">
                     <div className="flex justify-between items-center mb-2 border-b border-neutral-50 dark:border-neutral-800/50 pb-2">
                         <span className="font-bold text-neutral-900 dark:text-white text-sm">{p.playerId}</span>
                         <span className="text-[10px] text-neutral-400 font-mono">
                             {p.utility.smokesThrown}S / {p.utility.flashesThrown}F / {p.utility.heThrown}H / {p.utility.molotovsThrown}M
                         </span>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                         <div className="bg-blue-50/30 dark:bg-blue-900/10 p-2 rounded-lg text-center">
                             <div className="text-[10px] text-blue-500 uppercase font-bold">闪光助攻</div>
                             <div className="text-lg font-black text-blue-600 dark:text-blue-400">{p.flash_assists || 0}</div>
                             <div className="text-[9px] text-neutral-400">{p.utility.enemiesBlinded} 人 / {p.utility.blindDuration.toFixed(1)}s</div>
                         </div>
                         <div className="bg-red-50/30 dark:bg-red-900/10 p-2 rounded-lg text-center">
                             <div className="text-[10px] text-red-500 uppercase font-bold">道具伤害</div>
                             <div className="text-lg font-black text-red-600 dark:text-red-400">{p.utility.heDamage + p.utility.molotovDamage}</div>
                             <div className="text-[9px] text-neutral-400">雷: {p.utility.heDamage} / 火: {p.utility.molotovDamage}</div>
                         </div>
                     </div>
                 </div>
             ))}
        </div>
    );

    // Desktop Table View
    const DesktopView = (
        <div className="hidden md:block overflow-x-auto -mx-4 px-4 pb-2">
            <table className="w-full text-sm text-left whitespace-nowrap min-w-[700px] border-collapse">
                <thead>
                    {/* Top Group Headers */}
                    <tr className="text-[9px] uppercase font-bold text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                        <th className="px-2 py-1 sticky left-0 z-10 bg-neutral-50 dark:bg-neutral-900 w-32"></th>
                        <th className="px-2 py-1 text-center border-l border-r border-neutral-200 dark:border-neutral-800 text-blue-500" colSpan={3}>闪光效果</th>
                        <th className="px-2 py-1 text-center border-r border-neutral-200 dark:border-neutral-800 text-red-500" colSpan={2}>伤害输出</th>
                        <th className="px-2 py-1 text-center text-neutral-500" colSpan={4}>投掷物统计</th>
                    </tr>
                    {/* Sub Headers */}
                    <tr className="text-[10px] uppercase font-bold text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">
                        <th className="px-2 py-2 sticky left-0 z-10 bg-white dark:bg-neutral-900 w-32">选手</th>
                        
                        {/* Flash */}
                        <th className="px-2 py-2 text-center w-16 bg-blue-50/20 dark:bg-blue-900/5">助攻</th>
                        <th className="px-2 py-2 text-center w-16 bg-blue-50/20 dark:bg-blue-900/5">致盲人数</th>
                        <th className="px-2 py-2 text-center w-20 bg-blue-50/20 dark:bg-blue-900/5">致盲时间</th>
                        
                        {/* Damage */}
                        <th className="px-2 py-2 text-center w-16 bg-red-50/20 dark:bg-red-900/5">手雷</th>
                        <th className="px-2 py-2 text-center w-16 bg-red-50/20 dark:bg-red-900/5">燃烧</th>
                        
                        {/* Counts */}
                        <th className="px-1 py-2 text-center w-10 text-neutral-400">烟</th>
                        <th className="px-1 py-2 text-center w-10 text-neutral-400">闪</th>
                        <th className="px-1 py-2 text-center w-10 text-neutral-400">雷</th>
                        <th className="px-1 py-2 text-center w-10 text-neutral-400">火</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                    {[...players].sort((a,b) => (b.utility.heDamage + b.utility.molotovDamage) - (a.utility.heDamage + a.utility.molotovDamage)).map((p, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                            <td className="px-2 py-3 font-bold sticky left-0 z-10 bg-white dark:bg-neutral-900 border-r border-transparent text-neutral-800 dark:text-neutral-200 truncate max-w-[120px]">
                                {p.playerId}
                            </td>
                            
                            {/* Flash Stats */}
                            <td className="px-2 py-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/5 border-l border-neutral-100 dark:border-neutral-800/50">
                                {p.flash_assists || 0}
                            </td>
                            <td className="px-2 py-3 text-center font-mono text-neutral-600 dark:text-neutral-400 bg-blue-50/30 dark:bg-blue-900/5">
                                {p.utility.enemiesBlinded}
                            </td>
                            <td className="px-2 py-3 text-center font-mono text-neutral-600 dark:text-neutral-400 bg-blue-50/30 dark:bg-blue-900/5 border-r border-neutral-100 dark:border-neutral-800/50">
                                {p.utility.blindDuration.toFixed(1)}<span className="text-[9px] ml-0.5 opacity-50">s</span>
                            </td>

                            {/* DMG Stats */}
                            <td className="px-2 py-3 text-center font-mono font-bold text-red-600 dark:text-red-400 bg-red-50/30 dark:bg-red-900/5">
                                {p.utility.heDamage}
                            </td>
                            <td className="px-2 py-3 text-center font-mono font-bold text-orange-600 dark:text-orange-400 bg-red-50/30 dark:bg-red-900/5 border-r border-neutral-100 dark:border-neutral-800/50">
                                {p.utility.molotovDamage}
                            </td>

                            {/* Counts */}
                            <td className="px-1 py-3 text-center text-xs text-neutral-400 font-mono">{p.utility.smokesThrown}</td>
                            <td className="px-1 py-3 text-center text-xs text-neutral-400 font-mono">{p.utility.flashesThrown}</td>
                            <td className="px-1 py-3 text-center text-xs text-neutral-400 font-mono">{p.utility.heThrown}</td>
                            <td className="px-1 py-3 text-center text-xs text-neutral-400 font-mono">{p.utility.molotovsThrown}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <>
            {DesktopView}
            {MobileView}
        </>
    );
};

const ClutchList = ({ players, isEnemy }: { players: PlayerMatchStats[], isEnemy: boolean }) => {
    // Sort by wins then total clutches
    const sortedPlayers = [...players].filter(p => p.clutchHistory && p.clutchHistory.length > 0)
        .sort((a, b) => {
            const aWins = a.clutchHistory.filter(c => c.result === 'won').length;
            const bWins = b.clutchHistory.filter(c => c.result === 'won').length;
            if (aWins !== bWins) return bWins - aWins;
            return b.clutchHistory.length - a.clutchHistory.length;
        });

    if (sortedPlayers.length === 0) {
        return (
            <div className="text-center py-8 text-neutral-400 text-xs bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
                无残局记录
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {sortedPlayers.map((p, pIdx) => {
                const wins = p.clutchHistory.filter(c => c.result === 'won').length;
                const total = p.clutchHistory.length;
                
                return (
                    <div key={`${p.steamid}-${pIdx}`} className={`bg-white dark:bg-neutral-900 border rounded-xl p-3 shadow-sm flex flex-col gap-2 ${isEnemy ? 'border-red-100 dark:border-red-900/30' : 'border-blue-100 dark:border-blue-900/30'}`}>
                        {/* Player Header */}
                        <div className="flex items-center justify-between border-b border-neutral-50 dark:border-neutral-800 pb-2">
                             <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isEnemy ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                                    {p.playerId[0]}
                                </div>
                                <span className="font-bold text-sm text-neutral-900 dark:text-white truncate max-w-[100px]">{p.playerId}</span>
                             </div>
                             <div className={`text-[10px] font-black ${isEnemy ? 'text-red-500' : 'text-blue-500'}`}>
                                 {wins}/{total} <span className="opacity-60 text-[9px] font-normal">胜率</span>
                             </div>
                        </div>

                        {/* Clutch Timeline Line */}
                        <div className="flex flex-wrap gap-1.5 items-center">
                            {p.clutchHistory.sort((a,b) => a.round - b.round).map((clutch, cIdx) => {
                                const isWin = clutch.result === 'won';
                                const isSave = clutch.result === 'saved';
                                
                                let badgeClass = 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500 border-neutral-200 dark:border-neutral-700'; // Lost
                                let resultIcon = <span className="text-[9px]">×</span>;

                                if (isWin) {
                                    badgeClass = 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800/50';
                                    resultIcon = <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>;
                                } else if (isSave) {
                                    badgeClass = 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800/50';
                                    resultIcon = <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
                                }

                                return (
                                    <div key={cIdx} className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${badgeClass}`}>
                                        <span className="font-mono opacity-70">R{clutch.round}</span>
                                        <span className="font-black mx-0.5">1v{clutch.opponentCount}</span>
                                        {resultIcon}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const ClutchesView = ({ players, enemyPlayers }: { players: PlayerMatchStats[], enemyPlayers: PlayerMatchStats[] }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <div className="flex items-center gap-2 mb-3 px-1">
                     <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                     <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">我方高光</h4>
                </div>
                <ClutchList players={players} isEnemy={false} />
            </div>
            <div>
                <div className="flex items-center gap-2 mb-3 px-1">
                     <span className="w-2 h-2 rounded-full bg-red-500"></span>
                     <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">敌方高光</h4>
                </div>
                <ClutchList players={enemyPlayers} isEnemy={true} />
            </div>
        </div>
    );
};

export const ReviewView: React.FC<ReviewViewProps> = ({ 
    allMatches, 
    onSaveMatch,
    onDeleteMatch,
    writableGroups 
}) => {
  const [activeTab, setActiveTab] = useState<'matches' | 'players'>('matches');
  const [detailTab, setDetailTab] = useState<'overview' | 'duels' | 'utility' | 'clutches'>('overview');
  // Removed local matches state, use props
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isJsonDebuggerOpen, setIsJsonDebuggerOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  // State for Import Confirmation Modal
  const [importMatch, setImportMatch] = useState<Match | null>(null);
  const [targetGroupId, setTargetGroupId] = useState<string>('');
  
  // State for Delete Confirmation Modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);

  const isDebug = !!process.env.API_KEY || !!localStorage.getItem('tacbook_gemini_api_key');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize target group ID when writable groups change
  React.useEffect(() => {
      if (writableGroups.length > 0 && !targetGroupId) {
          setTargetGroupId(writableGroups[0].metadata.id);
      }
  }, [writableGroups]);

  // --- Calculations ---
  const playerStats = useMemo(() => {
    return ROSTER.map(player => {
        const matchesPlayed = allMatches
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
  }, [allMatches]);

  const selectedPlayerStats = useMemo(() => {
      if (!selectedPlayerId) return null;
      const profile = playerStats.find(p => p.id === selectedPlayerId);
      const history = allMatches.filter(m => m.players.some(p => getRosterId(p.playerId) === selectedPlayerId))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map(m => {
            const stats = m.players.find(p => getRosterId(p.playerId) === selectedPlayerId)!;
            return { match: m, stats };
        });
      return { profile, history };
  }, [selectedPlayerId, playerStats, allMatches]);

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsParsing(true);
      const reader = new FileReader();
      reader.onload = (ev) => {
          const content = ev.target?.result as string;
          setTimeout(() => {
              try {
                  const data = JSON.parse(content);
                  if (data.meta && data.events) {
                      const newMatch = parseDemoJson(data as DemoData);
                      // Instead of setting local state directly, open confirmation modal
                      setImportMatch(newMatch);
                  } else {
                      alert('解析失败: JSON 格式不符合 Demo 规范');
                  }
              } catch (err) {
                  console.error(err);
                  alert('解析失败: 文件格式错误');
              } finally {
                  setIsParsing(false);
                  if (fileInputRef.current) fileInputRef.current.value = '';
              }
          }, 100);
      };
      reader.readAsText(file);
  };
  
  const handleConfirmImport = () => {
      if (importMatch && targetGroupId) {
          onSaveMatch(importMatch, targetGroupId);
          setImportMatch(null);
          // Optional: navigate to the newly imported match
          setSelectedMatch(importMatch);
      }
  };

  const handleShareMatch = async (match: Match) => {
      const jsonString = JSON.stringify(match, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const mapName = MAPS.find(m => m.id === match.mapId)?.name || match.mapId;
      const safeDate = match.date.split('T')[0];
      const filename = `MATCH_${mapName}_${safeDate}_${match.id}.json`;
      
      const success = await shareFile(blob, filename, "分享比赛数据", `TacBook 比赛解析: ${mapName} (${safeDate})`);
      if (!success) {
          downloadBlob(blob, filename);
      }
  };

  const handleDeleteClick = (match: Match) => {
      setMatchToDelete(match);
      setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
      if (matchToDelete) {
          onDeleteMatch(matchToDelete);
          setDeleteConfirmOpen(false);
          setMatchToDelete(null);
          setSelectedMatch(null); // Return to list if deleting current
      }
  };

  const handlePlayerClick = (id: string) => {
      setSelectedMatch(null);
      setSelectedPlayerId(id);
  };

  // --- Views ---

  // 1. Match Detail View (Full Screen Overlay)
  if (selectedMatch) {
      const mapName = MAPS.find(m => m.id === selectedMatch.mapId)?.name || selectedMatch.mapId;
      
      // Determine win/loss color
      const isWin = selectedMatch.score.us > selectedMatch.score.them;
      const isTie = selectedMatch.score.us === selectedMatch.score.them;
      const scoreColor = isWin ? 'text-green-600 dark:text-green-500' : isTie ? 'text-yellow-600 dark:text-yellow-500' : 'text-red-600 dark:text-red-500';

      const isEditable = writableGroups.some(g => g.metadata.id === selectedMatch.groupId);

      return (
          <div className="fixed inset-0 z-[200] bg-white dark:bg-neutral-950 flex flex-col h-[100dvh] w-screen overflow-hidden animate-in slide-in-from-right duration-300">
              {/* Sticky Top Header */}
              <div className="bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 shadow-sm shrink-0">
                  <div className="flex items-center justify-between px-4 h-[56px]">
                    <button 
                        onClick={() => { setSelectedMatch(null); setDetailTab('overview'); }}
                        className="flex items-center text-sm font-bold text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        返回
                    </button>
                    
                    <div className="flex flex-col items-center">
                         <h2 className="text-base font-black text-neutral-900 dark:text-white leading-tight">{mapName}</h2>
                         <span className="text-[10px] font-mono text-neutral-400">{selectedMatch.date.split('T')[0]}</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <button onClick={() => handleShareMatch(selectedMatch)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        </button>
                        {isEditable && (
                            <button onClick={() => handleDeleteClick(selectedMatch)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        )}
                        <button onClick={() => setIsHelpOpen(true)} className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-lg transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                    </div>
                  </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 pb-20 overscroll-contain bg-neutral-50 dark:bg-neutral-950">
                  
                  {/* Score Card */}
                  <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 mb-4 shadow-sm border border-neutral-100 dark:border-neutral-800 text-center relative overflow-hidden">
                       <div className={`absolute top-0 left-0 right-0 h-1.5 ${isWin ? 'bg-green-500' : isTie ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                       <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">最终比分</div>
                       <div className="flex items-center justify-center gap-3">
                           <span className={`text-4xl font-black font-mono ${scoreColor}`}>{selectedMatch.score.us}</span>
                           <span className="text-2xl text-neutral-300 dark:text-neutral-700">:</span>
                           <span className="text-4xl font-black font-mono text-neutral-900 dark:text-white">{selectedMatch.score.them}</span>
                       </div>
                       <div className="mt-2 text-[10px] text-neutral-400">
                           {isWin ? '胜利' : isTie ? '平局' : '失败'}
                       </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex p-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl overflow-x-auto no-scrollbar snap-x mb-4">
                      {['overview', 'duels', 'utility', 'clutches'].map((t) => (
                          <button
                            key={t}
                            onClick={() => setDetailTab(t as any)}
                            className={`flex-1 min-w-[80px] py-2 rounded-lg text-xs font-bold transition-all capitalize snap-start whitespace-nowrap
                                ${detailTab === t ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
                          >
                              {t === 'overview' ? '总览' : t === 'duels' ? '对位' : t === 'utility' ? '道具' : '残局'}
                          </button>
                      ))}
                  </div>

                  {/* Tab Content */}
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm min-h-[300px]">
                      {detailTab === 'overview' && (
                          <div className="p-4 space-y-6">
                               <div className="md:hidden">
                                   <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1">我方数据</div>
                                   <MatchOverviewTable players={selectedMatch.players} onPlayerClick={handlePlayerClick} />
                                   <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-4"></div>
                                   <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1">敌方数据</div>
                                   <MatchOverviewTable players={selectedMatch.enemyPlayers} isEnemy onPlayerClick={() => {}} />
                               </div>
                               <div className="hidden md:block">
                                   <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">本队数据</h3>
                                   <MatchOverviewTable players={selectedMatch.players} onPlayerClick={handlePlayerClick} />
                                   <div className="h-px bg-neutral-100 dark:bg-neutral-800"></div>
                                   <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">敌方数据</h3>
                                   <MatchOverviewTable players={selectedMatch.enemyPlayers} isEnemy onPlayerClick={() => {}} />
                               </div>
                          </div>
                      )}

                      {detailTab === 'duels' && (
                          <div className="p-4">
                              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4 px-1">对位矩阵</h3>
                              <DuelsMatrix players={selectedMatch.players} enemyPlayers={selectedMatch.enemyPlayers} />
                          </div>
                      )}

                      {detailTab === 'utility' && (
                          <div className="p-4">
                               <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4 px-1">道具使用效率</h3>
                               <UtilityStatsView players={selectedMatch.players} />
                          </div>
                      )}

                      {detailTab === 'clutches' && (
                          <div className="p-4">
                              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4 px-1">残局记录</h3>
                              <ClutchesView players={selectedMatch.players} enemyPlayers={selectedMatch.enemyPlayers} />
                          </div>
                      )}
                  </div>
              </div>
              
              <DataDefinitionsModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
              
              <ConfirmModal 
                isOpen={deleteConfirmOpen}
                title="删除比赛记录"
                message="确定要删除这条比赛记录吗？此操作无法撤销。"
                isDangerous={true}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirmOpen(false)}
              />
          </div>
      );
  }

  // 2. Player Detail View
  if (selectedPlayerId && selectedPlayerStats && selectedPlayerStats.profile) {
      const { profile, history } = selectedPlayerStats;
      // ... (Same player detail view, just ensure responsive classes if needed)
      return (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
               {/* Reusing existing player detail logic, essentially unchanged as it was already quite responsive */}
               <button 
                onClick={() => setSelectedPlayerId(null)}
                className="flex items-center text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  返回列表
              </button>
              {/* Profile Card & History... */}
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
                                   <span className="text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 mt-2 inline-block">
                                       {profile.matches} 场次
                                   </span>
                               </div>
                           </div>
                           
                           <div className="text-right">
                               <div className="text-[10px] font-bold text-neutral-400 uppercase">Rating</div>
                               <div className={`text-4xl font-black tracking-tighter ${Number(profile.avgRating) >= 1.2 ? 'text-red-500' : Number(profile.avgRating) >= 1.05 ? 'text-green-500' : 'text-neutral-400'}`}>
                                   {profile.avgRating}
                               </div>
                           </div>
                       </div>

                       <div className="grid grid-cols-4 gap-2 mb-2">
                           <div className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded-xl text-center border border-neutral-100 dark:border-neutral-700">
                               <div className="text-[9px] text-neutral-400 font-bold uppercase">K/D</div>
                               <div className="text-lg font-black dark:text-white">{profile.kdRatio}</div>
                           </div>
                           <div className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded-xl text-center border border-neutral-100 dark:border-neutral-700">
                               <div className="text-[9px] text-neutral-400 font-bold uppercase">ADR</div>
                               <div className="text-lg font-black dark:text-white">{profile.avgAdr}</div>
                           </div>
                           <div className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded-xl text-center border border-neutral-100 dark:border-neutral-700">
                               <div className="text-[9px] text-neutral-400 font-bold uppercase">HS%</div>
                               <div className="text-lg font-black dark:text-white">{profile.avgHs}%</div>
                           </div>
                            <div className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded-xl text-center border border-neutral-100 dark:border-neutral-700">
                               <div className="text-[9px] text-neutral-400 font-bold uppercase">WE</div>
                               <div className="text-lg font-black dark:text-white">{profile.avgWe}</div>
                           </div>
                       </div>
                   </div>
              </div>
              
              <div>
                  <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-3 px-1">近期表现</h3>
                  <div className="space-y-2">
                      {history.map(({ match, stats }) => {
                          const mapName = MAPS.find(m => m.id === match.mapId)?.name || match.mapId;
                          return (
                              <button 
                                key={match.id} 
                                onClick={() => { setSelectedPlayerId(null); setSelectedMatch(match); }}
                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 rounded-xl flex items-center justify-between hover:border-blue-500/50 transition-all active:scale-[0.99]"
                              >
                                  <div className="flex items-center gap-3">
                                      <div className={`w-1 h-8 rounded-full ${match.result === 'WIN' ? 'bg-green-500' : match.result === 'LOSS' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                      <div className="text-left">
                                          <div className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                              {mapName}
                                              <span className={`text-[10px] font-black ${match.result === 'WIN' ? 'text-green-500' : match.result === 'LOSS' ? 'text-red-500' : 'text-yellow-500'}`}>{match.score.us}:{match.score.them}</span>
                                          </div>
                                          <div className="text-[10px] text-neutral-400 font-mono mt-0.5 text-left">
                                              {match.date.split('T')[0]}
                                          </div>
                                      </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4 text-right">
                                      <div className="flex flex-col items-end">
                                          <div className="text-[9px] text-neutral-400 uppercase font-bold">K - D</div>
                                          <div className={`text-xs font-mono font-bold ${stats.kills - stats.deaths > 0 ? 'text-green-500' : stats.kills - stats.deaths < 0 ? 'text-red-500' : 'text-neutral-500'}`}>
                                              {stats.kills}-{stats.deaths} ({stats.kills - stats.deaths > 0 ? '+' : ''}{stats.kills - stats.deaths})
                                          </div>
                                      </div>
                                      <div className="min-w-[40px] flex flex-col items-end">
                                          <div className="text-[9px] text-neutral-400 uppercase font-bold">RTG</div>
                                          <div className={`text-sm font-black leading-none ${stats.rating >= 1.3 ? 'text-red-500' : stats.rating >= 1.1 ? 'text-green-500' : 'text-neutral-400'}`}>
                                              {stats.rating > 0 ? stats.rating : '-'}
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

  // 3. Main List View (Upload Screen)
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 relative min-h-screen flex flex-col justify-start">
        
        {/* Loading Overlay */}
        {isParsing && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="text-white font-bold text-lg">正在解析 Demo 数据...</div>
                <p className="text-neutral-400 text-sm mt-2">数据量较大，请耐心等待</p>
            </div>
        )}
        
        {/* Import Confirmation Modal */}
        {importMatch && (
            <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">保存比赛数据</h3>
                    
                    <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl mb-4 text-center">
                        <div className="text-sm font-bold text-neutral-900 dark:text-white">{MAPS.find(m => m.id === importMatch.mapId)?.name || importMatch.mapId}</div>
                        <div className="text-xs text-neutral-500 mt-1">{importMatch.date.split('T')[0]}</div>
                        <div className="text-lg font-black mt-2">
                             <span className={importMatch.result === 'WIN' ? 'text-green-500' : 'text-neutral-900 dark:text-white'}>{importMatch.score.us}</span>
                             <span className="text-neutral-400 mx-1">:</span>
                             <span className={importMatch.result === 'LOSS' ? 'text-red-500' : 'text-neutral-900 dark:text-white'}>{importMatch.score.them}</span>
                        </div>
                    </div>

                    <div className="space-y-2 mb-6">
                        <label className="text-xs font-bold text-neutral-500 uppercase">保存到战术包</label>
                        {writableGroups.length > 0 ? (
                            <select 
                                value={targetGroupId} 
                                onChange={(e) => setTargetGroupId(e.target.value)}
                                className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm font-bold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {writableGroups.map(g => (
                                    <option key={g.metadata.id} value={g.metadata.id}>{g.metadata.name}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/10 p-2 rounded-lg border border-red-100 dark:border-red-900/30">
                                无可编辑的战术包。请先新建一个战术包。
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setImportMatch(null)}
                            className="flex-1 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold rounded-xl text-sm"
                        >
                            取消
                        </button>
                        <button 
                            onClick={handleConfirmImport}
                            disabled={writableGroups.length === 0}
                            className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            确认保存
                        </button>
                    </div>
                </div>
            </div>
        )}

        {allMatches.length > 0 ? (
            <div className="w-full space-y-4 self-start px-1 pb-20 pt-4">
                 
                 {/* Action Bar */}
                <div className="flex gap-2 mb-4 sticky top-[60px] z-20 bg-neutral-50/95 dark:bg-neutral-950/95 backdrop-blur py-2">
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
                    
                    {isDebug && (
                        <button 
                            onClick={() => setIsJsonDebuggerOpen(true)}
                            className="px-3 bg-neutral-800 hover:bg-neutral-700 text-yellow-500 rounded-xl flex items-center justify-center transition-colors shadow-lg border border-yellow-500/20"
                            title="JSON 结构分析"
                        >
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                        </button>
                    )}

                    <button 
                        onClick={handleImportClick}
                        className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-blue-500/20"
                        title="导入 Demo JSON"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                    </button>
                </div>

                {/* Match List */}
                 {activeTab === 'matches' && allMatches.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(match => (
                    <div 
                        key={match.id} 
                        onClick={() => setSelectedMatch(match)}
                        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 cursor-pointer hover:border-blue-500/50 transition-all active:scale-[0.99] flex justify-between items-center group shadow-sm w-full"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-1.5 h-10 rounded-full ${match.result === 'WIN' ? 'bg-green-500' : match.result === 'LOSS' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                            <div>
                                <div className="text-lg font-black text-neutral-900 dark:text-white leading-none mb-1">{MAPS.find(m => m.id === match.mapId)?.name || match.mapId}</div>
                                <div className="text-xs text-neutral-400 font-mono">{match.date.split('T')[0]}</div>
                            </div>
                        </div>
                        <div className="text-right">
                             {match.source === 'Demo' ? (
                                <div className="flex flex-col items-end">
                                    <div className="text-2xl font-mono font-black text-neutral-900 dark:text-white">
                                        {match.score.us}:{match.score.them}
                                    </div>
                                    <div className="text-[10px] font-bold text-neutral-400 uppercase">比分</div>
                                </div>
                             ) : (
                                <div className="text-2xl font-mono font-black">
                                    <span className={match.result === 'WIN' ? 'text-green-600' : ''}>{match.score.us}</span>
                                    <span className="text-neutral-300 mx-1">:</span>
                                    <span className={match.result === 'LOSS' ? 'text-red-600' : ''}>{match.score.them}</span>
                                </div>
                             )}
                        </div>
                    </div>
                 ))}

                 {/* Player List */}
                 {activeTab === 'players' && playerStats.map(player => (
                    <div 
                        key={player.id} 
                        onClick={() => setSelectedPlayerId(player.id)}
                        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:border-blue-500/50 transition-colors shadow-sm w-full"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-neutral-500 text-sm border border-neutral-200 dark:border-neutral-700">
                                {player.id[0]}
                            </div>
                            <div>
                                <div className="font-bold text-neutral-900 dark:text-white">{player.name}</div>
                                <div className="text-[10px] text-neutral-500">{player.role.split(' ')[0]}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                             <div>
                                <div className="text-[9px] text-neutral-400 uppercase font-bold">场次</div>
                                <div className="text-xs font-bold font-mono">{player.matches}</div>
                             </div>
                             <div>
                                <div className="text-[9px] text-neutral-400 uppercase font-bold">Rating</div>
                                <div className={`text-sm font-black font-mono ${Number(player.avgRating) >= 1.1 ? 'text-green-500' : 'text-neutral-800 dark:text-neutral-200'}`}>{player.avgRating}</div>
                             </div>
                             <svg className="w-4 h-4 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                             </svg>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 min-h-[calc(100vh-140px)]">
                <div className="w-24 h-24 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-200 dark:border-neutral-800">
                    <svg className="w-10 h-10 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                </div>
                <div>
                    <h2 className="text-2xl font-black text-neutral-900 dark:text-white text-center">导入比赛数据</h2>
                    <p className="text-sm text-neutral-500 mt-2 max-w-xs mx-auto leading-relaxed text-center">
                        请上传由 Demo 解析器生成的 JSON 文件以查看详细数据分析。
                    </p>
                </div>
                <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
                    <button 
                        onClick={handleImportClick}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-blue-600/20 transition-transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        选择文件
                    </button>
                    {isDebug && (
                        <button onClick={() => setIsJsonDebuggerOpen(true)} className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 py-2">
                            打开结构分析器
                        </button>
                    )}
                </div>
            </div>
        )}

        <input 
            ref={fileInputRef}
            type="file" 
            accept=".json" 
            className="hidden" 
            onChange={handleFileChange}
        />
        
        <JsonDebugger 
            isOpen={isJsonDebuggerOpen} 
            onClose={() => setIsJsonDebuggerOpen(false)} 
        />
    </div>
  );
};
