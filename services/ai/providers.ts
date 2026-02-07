
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, AIConfig } from "./types";

// --- OpenAI Compatible Caller ---
const callOpenAICompatible = async (
    config: AIConfig,
    systemPrompt: string,
    messages: ChatMessage[],
    onUpdate?: (chunk: string) => void,
    jsonMode: boolean = true
): Promise<string> => {
    // Normalize Base URL
    const url = config.baseUrl.replace(/\/$/, "") + "/chat/completions";

    const apiMessages = [
        { role: "system", content: systemPrompt },
        ...messages.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.text }))
    ];

    const body: any = {
        model: config.model,
        messages: apiMessages,
        temperature: 0.7,
        stream: true // Enable streaming
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`API Error ${response.status}: ${err}`);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(line => line.trim() !== "");

        for (const line of lines) {
            if (line.startsWith("data: ")) {
                const dataStr = line.replace("data: ", "").trim();
                if (dataStr === "[DONE]") break;
                
                try {
                    const data = JSON.parse(dataStr);
                    const content = data.choices[0]?.delta?.content || "";
                    if (content) {
                        fullText += content;
                        if (onUpdate) onUpdate(content);
                    }
                    // Handle DeepSeek reasoning field if present
                    const reasoning = data.choices[0]?.delta?.reasoning_content;
                    if (reasoning && onUpdate) {
                         onUpdate(`<think>${reasoning}</think>`); 
                         fullText += `<think>${reasoning}</think>`;
                    }

                } catch (e) {
                    console.warn("Error parsing stream chunk", e);
                }
            }
        }
    }
    return fullText;
};

// --- Google Gemini Caller ---
const callGoogleGemini = async (
    config: AIConfig,
    systemPrompt: string,
    messages: ChatMessage[],
    onUpdate?: (chunk: string) => void,
    jsonMode: boolean = true
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    
    // Construct contents in the format expected by the new SDK
    // [{ role: 'user', parts: [{ text: '...' }] }, ...]
    const contents = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
    }));

    // Add system instruction via config if supported, or prepend to history
    // For simplicity with this SDK wrapper, we prepend system prompt to the first user message or as a separate system turn if model supports
    // But simplest way for chat is often just treating it as context.
    // However, Gemini 3.0 supports system instructions in config.
    
    // Config setup
    const modelConfig: any = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        // Enable search grounding for supported models
        tools: [{ googleSearch: {} }],
    };

    // Add Thinking config for models that might support it (Gemini 3.0 / Thinking models)
    if (config.model.includes('gemini-3') || config.model.includes('thinking')) {
        // Use loose typing to avoid TS errors if ThinkingLevel enum isn't available
        modelConfig.thinkingConfig = {
            thinkingLevel: "HIGH", // Or import ThinkingLevel.HIGH if available
            includeThoughts: true 
        };
    }

    try {
        const response = await ai.models.generateContentStream({
            model: config.model,
            contents: contents,
            config: modelConfig
        });

        if (!response) {
             throw new Error("No response received from Gemini API");
        }

        let fullText = "";
        
        // Iterate directly over the response object (new SDK pattern)
        for await (const chunk of response) {
            // Check for thoughts/reasoning in the chunk if available
            // Note: The structure of chunk for thinking might vary, usually it's just text for now unless specified
            
            // Extract text
            const chunkText = chunk.text; 
            
            if (chunkText) {
                fullText += chunkText;
                if (onUpdate) onUpdate(chunkText);
            }
        }
        return fullText;

    } catch (error: any) {
        console.error("Gemini API Error:", error);
        
        let msg = error.message || "Unknown Error";
        if (msg.includes("500") || msg.includes("INTERNAL") || msg.includes("socket closed")) {
            msg = "Google Service Error (500). 模型思考超时或服务繁忙，请重试或切换模型 (如 2.5 Flash)。";
        } else if (msg.includes("404")) {
            msg = "Model not found. Please check the model name.";
        } else if (msg.includes("asyncIterator")) {
            msg = "Stream Error. Connection interrupted.";
        }
        
        throw new Error(msg);
    }
};

// --- Unified Caller ---
export const generateAIResponse = async (
    config: AIConfig,
    systemPrompt: string,
    messages: ChatMessage[],
    onUpdate?: (chunk: string) => void,
    jsonMode: boolean = true
): Promise<string> => {
    if (config.provider === 'google') {
        return callGoogleGemini(config, systemPrompt, messages, onUpdate, jsonMode);
    } else {
        return callOpenAICompatible(config, systemPrompt, messages, onUpdate, jsonMode);
    }
};

export const fetchOpenAIModels = async (baseUrl: string, apiKey: string): Promise<{ id: string, name: string }[]> => {
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

export const testConnection = async (config: AIConfig) => {
    return generateAIResponse(config, "You are a ping bot. Reply with 'pong'.", [{ role: 'user', text: 'ping' }], undefined, false);
};
