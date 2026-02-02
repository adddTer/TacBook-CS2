
import { GoogleGenAI, Type } from "@google/genai";
import { Tactic, Utility, Side, MapId } from "../types";
import { generateId } from "../utils/idGenerator";
import { ROSTER } from "../constants/roster";

// Local Storage Keys
const LS_KEY_PROVIDER = "tacbook_ai_provider"; // 'google' | 'deepseek' | 'openai' | 'custom'
const LS_KEY_BASE_URL = "tacbook_ai_base_url";
const LS_KEY_API_KEY = "tacbook_gemini_api_key"; // Keeping legacy key name for compatibility
const LS_KEY_MODEL = "tacbook_gemini_model";

export type AIProvider = 'google' | 'deepseek' | 'openai' | 'custom';

// --- Configuration ---

export const getAIConfig = () => {
    return {
        provider: (localStorage.getItem(LS_KEY_PROVIDER) as AIProvider) || 'google',
        baseUrl: localStorage.getItem(LS_KEY_BASE_URL) || '',
        apiKey: process.env.API_KEY || localStorage.getItem(LS_KEY_API_KEY) || '',
        model: localStorage.getItem(LS_KEY_MODEL) || 'gemini-3-flash-preview'
    };
};

export const getApiKey = () => getAIConfig().apiKey;
export const getSelectedModel = () => getAIConfig().model;

export const saveAIConfig = (provider: AIProvider, baseUrl: string, apiKey: string, model: string) => {
    localStorage.setItem(LS_KEY_PROVIDER, provider);
    localStorage.setItem(LS_KEY_BASE_URL, baseUrl);
    localStorage.setItem(LS_KEY_API_KEY, apiKey);
    localStorage.setItem(LS_KEY_MODEL, model);
};

// --- Model Lists ---

export const PRESET_MODELS: Record<string, { id: string, name: string }[]> = {
    google: [
        { id: "gemini-3-flash-preview", name: "Gemini 3.0 Flash" },
        { id: "gemini-3-pro-preview", name: "Gemini 3.0 Pro" },
    ],
    deepseek: [
        { id: "deepseek-chat", name: "DeepSeek V3" },
        { id: "deepseek-reasoner", name: "DeepSeek R1" },
    ],
    openai: [
        { id: "gpt-4o", name: "GPT-4o" },
        { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    ],
    custom: []
};

// --- OpenAI Compatible Caller (For DeepSeek, OpenAI, etc.) ---

export const fetchOpenAIModels = async (baseUrl: string, apiKey: string): Promise<{ id: string, name: string }[]> => {
    // Normalize Base URL: usually the endpoint is {baseUrl}/models
    // If user entered ".../chat/completions", strip it.
    let url = baseUrl.replace(/\/chat\/completions$/, "");
    url = url.replace(/\/$/, "");
    url = `${url}/models`;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`Fetch Failed: ${response.status}`);
        }

        const data = await response.json();
        // Handle standard OpenAI response format { data: [...] }
        const list = data.data || data; 
        
        if (Array.isArray(list)) {
            return list.map((m: any) => ({
                id: m.id,
                name: m.id
            })).sort((a: any, b: any) => a.id.localeCompare(b.id));
        }
        return [];
    } catch (e) {
        console.error("Error fetching models:", e);
        throw e;
    }
};

