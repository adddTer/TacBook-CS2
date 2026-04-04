
import { Tactic } from "../../types";

export type AIProvider = 'google' | 'deepseek' | 'openai' | 'custom';

export type ThinkingLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'MINIMAL';

export interface AIConfig {
    provider: AIProvider;
    baseUrl: string;
    apiKey: string;
    model: string;
    thinkingLevel?: ThinkingLevel;
}

export const isThinkingLevelSupported = (model: string, level: ThinkingLevel): boolean => {
    if (level === 'MINIMAL') {
        return model.includes('flash-lite') || model.includes('flash-preview');
    }
    if (level === 'LOW' && model.includes('pro')) {
        return true;
    }
    return true; // Other levels generally supported
};

export interface ChatMessage {
    role: 'user' | 'model' | 'system';
    text: string;
}

export interface TacticAgentResponse {
    reply: string; // The conversational text
    modifiedTactic?: Partial<Tactic>; // Optional data payload if changes were made
    reasoning?: string; // Optional reasoning for the change
}

export interface PlayerAnalysisReport {
    summary: string;
    strengths: { title: string; description: string }[];
    weaknesses: { title: string; description: string }[];
    roleEvaluation: string;
}
