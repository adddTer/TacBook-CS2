export type Role = 'user' | 'model' | 'tool' | 'system';

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
}

export interface CopilotMessage {
    id: string;
    role: Role;
    text?: string;
    toolCalls?: ToolCall[];
    toolResults?: ToolResult[];
    timestamp: number;
    startTime?: number;
    endTime?: number;
    runningTime?: number; // Accumulated running time in milliseconds
    modelName?: string;
    thinkingLevel?: string;
    status?: 'pending' | 'streaming' | 'completed' | 'error'; // 用于 UI 状态展示
    errorType?: 'retryable' | 'fatal';
    errorMessage?: string;
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
