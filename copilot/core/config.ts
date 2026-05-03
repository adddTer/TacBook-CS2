
import { AIConfig, AIProvider } from "./types";

// Safe wrapper for localStorage
const safeStorage = {
    getItem: (key: string): string | null => {
        try {
            return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
        } catch {
            return null;
        }
    },
    setItem: (key: string, value: string): void => {
        try {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, value);
            }
        } catch {
            // Ignore if quota exceeded or disabled
        }
    }
};

const LS_KEY_PROVIDER = "tacbook_ai_provider";
const LS_KEY_BASE_URL = "tacbook_ai_base_url";
const LS_KEY_API_KEY = "tacbook_gemini_api_key";
const LS_KEY_MODEL = "tacbook_gemini_model";
const LS_KEY_THINKING_LEVEL = "tacbook_gemini_thinking_level";
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
        model: safeStorage.getItem(LS_KEY_MODEL) || 'gemini-3.1-pro-preview',
        thinkingLevel: (safeStorage.getItem(LS_KEY_THINKING_LEVEL) as any) || 'HIGH'
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
    if (config.thinkingLevel) {
        safeStorage.setItem(LS_KEY_THINKING_LEVEL, config.thinkingLevel);
    }
};

export const getApiKey = () => getAIConfig().apiKey;
export const getSelectedModel = () => getAIConfig().model;
export const getThinkingLevel = () => getAIConfig().thinkingLevel;

export const isMultimodalSupported = (model: string, fileType: string): boolean => {
    const m = model.toLowerCase();
    
    const isImage = fileType.startsWith('image/');
    const isAudio = fileType.startsWith('audio/');
    const isVideo = fileType.startsWith('video/');
    const isTextOrPdf = fileType === 'application/pdf' || fileType.includes('text/plain');
    
    // DeepSeek
    if (m.includes('deepseek')) return false;

    // OpenAI Models
    // gpt-5.5 / gpt-5.4 / gpt-5 / gpt-4.1
    if (m.includes('gpt-5.5') || m.includes('gpt-5.4') || m.includes('gpt-5') || m.includes('gpt-4.1')) {
        return isImage;
    }
    // gpt-5.1-codex-max
    if (m.includes('gpt-5.1-codex-max')) {
        return isImage;
    }
    // gpt-realtime-1.5
    if (m.includes('gpt-realtime-1.5')) {
        return isAudio || isImage;
    }
    // gpt-realtime
    if (m.includes('gpt-realtime')) {
        return isAudio;
    }
    // gpt-audio / gpt-audio-1.5
    if (m.includes('gpt-audio')) {
        return isAudio;
    }
    // whisper / transcribe
    if (m.includes('transcribe') || m.includes('whisper')) {
        return isAudio;
    }
    // GPT Image 2
    if (m.includes('image 2') || m.includes('gpt-image')) {
        return isImage;
    }
    
    // Gemini Models
    // gemini-3.1-flash-live-preview
    if (m.includes('gemini-3.1-flash-live-preview')) {
        return isAudio || isVideo || isImage;
    }
    // gemini-2.5-flash-native-audio-preview
    if (m.includes('gemini-2.5-flash-native-audio-preview')) {
        return isAudio || isVideo;
    }
    // gemini-3.1-flash-image-preview / gemini-2.5-flash-image
    if (m.includes('flash-image')) {
        return isImage;
    }
    // gemini-3.1-pro / gemini-3-flash / gemini-3.1-flash-lite / gemini-2.5-pro / gemini-2.5-flash / gemini-2.5-flash-lite
    if (m.includes('gemini-3.1') || m.includes('gemini-3') || m.includes('gemini-2.5')) {
        return isAudio || isVideo || isImage || isTextOrPdf;
    }
    if (m.includes('gemini')) {
        return isAudio || isVideo || isImage || isTextOrPdf;
    }

    // GPT-4o fallback
    if (m.includes('gpt-4o')) {
        return isImage;
    }
    if (m.includes('gpt-4')) return isImage;

    return isImage; // fallback
};
