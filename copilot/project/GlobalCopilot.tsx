import React from 'react';
import { CopilotUI } from '../ui/CopilotUI';
import { toolDeclarations, createToolHandlers } from './tools';
import { systemInstructionBase, toolNameMap } from './prompts';

interface GlobalCopilotProps {
    allTactics: any[];
    allUtilities: any[];
    allMatches: any[];
    allTournaments: any[];
    allBons: any[];
    onSaveTactic?: (tactic: any, description?: string, author?: string) => void;
    onSaveUtility?: (utility: any, description?: string, author?: string) => void;
    onSaveMatch?: (match: any) => void;
    onDeleteTactic?: (tactic: any) => void;
    onDeleteUtility?: (utility: any) => void;
    onDeleteMatch?: (match: any) => void;
}

export const GlobalCopilot: React.FC<GlobalCopilotProps> = (props) => {
    return (
        <CopilotUI
            toolDeclarations={toolDeclarations}
            createHandlers={createToolHandlers}
            systemInstructionBase={systemInstructionBase}
            context={props}
            title="TacBook Copilot"
            toolNameMap={toolNameMap}
            emptyStateTitle="我是你的战术助手"
            emptyStateDescription="你可以问我关于战术、道具投掷、比赛复盘的任何问题。我会通过 Agentic Workflow 为你提供最专业的建议。"
        />
    );
};
