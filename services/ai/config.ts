
import { AIConfig, AIProvider } from "./types";

const LS_KEY_PROVIDER = "tacbook_ai_provider";
const LS_KEY_BASE_URL = "tacbook_ai_base_url";
const LS_KEY_API_KEY = "tacbook_gemini_api_key";
const LS_KEY_MODEL = "tacbook_gemini_model";

export const getAIConfig = (): AIConfig => {
    return {
        provider: (localStorage.getItem(LS_KEY_PROVIDER) as AIProvider) || 'google',
        baseUrl: localStorage.getItem(LS_KEY_BASE_URL) || '',
        apiKey: process.env.API_KEY || localStorage.getItem(LS_KEY_API_KEY) || '',
        model: localStorage.getItem(LS_KEY_MODEL) || 'gemini-3-flash-preview'
    };
};

export const saveAIConfig = (config: AIConfig) => {
    localStorage.setItem(LS_KEY_PROVIDER, config.provider);
    localStorage.setItem(LS_KEY_BASE_URL, config.baseUrl);
    localStorage.setItem(LS_KEY_API_KEY, config.apiKey);
    localStorage.setItem(LS_KEY_MODEL, config.model);
};

export const getApiKey = () => getAIConfig().apiKey;
export const getSelectedModel = () => getAIConfig().model;
