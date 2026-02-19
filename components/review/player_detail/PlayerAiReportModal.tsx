
import React from 'react';
import { createPortal } from 'react-dom';
import { PlayerAnalysisReport } from '../../../services/ai/types';

interface PlayerAiReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    analysis: PlayerAnalysisReport | null;
    isAnalyzing: boolean;
    error: string | null;
    profileId: string;
    role: string;
    sideFilter: string;
    currentModel: string;
    onRunAnalysis: () => void;
    onRegenerate: () => void;
    onOpenConfig: () => void;
}

export const PlayerAiReportModal: React.FC<PlayerAiReportModalProps> = ({
    isOpen, onClose, analysis, isAnalyzing, error,
    profileId, role, sideFilter, currentModel,
    onRunAnalysis, onRegenerate, onOpenConfig
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[300] bg-neutral-100 dark:bg-black overflow-y-auto animate-in fade-in duration-200">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    </div>
                    <div>
                        <h3 className="font-black text-lg text-neutral-900 dark:text-white leading-none">AI 表现评估</h3>
                        <p className="text-xs text-neutral-500 font-mono mt-0.5">TARGET: {profileId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {analysis && !isAnalyzing && (
                        <button
                            onClick={onRegenerate}
                            className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                            title="重新生成"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                    )}
                    <button 
                        onClick={onClose}
                        className="p-2 bg-neutral-200 dark:bg-neutral-800 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                    >
                        <svg className="w-5 h-5 text-neutral-600 dark:text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6 md:p-10">
                {error ? (
                        <div className="flex flex-col items-center justify-center py-20 text-red-500">
                            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <p className="text-lg font-bold">生成失败</p>
                            <p className="text-sm opacity-70 mt-2 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg font-mono">{error}</p>
                        </div>
                    ) : isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center py-32 text-neutral-400">
                            <div className="relative w-20 h-20 mb-8">
                            <div className="absolute inset-0 border-4 border-neutral-200 dark:border-neutral-800 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <h4 className="text-xl font-bold text-neutral-800 dark:text-white animate-pulse">正在深度分析比赛数据...</h4>
                            <p className="text-sm opacity-50 mt-3 font-mono">{currentModel}</p>
                        </div>
                    ) : analysis ? (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        {/* 1. Summary Card */}
                        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 shadow-xl border border-neutral-200 dark:border-neutral-800">
                            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">表现总结</h4>
                            <p className="text-lg md:text-xl font-medium text-neutral-800 dark:text-neutral-100 leading-relaxed">
                                {analysis.summary}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* 2. Strengths */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <h4 className="font-bold text-neutral-900 dark:text-white">高光表现</h4>
                                </div>
                                {analysis.strengths?.map((item, i) => (
                                    <div key={i} className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border-l-4 border-green-500 shadow-sm">
                                        <div className="font-bold text-neutral-900 dark:text-white mb-2">{item.title}</div>
                                        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{item.description}</p>
                                    </div>
                                ))}
                            </div>

                            {/* 3. Weaknesses */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    </div>
                                    <h4 className="font-bold text-neutral-900 dark:text-white">改进建议</h4>
                                </div>
                                {analysis.weaknesses?.map((item, i) => (
                                    <div key={i} className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border-l-4 border-orange-500 shadow-sm">
                                        <div className="font-bold text-neutral-900 dark:text-white mb-2">{item.title}</div>
                                        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{item.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 4. Role Evaluation */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-3xl p-8 border border-blue-100 dark:border-blue-900/30">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                                    Role: {role}
                                </div>
                                <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 uppercase tracking-widest">职责评估</h4>
                            </div>
                            <p className="text-neutral-700 dark:text-neutral-300 leading-8">
                                {analysis.roleEvaluation}
                            </p>
                        </div>
                    </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                                <svg className="w-10 h-10 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-3">AI 战术分析</h3>
                            <p className="text-neutral-500 dark:text-neutral-400 max-w-md mb-8 leading-relaxed">
                                使用先进的 AI 模型深度分析 {profileId} 的比赛表现、风格定位及改进建议。
                            </p>
                            <button 
                                onClick={onRunAnalysis}
                                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                开始分析
                            </button>
                            <div className="mt-6 flex items-center gap-2 text-xs font-mono text-neutral-400">
                                <span>MODEL: {currentModel}</span>
                                <button onClick={onOpenConfig} className="hover:text-blue-500 underline">Change</button>
                            </div>
                        </div>
                    )}
            </div>
        </div>,
        document.body
    );
};
