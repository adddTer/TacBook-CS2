
import React, { useState, useEffect } from 'react';
import { PlayerMatchStats, Match } from '../../types';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { generatePlayerAnalysis } from '../../services/ai/agents/playerReportAgent';
import { getAIConfig, getSelectedModel } from '../../services/ai/config';
import { PlayerAnalysisReport } from '../../services/ai/types';
import { ConfirmModal } from '../ConfirmModal';
import { AiConfigModal } from '../AiConfigModal';
import { AbilityType } from './player_detail/config';

// Import New Sub-Components
import { PlayerDetailHeader } from './player_detail/PlayerDetailHeader';
import { PlayerHeroCard } from './player_detail/PlayerHeroCard';
import { PlayerStatsGrid } from './player_detail/PlayerStatsGrid';
import { PlayerAbilitySection } from './player_detail/PlayerAbilitySection';
import { PlayerMatchHistory } from './player_detail/PlayerMatchHistory';
import { PlayerAiReportModal } from './player_detail/PlayerAiReportModal';
import { identifyRole } from '../../utils/analytics/roleIdentifier';

interface PlayerDetailProps {
    profile: any;
    history: { match: Match, stats: PlayerMatchStats }[];
    onBack: () => void;
    onMatchClick: (match: Match) => void;
}

type SideFilter = 'ALL' | 'CT' | 'T';

export const PlayerDetail: React.FC<PlayerDetailProps> = ({ profile, history, onBack, onMatchClick }) => {
    const [sideFilter, setSideFilter] = useState<SideFilter>('ALL');
    const [selectedAbility, setSelectedAbility] = useState<AbilityType>('firepower');
    
    // AI Report State
    const [analysis, setAnalysis] = useState<PlayerAnalysisReport | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [showAiConfig, setShowAiConfig] = useState(false); // Local config state

    // Confirm Modal State
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    // Use custom hook for logic
    const { overall, filtered } = usePlayerStats(profile.id, history, sideFilter);
    
    // Identify Role
    const calculatedRole = identifyRole(filtered);

    // Load saved report from localStorage on mount or when key filters change
    useEffect(() => {
        const key = `tacbook_ai_report_v2_${profile.id}_${sideFilter}`; 
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                setAnalysis(JSON.parse(saved));
            } catch (e) {
                setAnalysis(null);
            }
        } else {
            setAnalysis(null);
        }
    }, [profile.id, sideFilter]);

    // Order for Radar Chart
    const abilities: { id: AbilityType, label: string, value: number, isPct?: boolean }[] = [
        { id: 'firepower', label: '火力', value: filtered.scoreFirepower }, 
        { id: 'entry', label: '破点', value: filtered.scoreEntry }, 
        { id: 'sniper', label: '狙击', value: filtered.scoreSniper }, 
        { id: 'clutch', label: '残局', value: filtered.scoreClutch }, 
        { id: 'opening', label: '开局', value: filtered.scoreOpening, isPct: false }, 
        { id: 'trade', label: '补枪', value: filtered.scoreTrade }, 
        { id: 'utility', label: '道具', value: filtered.scoreUtility }, 
    ];

    const runAnalysis = async () => {
        if (!getAIConfig().apiKey) {
            setShowAiConfig(true);
            return;
        }

        setIsAnalyzing(true);
        setAnalysisError(null);
        
        try {
            const result = await generatePlayerAnalysis(profile, { overall, filtered });
            setAnalysis(result);
            // Save to localStorage
            const key = `tacbook_ai_report_v2_${profile.id}_${sideFilter}`;
            localStorage.setItem(key, JSON.stringify(result));
            
        } catch (e: any) {
            console.error(e);
            setAnalysisError(e.message || "生成失败");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRegenerate = () => {
        setConfirmConfig({
            isOpen: true,
            title: "重新生成报告",
            message: "重新生成将消耗 Token，且会覆盖当前已保存的报告。是否继续？",
            onConfirm: () => {
                setAnalysis(null);
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                runAnalysis();
            }
        });
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20 font-sans">
            
            <PlayerDetailHeader 
                onBack={onBack}
                onOpenReport={() => setIsReportOpen(true)}
                analysis={analysis}
                sideFilter={sideFilter}
                onSetFilter={setSideFilter}
            />

            <PlayerHeroCard 
                profile={profile}
                stats={overall}
                role={calculatedRole}
            />

            <PlayerStatsGrid 
                filtered={filtered}
            />

            <PlayerAbilitySection 
                abilities={abilities}
                selectedAbility={selectedAbility}
                onSelectAbility={setSelectedAbility}
                detailData={filtered.details}
            />

            <PlayerMatchHistory 
                history={history}
                onMatchClick={onMatchClick}
            />

            <PlayerAiReportModal 
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                analysis={analysis}
                isAnalyzing={isAnalyzing}
                error={analysisError}
                profileId={profile.id}
                role={profile.role}
                sideFilter={sideFilter}
                currentModel={getSelectedModel()}
                onRunAnalysis={runAnalysis}
                onRegenerate={handleRegenerate}
                onOpenConfig={() => setShowAiConfig(true)}
            />
            
            <ConfirmModal 
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            />

            {showAiConfig && (
                <AiConfigModal 
                    onClose={() => setShowAiConfig(false)}
                    onSave={() => setShowAiConfig(false)}
                />
            )}
        </div>
    );
};
