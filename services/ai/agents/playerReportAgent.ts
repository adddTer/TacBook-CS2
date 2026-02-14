
import { getAIConfig } from "../config";
import { generateAIResponse } from "../providers";
import { buildPlayerAnalysisSystemPrompt } from "../playerReportPrompts";
import { ChatMessage } from "../types";

export const generatePlayerAnalysis = async (
    profile: { id: string, role: string },
    stats: any
): Promise<string> => {
    const config = getAIConfig();
    if (!config.apiKey) throw new Error("API Key missing");

    const systemPrompt = buildPlayerAnalysisSystemPrompt(profile.id, profile.role);

    // Filter out bulky arrays if any, keep metrics
    const cleanStats = {
        overall: stats.overall,
        metrics: {
            adr: stats.filtered.adr,
            kast: stats.filtered.kast,
            impact: stats.filtered.impact,
            rating: stats.filtered.rating,
            kpr: stats.filtered.details.kpr,
            dpr: stats.filtered.details.dpr,
        },
        scores: {
            firepower: stats.filtered.scoreFirepower,
            entry: stats.filtered.scoreEntry,
            trade: stats.filtered.scoreTrade,
            clutch: stats.filtered.scoreClutch,
            utility: stats.filtered.scoreUtility,
            sniper: stats.filtered.scoreSniper
        },
        // NEW: Include granular details for deeper analysis
        details: stats.filtered.details
    };

    const userMessage = JSON.stringify(cleanStats, null, 2);

    const messages: ChatMessage[] = [
        { role: 'user', text: userMessage }
    ];

    return generateAIResponse(config, systemPrompt, messages, undefined, false);
};
