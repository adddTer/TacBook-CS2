
import { Tactic } from "../../types";

export type AIProvider = 'google' | 'deepseek' | 'openai' | 'custom';

export interface AIConfig {
    provider: AIProvider;
    baseUrl: string;
    apiKey: string;
    model: string;
}

export interface ChatMessage {
    role: 'user' | 'model' | 'system';
    text: string;
}

export interface TacticAgentResponse {
    reply: string; // The conversational text
    modifiedTactic?: Partial<Tactic>; // Optional data payload if changes were made
    reasoning?: string; // Optional reasoning for the change
}
