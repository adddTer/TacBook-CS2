import React, { useState, useEffect } from 'react';
import { MatchBon, ContentGroup, Match } from '../../types';
import { generateId } from '../../utils/idGenerator';
import { isMyTeamMatch, getMapDisplayName } from '../../utils/matchHelpers';

interface BonCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (bon: MatchBon, groupId: string) => void;
    writableGroups: ContentGroup[];
    initialMatches?: Match[];
    tournamentId?: string;
}

export const BonCreatorModal: React.FC<BonCreatorModalProps> = ({ isOpen, onClose, onSave, writableGroups, initialMatches, tournamentId }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<'BO1' | 'BO2' | 'BO3' | 'BO5'>('BO3');
    const [groupId, setGroupId] = useState(writableGroups[0]?.metadata.id || '');
    const [orderedMatches, setOrderedMatches] = useState<Match[]>([]);

    useEffect(() => {
        if (!writableGroups.find(g => g.metadata.id === groupId)) {
            setGroupId(writableGroups[0]?.metadata.id || '');
        }
    }, [writableGroups, groupId]);

    useEffect(() => {
        if (isOpen && initialMatches && initialMatches.length > 0) {
            setOrderedMatches([...initialMatches]);
            
            // Auto-fill name based on server name
            if (initialMatches[0].serverName) {
                setName(initialMatches[0].serverName);
            } else {
                setName('');
            }

            // Auto-fill type based on match results
            let myWins = 0;
            let theirWins = 0;
            
            initialMatches.forEach(m => {
                const isMine = isMyTeamMatch(m);
                if (m.result === 'WIN') {
                    if (isMine) myWins++; else theirWins++;
                } else if (m.result === 'LOSS') {
                    if (isMine) theirWins++; else myWins++;
                }
            });

            const maxWins = Math.max(myWins, theirWins);
            const totalMatches = initialMatches.length;

            if (maxWins === 3) {
                setType('BO5');
            } else if (maxWins === 2) {
                setType('BO3');
            } else if (totalMatches === 1) {
                setType('BO1');
            } else if (totalMatches === 2) {
                setType('BO2'); // Or BO3 if it's a 2-0, but maxWins would catch that above
            } else {
                setType('BO3'); // Default fallback
            }
            
            // Auto-fill group ID from the first match if available
            if (initialMatches[0].groupId) {
                setGroupId(initialMatches[0].groupId);
            }
        } else {
            setOrderedMatches([]);
        }
    }, [isOpen, initialMatches]);

    if (!isOpen) return null;

    const moveMatch = (index: number, direction: -1 | 1) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= orderedMatches.length) return;
        
        const newMatches = [...orderedMatches];
        const temp = newMatches[index];
        newMatches[index] = newMatches[newIndex];
        newMatches[newIndex] = temp;
        setOrderedMatches(newMatches);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !groupId) return;

        const newBon: MatchBon = {
            id: generateId('bon'),
            groupId,
            tournamentId,
            title: name.trim(),
            type,
            matches: orderedMatches.map((m, i) => ({ id: m.id, order: i + 1 })),
            date: new Date().toISOString()
        };

        onSave(newBon, groupId);
        onClose();
        setName('');
        setType('BO3');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-neutral-100 dark:border-neutral-800">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">创建 BON</h3>
                    <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            名称 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="例如：IEM 科隆 决赛"
                            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            类型 <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={type}
                            onChange={e => setType(e.target.value as any)}
                            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        >
                            <option value="BO1">BO1 (单局决胜)</option>
                            <option value="BO2">BO2 (两局)</option>
                            <option value="BO3">BO3 (三局两胜)</option>
                            <option value="BO5">BO5 (五局三胜)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            保存到分组 <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={groupId}
                            onChange={e => setGroupId(e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                            required
                        >
                            {writableGroups.map(g => (
                                <option key={g.metadata.id} value={g.metadata.id}>{g.metadata.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            比赛顺序 <span className="text-neutral-400 font-normal">(可调整)</span>
                        </label>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {orderedMatches.map((match, index) => (
                                <div key={match.id} className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="text-neutral-400 font-mono text-xs w-4">{index + 1}.</span>
                                        <span className="font-medium text-neutral-900 dark:text-white truncate">
                                            {getMapDisplayName(match.mapId)}
                                        </span>
                                        <span className="text-neutral-500 text-xs truncate">
                                            {new Date(match.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                        <button
                                            type="button"
                                            onClick={() => moveMatch(index, -1)}
                                            disabled={index === 0}
                                            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 disabled:opacity-30 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveMatch(index, 1)}
                                            disabled={index === orderedMatches.length - 1}
                                            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 disabled:opacity-30 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {orderedMatches.length === 0 && (
                                <div className="text-sm text-neutral-500 italic p-2">未选择比赛</div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || !groupId}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            创建
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
