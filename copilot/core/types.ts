export type Role = 'user' | 'model' | 'tool' | 'system';

export type AIProvider = 'google' | 'deepseek' | 'openai' | 'custom';

export type ThinkingLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'MINIMAL';

export interface AIConfig {
    provider: AIProvider;
    baseUrl: string;
    apiKey: string;
    model: string;
    thinkingLevel?: ThinkingLevel;
}

export const isThinkingLevelSupported = (model: string, level: ThinkingLevel): boolean => {
    if (level === 'MINIMAL') {
        return model.includes('flash-lite') || model.includes('flash-preview');
    }
    if (level === 'LOW' && model.includes('pro')) {
        return true;
    }
    return true; // Other levels generally supported
};

export interface ToolCall {
    id: string;
    name: string;
    args: Record<string, any>;
}

export interface ToolResult {
    id: string;
    name: string;
    result: any;
    error?: string;
    logs?: string;
}

export interface ActionStep {
    id: string;
    type: 'think' | 'action' | 'reply';
    content?: string; // reasoning text or reply text
    toolCalls?: ToolCall[];
    toolResults?: ToolResult[];
    duration?: number;
}

export interface CopilotAttachment {
    id: string;
    file: File;
    name: string;
    type: string;
    size: number;
    url?: string; // object url
    base64?: string;
    textContent?: string; // Used for text or zip extracts
    unsupported?: boolean; // Set to true if model does not support multimodal
}

export interface CopilotMessage {
    id: string;
    role: Role;
    text?: string;
    reasoningContent?: string;
    attachments?: CopilotAttachment[];
    toolCalls?: ToolCall[];
    toolResults?: ToolResult[];
    steps?: ActionStep[];
    timestamp: number;
    startTime?: number;
    endTime?: number;
    runningTime?: number; // Accumulated running time in milliseconds
    modelName?: string;
    thinkingLevel?: string;
    status?: 'pending' | 'streaming' | 'completed' | 'error' | 'interrupted' | 'aborted'; // 用于 UI 状态展示
    errorType?: 'retryable' | 'fatal';
    errorMessage?: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        cachedPromptTokens?: number;
    };
    rawParts?: any[]; // Store exact parts returned by the model to preserve thought signatures
    apiSequence?: any[]; // Store the exact sequence of Content objects generated during this message
}

export interface CopilotThread {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    messages: CopilotMessage[];
    memory: Record<string, any>; // AI 的长期记忆空间
    taskState?: {
        plan: string[];
        currentStepIndex: number;
        completedSteps: string[];
        errorCount: number;
        intermediateResults: string;
    };
    pathway?: 'simple' | 'complex';
}

export interface DataSnapshot {
    id: string;
    timestamp: number;
    description: string;
    targetType: 'tactic' | 'utility' | 'match' | 'settings';
    targetId?: string;
    dataBefore: any;
    dataAfter: any;
}
