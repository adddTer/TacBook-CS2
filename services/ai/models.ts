
export const PRESET_MODELS: Record<string, { id: string, name: string }[]> = {
    google: [
        { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro" },
        { id: "gemini-3-flash-preview", name: "Gemini 3.0 Flash" },
        { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash Lite" },
    ],
    deepseek: [
        { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro" },
        { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
        { id: "deepseek-chat", name: "DeepSeek Chat (V3)" },
        { id: "deepseek-reasoner", name: "DeepSeek Reasoner (R1)" }
    ],
    openai: [],
    custom: []
};
