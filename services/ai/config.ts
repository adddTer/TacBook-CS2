
import { AIConfig, AIProvider } from "./types";
import { safeStorage } from "../../utils/storage";

const LS_KEY_PROVIDER = "tacbook_ai_provider";
const LS_KEY_BASE_URL = "tacbook_ai_base_url";
const LS_KEY_API_KEY = "tacbook_gemini_api_key";
const LS_KEY_MODEL = "tacbook_gemini_model";
const LS_KEY_USE_ENV_KEY = "tacbook_use_env_api_key";

export const getEnvApiKey = (): string => {
    // Try Vite env variables first
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        if ((import.meta as any).env.VITE_GEMINI_API_KEY) return (import.meta as any).env.VITE_GEMINI_API_KEY as string;
        if ((import.meta as any).env.VITE_API_KEY) return (import.meta as any).env.VITE_API_KEY as string;
    }
    // Fallback to process.env
    if (typeof process !== 'undefined' && process.env) {
        if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
        if (process.env.API_KEY) return process.env.API_KEY;
    }
    return '';
};

export const hasEnvApiKey = (): boolean => {
    return getEnvApiKey().length > 0;
};

export const isUsingEnvApiKey = (): boolean => {
    if (!hasEnvApiKey()) return false;
    const storedPref = safeStorage.getItem(LS_KEY_USE_ENV_KEY);
    // Default to true if not explicitly set to false
    return storedPref !== 'false';
};

export const setUseEnvApiKey = (useEnv: boolean) => {
    safeStorage.setItem(LS_KEY_USE_ENV_KEY, useEnv ? 'true' : 'false');
};

export const getAIConfig = (): AIConfig => {
    const useEnv = isUsingEnvApiKey();
    return {
        provider: (safeStorage.getItem(LS_KEY_PROVIDER) as AIProvider) || 'google',
        baseUrl: safeStorage.getItem(LS_KEY_BASE_URL) || '',
        apiKey: useEnv ? getEnvApiKey() : (safeStorage.getItem(LS_KEY_API_KEY) || ''),
        model: safeStorage.getItem(LS_KEY_MODEL) || 'gemini-3.1-pro-preview'
    };
};

export const saveAIConfig = (config: AIConfig) => {
    safeStorage.setItem(LS_KEY_PROVIDER, config.provider);
    safeStorage.setItem(LS_KEY_BASE_URL, config.baseUrl);
    // Don't overwrite local storage key with env key
    if (!isUsingEnvApiKey() || config.apiKey !== getEnvApiKey()) {
        safeStorage.setItem(LS_KEY_API_KEY, config.apiKey);
    }
    safeStorage.setItem(LS_KEY_MODEL, config.model);
};

export const getApiKey = () => getAIConfig().apiKey;
export const getSelectedModel = () => getAIConfig().model;
