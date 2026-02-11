
import React, { useState } from 'react';
import { ContentGroup } from '../types';

interface MatchImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileCount: number;
    writableGroups: ContentGroup[];
    onConfirm: (groupId: string) => void;
}

export const MatchImportModal: React.FC<MatchImportModalProps> = ({
    isOpen, onClose, fileCount, writableGroups, onConfirm
}) => {
    const [selectedGroup, setSelectedGroup] = useState(writableGroups[0]?.metadata.id || '');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800">
                <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-2">导入比赛数据</h3>
                <p className="text-sm text-neutral-500 mb-6">
                    准备导入 {fileCount} 个 Demo 解析文件。请选择要保存到的战术包：
                </p>
                
                <div className="mb-6">
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">目标战术包</label>
                    <select 
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {writableGroups.map(g => (
                            <option key={g.metadata.id} value={g.metadata.id}>{g.metadata.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-3 justify-end">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                    >
                        取消
                    </button>
                    <button 
                        onClick={() => onConfirm(selectedGroup)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-transform active:scale-95"
                    >
                        开始导入
                    </button>
                </div>
            </div>
        </div>
    );
};
