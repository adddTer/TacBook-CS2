
import { getAIConfig } from "../config";
import { generateAIResponse } from "../providers";
import { buildPlayerAnalysisSystemPrompt } from "../playerReportPrompts";
import { ChatMessage, PlayerAnalysisReport } from "../types";

export const generatePlayerAnalysis = async (
    profile: { id: string, role: string },
    stats: any
): Promise<PlayerAnalysisReport> => {
    const config = getAIConfig();
    if (!config.apiKey) throw new Error("API Key missing");

    const systemPrompt = buildPlayerAnalysisSystemPrompt(profile.id, profile.role);

    // Pre-process details to handle data anomalies
    const rawDetails = stats.filtered.details;
    const isUtilityBroken = (rawDetails.totalFlashes > 5 && rawDetails.totalBlinded === 0) || (rawDetails.totalFlashAssists > 0 && rawDetails.totalBlinded === 0);

    const safeDetails = { ...rawDetails };
    if (isUtilityBroken) {
        // Remove blind time data to prevent AI hallucinations on broken data
        delete safeDetails.blindTimePerRound;
    }

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
        details: safeDetails
    };

    const userMessage = JSON.stringify(cleanStats, null, 2);

    const messages: ChatMessage[] = [
        { role: 'user', text: userMessage }
    ];

    const rawText = await generateAIResponse(config, systemPrompt, messages, undefined, false);

    try {
        // Clean up markdown code blocks if present
        const jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const report: PlayerAnalysisReport = JSON.parse(jsonStr);
        return report;
    } catch (e) {
        console.error("Failed to parse AI report JSON", e, rawText);
        // Fallback structure in case of parsing error
        return {
            summary: "生成报告时发生格式错误，请重试。",
            strengths: [],
            weaknesses: [],
            roleEvaluation: "无法解析数据。"
        };
    }
};
