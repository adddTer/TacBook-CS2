import React, { useState, useEffect } from 'react';
import { Match, Tournament, ContentGroup, TournamentStage } from '../types';
import { generateId } from '../utils/idGenerator';
import { getMapDisplayName } from '../utils/matchHelpers';

interface TournamentCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableMatches: Match[];
    onSave: (tournament: Tournament, targetGroupId: string) => void;
    writableGroups: ContentGroup[];
}

export const TournamentCreatorModal: React.FC<TournamentCreatorModalProps> = ({
    isOpen, onClose, availableMatches, onSave, writableGroups
}) => {
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedMatches, setSelectedMatches] = useState<{ matchId: string, stage: TournamentStage, customStageName?: string }[]>([]);
    const [targetGroupId, setTargetGroupId] = useState(writableGroups.length > 0 ? writableGroups[0].metadata.id : '');
    const [validationError, setValidationError] = useState<string | null>(null);

    // Auto-fill dates based on selected matches
    useEffect(() => {
        if (selectedMatches.length > 0) {
            const dates = selectedMatches
                .map(sm => availableMatches.find(m => m.id === sm.matchId)?.date)
                .filter(Boolean)
                .map(d => new Date(d as string).getTime());
            
            if (dates.length > 0) {
                const minDate = new Date(Math.min(...dates)).toISOString().split('T')[0];
                const maxDate = new Date(Math.max(...dates)).toISOString().split('T')[0];
                setStartDate(minDate);
                setEndDate(maxDate);
            }
        }
    }, [selectedMatches, availableMatches]);

    if (!isOpen) return null;

    const sortedMatches = [...availableMatches].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const toggleMatch = (matchId: string) => {
        setValidationError(null);
        setSelectedMatches(prev => {
            const exists = prev.find(m => m.matchId === matchId);
            if (exists) {
                return prev.filter(m => m.matchId !== matchId);
            } else {
                return [...prev, { matchId, stage: 'GROUP' }];
            }
        });
    };

    const updateMatchStage = (matchId: string, stage: TournamentStage, customStageName?: string) => {
        setSelectedMatches(prev => prev.map(m => m.matchId === matchId ? { ...m, stage, customStageName } : m));
    };

    const handleCreate = () => {
        if (!title.trim()) {
            setValidationError("请输入赛事标题");
            return;
        }
        if (!startDate) {
            setValidationError("请输入开始日期");
            return;
        }
        if (selectedMatches.length < 1) {
            setValidationError("请至少选择一场比赛");
            return;
        }

        const newTournament: Tournament = {
            id: generateId('tournament'),
            title: title,
            startDate: startDate,
            endDate: endDate || undefined,
            matches: selectedMatches,
        };

        onSave(newTournament, targetGroupId);
        onClose();
        // Reset form
        setTitle('');
        setStartDate('');
        setEndDate('');
        setSelectedMatches([]);
        setValidationError(null);
    };

    return (
        <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-neutral-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-8 py-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-900/50">
                    <div>
                        <h3 className="font-black text-2xl text-neutral-900 dark:text-white tracking-tight">创建赛事</h3>
                        <p className="text-xs text-neutral-500 font-medium mt-1">将多场比赛组合为一个完整的赛事 (Tournament)</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
                        <svg className="w-6 h-6 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    {/* Left: Configuration */}
                    <div className="w-full md:w-96 p-8 border-r border-neutral-100 dark:border-neutral-800 space-y-6 bg-neutral-50/30 dark:bg-neutral-900/30 flex flex-col overflow-y-auto">
                        <div>
                            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">1. 基本信息</label>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-1.5 pl-1">赛事名称</label>
                                    <input 
                                        type="text" 
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="例如: IEM Cologne 2024"
                                        className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-1.5 pl-1">开始日期</label>
                                        <input 
                                            type="date" 
                                            value={startDate}
                                            onChange={e => setStartDate(e.target.value)}
                                            className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-1.5 pl-1">结束日期</label>
                                        <input 
                                            type="date" 
                                            value={endDate}
                                            onChange={e => setEndDate(e.target.value)}
                                            className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-1.5 pl-1">保存至战术包</label>
                                    <select 
                                        value={targetGroupId}
                                        onChange={(e) => setTargetGroupId(e.target.value)}
                                        className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                                    >
                                        {writableGroups.map(g => (
                                            <option key={g.metadata.id} value={g.metadata.id}>{g.metadata.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col min-h-0">
                            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">2. 已选场次与阶段 ({selectedMatches.length})</label>
                            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
                                {selectedMatches.length === 0 ? (
                                    <div className="py-8 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                                        <p className="text-[10px] font-bold text-neutral-400">尚未选择比赛</p>
                                    </div>
                                ) : (
                                    selectedMatches.map((sm, idx) => {
                                        const match = availableMatches.find(m => m.id === sm.matchId);
                                        if (!match) return null;
                                        return (
                                            <div key={sm.matchId} className="flex flex-col gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl animate-in slide-in-from-left-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-5 h-5 shrink-0 bg-blue-600 text-white text-[10px] font-black rounded-md flex items-center justify-center">
                                                            {idx + 1}
                                                        </span>
                                                        <span className="text-xs font-bold text-blue-900 dark:text-blue-200 truncate">
                                                            {getMapDisplayName(match.mapId)}
                                                        </span>
                                                    </div>
                                                    <button 
                                                        onClick={() => toggleMatch(sm.matchId)}
                                                        className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <select 
                                                        value={sm.stage}
                                                        onChange={(e) => updateMatchStage(sm.matchId, e.target.value as TournamentStage, sm.customStageName)}
                                                        className="flex-1 bg-white dark:bg-neutral-950 border border-blue-200 dark:border-blue-800 rounded-lg p-1.5 text-xs font-medium text-blue-900 dark:text-blue-100 outline-none focus:border-blue-500"
                                                    >
                                                        <option value="GROUP">小组赛</option>
                                                        <option value="SWISS">瑞士轮</option>
                                                        <option value="SWISS_ROUND">瑞士轮 (轮次)</option>
                                                        <option value="RO32">1/16决赛 (RO32)</option>
                                                        <option value="RO16">1/8决赛 (RO16)</option>
                                                        <option value="QUARTER_FINAL">1/4决赛</option>
                                                        <option value="SEMI_FINAL">半决赛</option>
                                                        <option value="FINAL">决赛</option>
                                                        <option value="UPPER_BRACKET">胜者组</option>
                                                        <option value="LOWER_BRACKET">败者组</option>
                                                        <option value="OTHER">其他</option>
                                                    </select>
                                                    {sm.stage === 'OTHER' && (
                                                        <input 
                                                            type="text"
                                                            value={sm.customStageName || ''}
                                                            onChange={(e) => updateMatchStage(sm.matchId, 'OTHER', e.target.value)}
                                                            placeholder="自定义阶段"
                                                            className="flex-1 bg-white dark:bg-neutral-950 border border-blue-200 dark:border-blue-800 rounded-lg p-1.5 text-xs font-medium text-blue-900 dark:text-blue-100 outline-none focus:border-blue-500"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            {selectedMatches.length > 0 && (
                                <button 
                                    onClick={() => setSelectedMatches([])}
                                    className="w-full mt-2 py-2 text-[10px] font-bold text-neutral-400 hover:text-red-500 transition-colors"
                                >
                                    清空选择
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right: Match Selection */}
                    <div className="flex-1 p-8 flex flex-col overflow-hidden">
                        <div className="flex justify-between items-end mb-4">
                            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest">3. 选择比赛</label>
                            <span className="text-[10px] text-neutral-400 font-medium italic">点击以添加或移除比赛</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                            {sortedMatches.map(match => {
                                const selectedIndex = selectedMatches.findIndex(m => m.matchId === match.id);
                                const isSelected = selectedIndex !== -1;
                                return (
                                    <div 
                                        key={match.id} 
                                        onClick={() => toggleMatch(match.id)}
                                        className={`group flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border ${
                                            isSelected 
                                            ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/20' 
                                            : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 hover:border-blue-500/50 hover:shadow-md'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-black transition-all ${
                                            isSelected 
                                            ? 'bg-white text-blue-600 border-white scale-110' 
                                            : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400 group-hover:text-blue-500 group-hover:border-blue-200'
                                        }`}>
                                            {isSelected ? selectedIndex + 1 : null}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <span className={`font-black text-base tracking-tight ${isSelected ? 'text-white' : 'text-neutral-900 dark:text-white'}`}>
                                                    {getMapDisplayName(match.mapId)}
                                                </span>
                                                <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-blue-100' : 'text-neutral-400'}`}>
                                                    {match.date.split('T')[0]}
                                                </span>
                                            </div>
                                            <div className={`flex items-center gap-3 mt-1 ${isSelected ? 'text-blue-100' : 'text-neutral-500'}`}>
                                                <span className="text-xs font-black tabular-nums">{match.score.us} : {match.score.them}</span>
                                                <span className="w-1 h-1 rounded-full bg-current opacity-30"></span>
                                                <span className="text-[10px] font-bold uppercase tracking-wider">{match.serverName || '未知服务器'}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {validationError && (
                            <div className="mt-4 bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl text-xs text-red-600 dark:text-red-400 font-bold border border-red-100 dark:border-red-800 flex items-start gap-2 animate-in shake duration-500">
                                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                <div className="whitespace-pre-wrap">{validationError}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex justify-between items-center">
                    <div className="text-xs font-bold text-neutral-400">
                        {selectedMatches.length > 0 ? (
                            <span>已选择 <span className="text-blue-600">{selectedMatches.length}</span> 场比赛</span>
                        ) : (
                            <span>请选择至少一场比赛</span>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <button 
                            onClick={onClose}
                            className="px-6 py-3 text-sm font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                        >
                            取消
                        </button>
                        <button 
                            onClick={handleCreate}
                            disabled={selectedMatches.length === 0}
                            className={`px-8 py-3 rounded-2xl text-sm font-black shadow-xl transition-all active:scale-95 ${
                                selectedMatches.length > 0 
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25' 
                                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                            }`}
                        >
                            创建赛事
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