const callOpenAICompatible = async (
    baseUrl: string,
    apiKey: string,
    model: string,
    messages: { role: string, content: string }[],
    jsonMode: boolean = true
) => {
    // Normalize Base URL (remove trailing slash)
    const url = baseUrl.replace(/\/$/, "") + "/chat/completions";

    const body: any = {
        model: model,
        messages: messages,
        temperature: 0.7,
        stream: false
    };

    if (jsonMode) {
        body.response_format = { type: "json_object" };
    }

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`API Error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
};

// --- Common Logic ---

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

// --- Tactic Copilot ---

export const chatWithTacticCopilot = async (
    history: ChatMessage[],
    currentTactic: Partial<Tactic>,
    userMessage: string
): Promise<{ reply: string, modifiedTactic?: Partial<Tactic> }> => {
    const { provider, baseUrl, apiKey, model } = getAIConfig();
    if (!apiKey) throw new Error("API Key missing");

    const rosterRoles = ROSTER.map(r => `${r.roleType} (${r.id})`).join(", ");

    const systemPrompt = `
        You are a Tier 1 Professional CS2 Coach and IGL.
        Context: Map ${currentTactic.mapId}, Side ${currentTactic.side}, Title ${currentTactic.title}.
        Roster: ${rosterRoles}.
        
        Capabilities:
        1. Answer questions about CS2 tactics, formatting your response with Markdown (bold, lists, etc).
        2. To edit the tactic, return a JSON with 'modifiedTactic'.
        
        JSON Output Format:
        {
            "reply": "Explanation in Chinese (Markdown supported)...",
            "modifiedTactic": { ...Partial Tactic Object... }
        }
        
        CRITICAL RULES:
        - If the user just asks a question or asks for an explanation (e.g. "Why?"), DO NOT return 'modifiedTactic'. Only return 'modifiedTactic' if the user specifically asks to change/add/remove/update something.
        - When modifying 'actions' (steps), you MUST return the COMPLETE array of actions. Do NOT return a partial array.
        - When modifying 'loadout', you MUST return the COMPLETE loadout array.
        - Preserve existing IDs if updating an item.
        - Do not generate 'id' fields for *new* actions, the system will handle it.
        - Language: Chinese (Simplified).
    `;

    const userPrompt = `
        [History]
        ${history.map(h => `${h.role}: ${h.text}`).join('\n')}
        
        [Current Tactic Data (Latest Version)]
        ${JSON.stringify({ 
            title: currentTactic.title, 
            tags: currentTactic.tags,
            loadout: currentTactic.loadout, 
            actions: currentTactic.actions 
        }, null, 2)}

        [User Request]
        ${userMessage}
    `;

    try {
        let rawJson = "";

        if (provider === 'google') {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: model,
                contents: userPrompt,
                config: {
                    systemInstruction: systemPrompt,
                    responseMimeType: "application/json",
                }
            });
            rawJson = response.text || "{}";
        } else {
            // OpenAI / DeepSeek
            const messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ];
            rawJson = await callOpenAICompatible(baseUrl, apiKey, model, messages);
        }

        // Clean up markdown code blocks if present (DeepSeek sometimes adds them despite json mode)
        rawJson = rawJson.replace(/```json/g, "").replace(/```/g, "").trim();
        
        const data = JSON.parse(rawJson);

        // Post-processing: Ensure IDs
        if (data.modifiedTactic?.actions) {
            data.modifiedTactic.actions = data.modifiedTactic.actions.map((a: any) => ({
                ...a,
                id: a.id || generateId('ai_step')
            }));
        }

        return data;

    } catch (e) {
        console.error("AI Error:", e);
        return { reply: `AI Error: ${e instanceof Error ? e.message : "Unknown error"}` };
    }
};

// --- Utility Generation ---

export const generateUtilitySuggestion = async (
    prompt: string,
    mapId: MapId,
    side: Side
): Promise<Partial<Utility> | null> => {
    const { provider, baseUrl, apiKey, model } = getAIConfig();
    if (!apiKey) throw new Error("API Key missing");

    const systemPrompt = `
        CS2 Utility Specialist. Map: ${mapId}, Side: ${side}.
        Output JSON: { "title": string, "type": "smoke"|"flash"|"molotov"|"grenade", "site": string, "content": string }.
        Language: Chinese.
    `;

    try {
        let rawJson = "";

        if (provider === 'google') {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    systemInstruction: systemPrompt,
                    responseMimeType: "application/json",
                }
            });
            rawJson = response.text || "{}";
        } else {
            const messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ];
            rawJson = await callOpenAICompatible(baseUrl, apiKey, model, messages);
        }

        rawJson = rawJson.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(rawJson);

    } catch (e) {
        console.error("AI Error:", e);
        return null;
    }
};

// --- Test Connection ---

export const testConnection = async (provider: AIProvider, baseUrl: string, apiKey: string, model: string) => {
    try {
        if (provider === 'google') {
            const ai = new GoogleGenAI({ apiKey });
            await ai.models.generateContent({
                model: model,
                contents: "Hello",
            });
        } else {
            await callOpenAICompatible(baseUrl, apiKey, model, [{ role: "user", content: "Hi" }], false);
        }
        return true;
    } catch (e) {
        throw e;
    }
};
