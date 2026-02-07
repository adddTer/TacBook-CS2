
import { Tactic } from "../../../types";
import { generateId } from "../../../utils/idGenerator";
import { getAIConfig } from "../config";
import { generateAIResponse } from "../providers";
import { buildTacticSystemPrompt } from "../prompts";
import { ChatMessage, TacticAgentResponse } from "../types";

export const chatWithTacticCopilot = async (
    history: ChatMessage[],
    currentTactic: Partial<Tactic>,
    userMessage: string,
    onUpdate?: (fullText: string) => void
): Promise<TacticAgentResponse> => {
    const config = getAIConfig();
    if (!config.apiKey) throw new Error("API Key missing");

    const systemPrompt = buildTacticSystemPrompt(currentTactic);

    // Provide context of the current tactic state
    const contextMessage = `
[Current Tactic Data JSON]
${JSON.stringify({ 
    title: currentTactic.title, 
    tags: currentTactic.tags,
    loadout: currentTactic.loadout, 
    actions: currentTactic.actions 
}, null, 2)}
    `;
    
    const apiMessages: ChatMessage[] = [
        ...history,
        { role: 'system', text: contextMessage },
        { role: 'user', text: userMessage }
    ];

    try {
        let accumulatedText = "";
        
        // Handle streaming updates
        const handleChunk = (chunk: string) => {
            accumulatedText += chunk;
            if (onUpdate) onUpdate(accumulatedText);
        };

        const rawResponse = await generateAIResponse(config, systemPrompt, apiMessages, handleChunk, true);
        
        // Post-processing: Extract JSON from the raw text
        // The model might output thinking process <think>...</think> and then the JSON, or just text and then JSON code block.
        
        let jsonStr = rawResponse;
        
        // 1. Remove <think> blocks for JSON parsing
        jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, "");
        
        // 2. Extract JSON code block if present
        const jsonBlockMatch = jsonStr.match(/```json([\s\S]*?)```/);
        if (jsonBlockMatch) {
            jsonStr = jsonBlockMatch[1];
        } else {
             // Fallback: try to find the last object-like structure
             const start = jsonStr.indexOf('{');
             const end = jsonStr.lastIndexOf('}');
             if (start !== -1 && end !== -1) {
                 jsonStr = jsonStr.substring(start, end + 1);
             }
        }

        let parsed: TacticAgentResponse = { reply: rawResponse }; // Default to raw if parse fails
        
        try {
            const data = JSON.parse(jsonStr);
            parsed = data;
            // Ensure reply contains the full raw text (or at least the conversational part) if the JSON reply is empty
            if (!parsed.reply) parsed.reply = rawResponse;
            
        } catch (e) {
            console.warn("JSON Parse Warning, returning raw text:", e);
            // If strictly text response, we just keep the reply
        }

        // Post-processing: Ensure IDs for new actions
        if (parsed.modifiedTactic?.actions) {
            parsed.modifiedTactic.actions = parsed.modifiedTactic.actions.map((a: any) => ({
                ...a,
                id: a.id || generateId('ai_step')
            }));
        }

        return parsed;

    } catch (e) {
        console.error("Agent Error:", e);
        throw e;
    }
};
