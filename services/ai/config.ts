
import { AIConfig, AIProvider } from "./types";
import { safeStorage } from "../../utils/storage";

const LS_KEY_PROVIDER = "tacbook_ai_provider";
const LS_KEY_BASE_URL = "tacbook_ai_base_url";
const LS_KEY_API_KEY = "tacbook_gemini_api_key";
const LS_KEY_MODEL = "tacbook_gemini_model";

export const getAIConfig = (): AIConfig => {
    return {
        provider: (safeStorage.getItem(LS_KEY_PROVIDER) as AIProvider) || 'google',
        baseUrl: safeStorage.getItem(LS_KEY_BASE_URL) || '',
        apiKey: (typeof process !== 'undefined' && process.env && process.env.API_KEY) || safeStorage.getItem(LS_KEY_API_KEY) || '',
        model: safeStorage.getItem(LS_KEY_MODEL) || 'gemini-3-flash-preview'
    };
};

export const saveAIConfig = (config: AIConfig) => {
    safeStorage.setItem(LS_KEY_PROVIDER, config.provider);
    safeStorage.setItem(LS_KEY_BASE_URL, config.baseUrl);
    safeStorage.setItem(LS_KEY_API_KEY, config.apiKey);
    safeStorage.setItem(LS_KEY_MODEL, config.model);
};

export const getApiKey = () => getAIConfig().apiKey;
export const getSelectedModel = () => getAIConfig().model;
