import React from 'react';
import { MatchBon, Match } from '../../types';
import { getBonResult } from '../../utils/matchHelpers';

interface BonListProps {
    bons: MatchBon[];
    allMatches: Match[];
    onSelectBon: (bon: MatchBon) => void;
}

export const BonList: React.FC<BonListProps> = ({ bons, allMatches, onSelectBon }) => {
    if (bons.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-neutral-600">
                <div className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-neutral-900 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <p className="text-sm font-medium">暂无 BON 数据</p>
                <p className="text-xs mt-1">点击右上角创建新的 BON</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bons.map(bon => {
                const result = getBonResult(bon, allMatches);
                
                return (
                    <div 
                        key={bon.id}
                        onClick={() => onSelectBon(bon)}
                        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors relative overflow-hidden group"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-neutral-900 dark:text-white truncate pr-4">{bon.title}</h3>
                            <span className="text-xs font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-2 py-1 rounded">
                                {bon.type}
                            </span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                            <div className="flex flex-col">
                                <span className="text-xs text-neutral-500">比分</span>
                                <span className="font-bold text-lg text-neutral-900 dark:text-white">
                                    {result.us} - {result.them}
                                </span>
                            </div>
                            
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                result.result === 'WIN' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                result.result === 'LOSS' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                result.result === 'TIE' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                            }`}>
                                {result.result === 'WIN' ? '胜利' : result.result === 'LOSS' ? '失败' : result.result === 'TIE' ? '平局' : '进行中'}
                            </div>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                            <span className="text-xs text-neutral-500">
                                {bon.matches.length} 场比赛
                            </span>
                            <span className="text-xs text-neutral-400">
                                {new Date(bon.date).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
