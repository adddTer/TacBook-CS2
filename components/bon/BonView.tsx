import React, { useState } from 'react';
import { MatchBon, Match, ContentGroup } from '../../types';
import { BonList } from './BonList';
import { BonDetail } from './BonDetail';
import { BonCreatorModal } from './BonCreatorModal';

interface BonViewProps {
    allBons: MatchBon[];
    allMatches: Match[];
    writableGroups: ContentGroup[];
    onSaveBon: (bon: MatchBon, groupId: string) => void;
    onDeleteBon: (bon: MatchBon) => void;
    onSaveMatch: (match: Match, groupId: string) => void;
    onDeleteMatch: (match: Match) => void;
}

export const BonView: React.FC<BonViewProps> = ({
    allBons,
    allMatches,
    writableGroups,
    onSaveBon,
    onDeleteBon,
    onSaveMatch,
    onDeleteMatch
}) => {
    const [selectedBon, setSelectedBon] = useState<MatchBon | null>(null);
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);

    if (selectedBon) {
        return (
            <BonDetail
                bon={selectedBon}
                allMatches={allMatches}
                onBack={() => setSelectedBon(null)}
                onSaveBon={(bon) => onSaveBon(bon, bon.groupId)}
                onDeleteBon={() => {
                    onDeleteBon(selectedBon);
                    setSelectedBon(null);
                }}
                onSaveMatch={onSaveMatch}
                onDeleteMatch={onDeleteMatch}
                writableGroups={writableGroups}
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">BON 管理</h2>
                <button
                    onClick={() => setIsCreatorOpen(true)}
                    disabled={writableGroups.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    创建 BON
                </button>
            </div>

            <BonList
                bons={allBons}
                allMatches={allMatches}
                onSelectBon={setSelectedBon}
            />

            <BonCreatorModal
                isOpen={isCreatorOpen}
                onClose={() => setIsCreatorOpen(false)}
                onSave={onSaveBon}
                writableGroups={writableGroups}
            />
        </div>
    );
};
