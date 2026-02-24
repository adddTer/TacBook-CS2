
import React from 'react';
import { ROSTER_HISTORY } from '../constants/history';

interface RosterHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RosterHistoryModal: React.FC<RosterHistoryModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-neutral-900 dark:text-white">阵容调整记录</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800">
                        <svg className="w-6 h-6 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {ROSTER_HISTORY.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-4 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                                item.type === 'in' ? 'bg-green-500' : 
                                item.type === 'out' ? 'bg-red-500' : 'bg-yellow-500'
                            }`} />
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-neutral-900 dark:text-white">{item.player}</span>
                                    <span className="text-xs font-mono text-neutral-400">{item.date}</span>
                                </div>
                                <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                    {item.type === 'in' && '加入阵容'}
                                    {item.type === 'out' && '离开阵容'}
                                    {item.type === 'bench' && '移入替补'}
                                    {item.role && <span className="ml-2 px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded text-[10px]">{item.role}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                    {ROSTER_HISTORY.length === 0 && (
                        <div className="text-center text-neutral-400 py-8">暂无记录</div>
                    )}
                </div>
            </div>
        </div>
    );
};
