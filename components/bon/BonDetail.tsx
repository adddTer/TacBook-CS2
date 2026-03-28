import React, { useState, useMemo } from 'react';
import { MatchBon, Match, ContentGroup } from '../../types';
import { getBonResult, getMapDisplayName, getTeamNames, aggregateMatches } from '../../utils/matchHelpers';
import { MatchDetail } from '../review/MatchDetail';

interface BonDetailProps {
    bon: MatchBon;
    allMatches: Match[];
    onBack: () => void;
    onSaveBon: (bon: MatchBon) => void;
    onDeleteBon: () => void;
    onSaveMatch: (match: Match, groupId: string) => void;
    onDeleteMatch: (match: Match) => void;
    writableGroups: ContentGroup[];
}

export const BonDetail: React.FC<BonDetailProps> = ({
    bon,
    allMatches,
    onBack,
    onSaveBon,
    onDeleteBon,
    onSaveMatch,
    onDeleteMatch,
    writableGroups
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(bon.title);
    const [editType, setEditType] = useState(bon.type);
    const [isAddingMatch, setIsAddingMatch] = useState(false);
    const [selectedMapId, setSelectedMapId] = useState<string>('all');
    const [showEditView, setShowEditView] = useState(false);

    const bonMatches = useMemo(() => {
        return bon.matches
            .map(ref => allMatches.find(m => m.id === ref.id))
            .filter((m): m is Match => m !== undefined)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [bon.matches, allMatches]);

    const availableMatchesToAdd = useMemo(() => {
        const existingIds = new Set(bon.matches.map(m => m.id));
        return allMatches.filter(m => !existingIds.has(m.id));
    }, [allMatches, bon.matches]);

    const result = getBonResult(bon, allMatches);

    const aggregatedMatch = useMemo(() => {
        return aggregateMatches(bonMatches, bon.title, bon.id);
    }, [bonMatches, bon.title, bon.id]);

    const currentMatch = useMemo(() => {
        if (selectedMapId === 'all') return aggregatedMatch;
        return bonMatches.find(m => m.id === selectedMapId) || aggregatedMatch;
    }, [selectedMapId, aggregatedMatch, bonMatches]);

    const mapOptions = useMemo(() => {
        const options = [{ id: 'all', label: '全部地图' }];
        bonMatches.forEach(m => {
            const score = m.score ? `${m.score.us}:${m.score.them}` : '';
            options.push({
                id: m.id,
                label: `${getMapDisplayName(m.mapId)} ${score ? `(${score})` : ''}`
            });
        });
        return options;
    }, [bonMatches]);

    const handleSaveEdit = () => {
        if (!editName.trim()) return;
        onSaveBon({
            ...bon,
            title: editName.trim(),
            type: editType
        });
        setIsEditing(false);
    };

    const handleAddMatch = (matchId: string) => {
        onSaveBon({
            ...bon,
            matches: [...bon.matches, { id: matchId, order: bon.matches.length }]
        });
        setIsAddingMatch(false);
    };

    const handleRemoveMatch = (matchId: string) => {
        onSaveBon({
            ...bon,
            matches: bon.matches.filter(m => m.id !== matchId).map((m, i) => ({ ...m, order: i }))
        });
    };

    if (!showEditView) {
        if (!currentMatch || Object.keys(currentMatch).length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                    <p>没有找到比赛数据</p>
                    <button onClick={onBack} className="mt-4 text-blue-500 hover:underline">返回</button>
                    <button onClick={() => setShowEditView(true)} className="mt-4 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm font-medium">
                        编辑 BON
                    </button>
                </div>
            );
        }

        const headerContent = (
            <div className="ml-4 flex items-center gap-2">
                <select
                    value={selectedMapId}
                    onChange={(e) => setSelectedMapId(e.target.value)}
                    className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                >
                    {mapOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                </select>
                <button 
                    onClick={() => setShowEditView(true)}
                    className="p-1.5 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    title="编辑 BON"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
            </div>
        );

        return (
            <MatchDetail
                match={currentMatch}
                onBack={onBack}
                onPlayerClick={() => {}}
                onDelete={() => {
                    if (window.confirm('确定要删除这个 BON 吗？')) {
                        onDeleteBon();
                    }
                }}
                onShare={() => {}}
                headerContent={headerContent}
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between sticky top-[56px] z-30 bg-neutral-50/95 dark:bg-neutral-950/95 backdrop-blur-md py-3 -mx-4 px-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowEditView(false)}
                        className="p-2 -ml-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <input 
                                type="text" 
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                className="px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                autoFocus
                            />
                            <select
                                value={editType}
                                onChange={e => setEditType(e.target.value as any)}
                                className="px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                            >
                                <option value="BO1">BO1</option>
                                <option value="BO2">BO2</option>
                                <option value="BO3">BO3</option>
                                <option value="BO5">BO5</option>
                            </select>
                            <button onClick={handleSaveEdit} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></button>
                            <button onClick={() => setIsEditing(false)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{bon.title}</h2>
                                <span className="text-xs font-mono bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded">
                                    {bon.type}
                                </span>
                            </div>
                            <p className="text-xs text-neutral-500 mt-0.5">
                                创建于 {new Date(bon.date).toLocaleDateString()}
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {!isEditing && (
                        <>
                            <button onClick={() => setIsEditing(true)} className="p-2 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => {
                                if (window.confirm('确定要删除这个 BON 吗？')) {
                                    onDeleteBon();
                                }
                            }} className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Score Overview */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center">
                <div className="text-sm text-neutral-500 mb-2 font-medium tracking-widest uppercase">总比分</div>
                <div className="flex items-center gap-8">
                    <div className="text-4xl font-black text-blue-600 dark:text-blue-500">{result.us}</div>
                    <div className="text-2xl font-bold text-neutral-300 dark:text-neutral-700">-</div>
                    <div className="text-4xl font-black text-red-600 dark:text-red-500">{result.them}</div>
                </div>
                <div className={`mt-4 px-4 py-1.5 rounded-full text-sm font-bold ${
                    result.result === 'WIN' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    result.result === 'LOSS' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    result.result === 'TIE' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                }`}>
                    {result.result === 'WIN' ? '胜利' : result.result === 'LOSS' ? '失败' : result.result === 'TIE' ? '平局' : '进行中'}
                </div>
            </div>

            {/* Matches List */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">包含的比赛 ({bonMatches.length})</h3>
                    <button 
                        onClick={() => setIsAddingMatch(!isAddingMatch)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                    >
                        {isAddingMatch ? '取消添加' : '+ 添加比赛'}
                    </button>
                </div>

                {isAddingMatch && (
                    <div className="mb-6 bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                        <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-3">选择要添加的比赛</h4>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                            {availableMatchesToAdd.length === 0 ? (
                                <p className="text-sm text-neutral-500 text-center py-4">没有可添加的比赛</p>
                            ) : (
                                availableMatchesToAdd.map(m => {
                                    const { teamA, teamB } = getTeamNames(m);
                                    return (
                                        <div key={m.id} className="flex items-center justify-between p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-blue-500 transition-colors">
                                            <div>
                                                <div className="text-sm font-bold text-neutral-900 dark:text-white">
                                                    {teamA} vs {teamB}
                                                </div>
                                                <div className="text-xs text-neutral-500 mt-1 flex gap-2">
                                                    <span>{getMapDisplayName(m.mapId)}</span>
                                                    <span>•</span>
                                                    <span>{new Date(m.date).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleAddMatch(m.id)}
                                                className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                添加
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {bonMatches.length === 0 ? (
                    <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
                        <p className="text-neutral-500 text-sm">这个 BON 还没有添加任何比赛</p>
                        <button 
                            onClick={() => setIsAddingMatch(true)}
                            className="mt-4 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                        >
                            添加比赛
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {bonMatches.map((m, index) => {
                            const { teamA, teamB } = getTeamNames(m);
                            return (
                                <div key={m.id} className="flex gap-3 items-center group">
                                    <div className="w-8 h-8 shrink-0 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center text-xs font-bold text-neutral-500">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-neutral-900 dark:text-white text-sm">
                                                {teamA} vs {teamB}
                                            </div>
                                            <div className="text-xs text-neutral-500 mt-1 flex gap-2">
                                                <span>{getMapDisplayName(m.mapId)}</span>
                                                <span>•</span>
                                                <span>{new Date(m.date).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-lg font-black tracking-tight">
                                                <span className={m.result === 'WIN' ? 'text-green-600' : m.result === 'LOSS' ? 'text-red-600' : 'text-neutral-500'}>
                                                    {m.score?.us || 0}
                                                </span>
                                                <span className="text-neutral-300 dark:text-neutral-700 mx-1">-</span>
                                                <span className={m.result === 'LOSS' ? 'text-green-600' : m.result === 'WIN' ? 'text-red-600' : 'text-neutral-500'}>
                                                    {m.score?.them || 0}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveMatch(m.id)}
                                                className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                title="从 BON 中移除"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
