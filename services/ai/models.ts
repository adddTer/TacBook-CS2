
export const PRESET_MODELS: Record<string, { id: string, name: string }[]> = {
    google: [
        // Gemini 3 Series (Preview)
        { id: "gemini-3-pro-preview", name: "Gemini 3.0 Pro (Preview)" },
        { id: "gemini-3-flash-preview", name: "Gemini 3.0 Flash (Preview)" },
        
        // Gemini 2.5 Series
        { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
        { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
        { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash-Lite" },
        
        // Experimental
        { id: "gemini-2.0-flash-thinking-exp-01-21", name: "Gemini 2.0 Flash Thinking" },
    ],
    deepseek: [],
    openai: [],
    custom: []
};
