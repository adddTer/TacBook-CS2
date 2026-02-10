
import React, { useState } from 'react';
import { Match, MatchSeries, ContentGroup } from '../types';
import { generateId } from '../utils/idGenerator';
import { validateSeriesMatch, getMapDisplayName } from '../utils/matchHelpers';

interface SeriesCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableMatches: Match[];
    onSave: (series: MatchSeries, targetGroupId: string) => void;
    writableGroups: ContentGroup[];
}

export const SeriesCreatorModal: React.FC<SeriesCreatorModalProps> = ({
    isOpen, onClose, availableMatches, onSave, writableGroups
}) => {
    const [title, setTitle] = useState('');
    const [format, setFormat] = useState<'BO3' | 'BO5' | 'BO1'>('BO3');
    const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
    const [targetGroupId, setTargetGroupId] = useState(writableGroups.length > 0 ? writableGroups[0].metadata.id : '');
    const [validationError, setValidationError] = useState<string | null>(null);

    if (!isOpen) return null;

    // Filter out matches that are already in a series? For now, allow re-use.
    // Sort matches by date desc
    const sortedMatches = [...availableMatches].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const toggleMatch = (matchId: string) => {
        setValidationError(null);
        setSelectedMatchIds(prev => {
            if (prev.includes(matchId)) {
                return prev.filter(id => id !== matchId);
            } else {
                return [...prev, matchId];
            }
        });
    };

    const handleCreate = () => {
        if (!title.trim()) {
            setValidationError("请输入系列赛标题");
            return;
        }
        if (selectedMatchIds.length < 1) {
            setValidationError("请至少选择一场比赛");
            return;
        }

        // Validate Series Integrity
        // 1. Get objects
        const selectedMatches = selectedMatchIds.map(id => availableMatches.find(m => m.id === id)!).filter(Boolean);
        // Sort by Date Ascending for the series order
        selectedMatches.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const anchor = selectedMatches[0];
        const seriesRefs = [{ matchId: anchor.id, swapSides: false }];

        for (let i = 1; i < selectedMatches.length; i++) {
            const result = validateSeriesMatch(anchor, selectedMatches[i]);
            if (!result.valid) {
                setValidationError(`比赛 "${getMapDisplayName(selectedMatches[i].mapId)}" 阵容与第一场不匹配：\n${result.error}`);
                return;
            }
            seriesRefs.push({ matchId: selectedMatches[i].id, swapSides: result.swapSides });
        }

        const newSeries: MatchSeries = {
            id: generateId('series'),
            title: title,
            format: format,
            matches: seriesRefs,
            date: anchor.date, // Series date = date of first match
        };

        onSave(newSeries, targetGroupId);
        onClose();
        // Reset form
        setTitle('');
        setSelectedMatchIds([]);
        setValidationError(null);
    };

    return (
        <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-white">创建系列赛 (Series)</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800">
                        <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                    {/* Basic Info */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">标题</label>
                            <input 
                                type="text" 
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="例如: IEM Cologne Final vs G2"
                                className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm font-bold dark:text-white outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">赛制</label>
                            <select 
                                value={format}
                                onChange={e => setFormat(e.target.value as any)}
                                className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm font-bold dark:text-white outline-none"
                            >
                                <option value="BO1">BO1</option>
                                <option value="BO3">BO3</option>
                                <option value="BO5">BO5</option>
                            </select>
                        </div>
                    </div>

                    {/* Target Group */}
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">保存到战术包</label>
                        <select 
                            value={targetGroupId}
                            onChange={(e) => setTargetGroupId(e.target.value)}
                            className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm font-bold dark:text-white outline-none"
                        >
                            {writableGroups.map(g => (
                                <option key={g.metadata.id} value={g.metadata.id}>{g.metadata.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Match Selector */}
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">选择包含的单场比赛 ({selectedMatchIds.length})</label>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto border border-neutral-100 dark:border-neutral-800 rounded-xl p-2 bg-neutral-50/50 dark:bg-neutral-950/30">
                            {sortedMatches.map(match => {
                                const isSelected = selectedMatchIds.includes(match.id);
                                return (
                                    <div 
                                        key={match.id} 
                                        onClick={() => toggleMatch(match.id)}
                                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-500' : 'bg-white dark:bg-neutral-900 border-transparent hover:border-neutral-200 dark:hover:border-neutral-700'}`}
                                    >
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600'}`}>
                                            {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-sm text-neutral-900 dark:text-white">{getMapDisplayName(match.mapId)}</span>
                                                <span className="text-xs font-mono text-neutral-500">{match.date.split('T')[0]}</span>
                                            </div>
                                            <div className="text-[10px] text-neutral-400 mt-0.5">
                                                {match.score.us} : {match.score.them} ({match.serverName || 'Unknown'})
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    {validationError && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-xs text-red-600 dark:text-red-400 font-bold border border-red-100 dark:border-red-800 whitespace-pre-wrap">
                            ⚠️ {validationError}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    >
                        取消
                    </button>
                    <button 
                        onClick={handleCreate}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-transform active:scale-95"
                    >
                        生成系列赛
                    </button>
                </div>
            </div>
        </div>
    );
};
