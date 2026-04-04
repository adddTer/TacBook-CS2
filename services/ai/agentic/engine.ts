import { GoogleGenAI, GenerateContentResponse, Type, Content, Part, ThinkingLevel } from "@google/genai";
import { CopilotMessage, CopilotThread, ToolCall, ToolResult } from "./types";
import { toolDeclarations, createToolHandlers } from "./tools";

export class AgenticEngine {
    private ai: GoogleGenAI;
    private thread: CopilotThread;
    private handlers: any;
    private modelName: string;
    private thinkingLevel: string;

    constructor(apiKey: string, thread: CopilotThread, context: any, modelName: string = "gemini-3.1-pro-preview", thinkingLevel: string = "HIGH") {
        this.ai = new GoogleGenAI({ apiKey });
        this.thread = thread;
        this.modelName = modelName;
        this.thinkingLevel = thinkingLevel;
        this.handlers = createToolHandlers({
            ...context,
            threadMemory: thread.memory || {},
            updateMemory: (key, value) => {
                if (!this.thread.memory) this.thread.memory = {};
                this.thread.memory[key] = value;
            }
        });
    }

    /**
     * Static method to test the connection with the provided API key and model.
     */
    static async testConnection(apiKey: string, modelName: string, thinkingLevel: string = "HIGH"): Promise<boolean> {
        try {
            const ai = new GoogleGenAI({ apiKey });
            
            const config: any = { 
                maxOutputTokens: 10
            };

            if (modelName.includes('gemini-3')) {
                config.thinkingConfig = { thinkingLevel };
            }

            const response = await ai.models.generateContent({
                model: modelName,
                contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
                config
            });
            return !!response.text;
        } catch (error) {
            console.error("Connection test failed:", error);
            throw error;
        }
    }

    /**
     * Main entry point for processing a user message.
     * Runs the tool-calling loop until a final response is generated.
     */
    async process(
        onUpdate: (message: Partial<CopilotMessage>) => void,
        onThreadUpdate: (thread: Partial<CopilotThread>) => void,
        resumeMessageId?: string
    ) {
        const startTime = Date.now();
        let loopCount = 0;
        const MAX_LOOPS = 15; 
        
        let currentResponseMsg: CopilotMessage;
        
        if (resumeMessageId) {
            const existing = this.thread.messages.find(m => m.id === resumeMessageId);
            if (existing) {
                currentResponseMsg = { 
                    ...existing, 
                    status: 'pending', 
                    startTime: existing.startTime || startTime,
                    errorType: undefined,
                    errorMessage: undefined
                };
            } else {
                currentResponseMsg = this.createNewModelMessage(startTime);
            }
        } else {
            currentResponseMsg = this.createNewModelMessage(startTime);
        }

        onUpdate(currentResponseMsg);

        // We maintain a separate API history for the SDK to ensure correct role sequencing
        const apiHistory = this.prepareApiHistory();
        
        // If resuming and the last message had tool calls without results, we need to handle that
        if (resumeMessageId && currentResponseMsg.toolCalls && (!currentResponseMsg.toolResults || currentResponseMsg.toolResults.length < currentResponseMsg.toolCalls.length)) {
            const pendingCalls = currentResponseMsg.toolCalls.filter(tc => !currentResponseMsg.toolResults?.find(tr => tr.id === tc.id));
            if (pendingCalls.length > 0) {
                const toolResponseParts: Part[] = [];
                const newToolResults: ToolResult[] = [];

                for (const call of pendingCalls) {
                    const handler = this.handlers[call.name];
                    const result = await this.executeTool(call, handler);
                    newToolResults.push(result);
                    let responseObj = result.result || { error: result.error };
                    if (typeof responseObj !== 'object' || responseObj === null || Array.isArray(responseObj)) {
                        responseObj = { result: responseObj };
                    }
                    responseObj = JSON.parse(JSON.stringify(responseObj));
                    
                    const functionResponse: any = { name: call.name, response: responseObj };
                    if (call.id && !call.id.startsWith('call_')) {
                        functionResponse.id = call.id;
                    }
                    
                    toolResponseParts.push({
                        functionResponse
                    });
                }

                currentResponseMsg.toolResults = [...(currentResponseMsg.toolResults || []), ...newToolResults];
                onUpdate({ ...currentResponseMsg });

                const userContent: Content = {
                    role: 'user',
                    parts: toolResponseParts
                };
                apiHistory.push(userContent);
                
                // Update apiSequence to include the new user message
                currentResponseMsg.apiSequence = [...(currentResponseMsg.apiSequence || []), userContent];
            }
        }

        while (loopCount < MAX_LOOPS) {
            loopCount++;
            
            if (apiHistory.length === 0) {
                currentResponseMsg.runningTime = (currentResponseMsg.runningTime || 0) + (Date.now() - startTime);
                onUpdate({ ...currentResponseMsg, text: "错误：对话历史为空。", status: 'error', errorType: 'fatal', endTime: Date.now() });
                break;
            }

            try {
                let response;
                let retryCount = 0;
                const MAX_RETRIES = 3;
                
                const modelConfig: any = {
                    systemInstruction: "你是一个专业的 CS2 战术助手。你可以通过调用工具来查询战术、道具、比赛数据或记录记忆。请尽量通过工具获取真实数据后再回答用户。如果需要多次调用工具才能完成任务，请分步进行。你的回答应该专业、简洁且富有洞察力。",
                    tools: [{ functionDeclarations: toolDeclarations }],
                };

                if (this.modelName.includes('gemini-3')) {
                    let level = this.thinkingLevel as ThinkingLevel;
                    // Enforce constraints: Pro models don't support MINIMAL
                    if (this.modelName.includes('pro') && level === ThinkingLevel.MINIMAL) {
                        level = ThinkingLevel.LOW;
                    }
                    modelConfig.thinkingConfig = { thinkingLevel: level };
                }

                while (retryCount < MAX_RETRIES) {
                    try {
                        response = await this.ai.models.generateContent({
                            model: this.modelName,
                            contents: apiHistory,
                            config: modelConfig
                        });
                        break;
                    } catch (e: any) {
                        const isRetryable = e.message?.includes('429') || e.message?.includes('500') || e.message?.includes('503');
                        if (isRetryable && retryCount < MAX_RETRIES - 1) {
                            retryCount++;
                            await new Promise(r => setTimeout(r, 1000 * retryCount));
                            continue;
                        }
                        throw e;
                    }
                }

                const candidate = response?.candidates?.[0];
                const content = candidate?.content;
                if (!content) throw new Error("Model returned empty content");
                
                const parts = content.parts || [];
                apiHistory.push(content);

                // Save raw parts to preserve exact thought signatures
                currentResponseMsg.rawParts = [...(currentResponseMsg.rawParts || []), ...parts];
                
                // Save the exact sequence of Content objects generated during this message
                currentResponseMsg.apiSequence = [...(currentResponseMsg.apiSequence || []), content];

                // 1. Handle Text Response
                const textParts = parts.filter(p => p.text).map(p => p.text).join('\n\n');
                if (textParts) {
                    currentResponseMsg.text += (currentResponseMsg.text ? '\n\n' : '') + textParts;
                    onUpdate({ ...currentResponseMsg });
                }

                // 2. Handle Tool Calls
                const toolCallParts = parts.filter(p => p.functionCall);
                if (toolCallParts.length > 0) {
                    const newToolCalls: ToolCall[] = toolCallParts.map(p => ({
                        id: p.functionCall!.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        name: p.functionCall!.name,
                        args: p.functionCall!.args as Record<string, any>
                    }));

                    currentResponseMsg.toolCalls = [...(currentResponseMsg.toolCalls || []), ...newToolCalls];
                    onUpdate({ ...currentResponseMsg });

                    const toolResponseParts: Part[] = [];
                    const newToolResults: ToolResult[] = [];

                    for (const call of newToolCalls) {
                        const handler = this.handlers[call.name];
                        const result = await this.executeTool(call, handler);
                        newToolResults.push(result);
                        
                        let responseObj = result.result || { error: result.error };
                        if (typeof responseObj !== 'object' || responseObj === null || Array.isArray(responseObj)) {
                            responseObj = { result: responseObj };
                        }
                        // Sanitize responseObj to remove undefined values
                        responseObj = JSON.parse(JSON.stringify(responseObj));

                        const functionResponse: any = { name: call.name, response: responseObj };
                        if (call.id && !call.id.startsWith('call_')) {
                            functionResponse.id = call.id;
                        }

                        toolResponseParts.push({
                            functionResponse
                        });
                    }

                    currentResponseMsg.toolResults = [...(currentResponseMsg.toolResults || []), ...newToolResults];
                    onUpdate({ ...currentResponseMsg });

                    const userContent: Content = {
                        role: 'user',
                        parts: toolResponseParts
                    };
                    apiHistory.push(userContent);
                    currentResponseMsg.apiSequence = [...(currentResponseMsg.apiSequence || []), userContent];

                    onThreadUpdate({ memory: this.thread.memory });
                    continue;
                }

                currentResponseMsg.status = 'completed';
                currentResponseMsg.endTime = Date.now();
                currentResponseMsg.runningTime = (currentResponseMsg.runningTime || 0) + (Date.now() - startTime);
                onUpdate({ ...currentResponseMsg });
                break;

            } catch (error: any) {
                console.error("Agentic Engine Error:", error);
                const isRetryable = error.message?.includes('429') || error.message?.includes('500') || error.message?.includes('503');
                currentResponseMsg.runningTime = (currentResponseMsg.runningTime || 0) + (Date.now() - startTime);
                onUpdate({ 
                    ...currentResponseMsg, 
                    status: 'error', 
                    errorType: isRetryable ? 'retryable' : 'fatal',
                    errorMessage: error.message,
                    endTime: Date.now()
                });
                break;
            }
        }
    }

    private createNewModelMessage(startTime: number): CopilotMessage {
        return {
            id: `msg_model_${Date.now()}`,
            role: 'model',
            text: '',
            toolCalls: [],
            toolResults: [],
            timestamp: Date.now(),
            startTime,
            modelName: this.modelName,
            thinkingLevel: this.thinkingLevel,
            status: 'pending'
        };
    }

    private async executeTool(call: ToolCall, handler: any): Promise<ToolResult> {
        if (handler) {
            try {
                const args = call.args || {};
                const result = await handler(args);
                return { id: call.id, name: call.name, result };
            } catch (e: any) {
                return { id: call.id, name: call.name, result: null, error: e.message };
            }
        } else {
            return { id: call.id, name: call.name, result: null, error: "Tool not found" };
        }
    }

    /**
     * Converts CopilotMessage history into Gemini Content format for the initial call.
     */
    private prepareApiHistory(): Content[] {
        const recentMessages = this.thread.messages.slice(-15);
        const history: Content[] = [];

        for (let i = 0; i < recentMessages.length; i++) {
            const msg = recentMessages[i];
            const isLastMessage = i === recentMessages.length - 1;
            
            if (msg.role === 'user') {
                history.push({ role: 'user', parts: [{ text: msg.text || '' }] });
            } else if (msg.role === 'model') {
                if (msg.apiSequence && msg.apiSequence.length > 0) {
                    // Truncate old tool results in the sequence to save tokens
                    const sequence = JSON.parse(JSON.stringify(msg.apiSequence));
                    if (!isLastMessage) {
                        for (const content of sequence) {
                            if (content.role === 'user') {
                                for (const part of content.parts) {
                                    if (part.functionResponse && part.functionResponse.response) {
                                        const jsonStr = JSON.stringify(part.functionResponse.response);
                                        if (jsonStr.length > 2000) {
                                            part.functionResponse.response = { _truncated: "Data omitted to save tokens. Please query again if needed." };
                                        }
                                    }
                                }
                            }
                        }
                    }
                    history.push(...sequence);
                } else {
                    // Fallback for older messages
                    const parts: any[] = [];
                    
                    if (msg.text) {
                        parts.push({ text: msg.text });
                    }

                    if (msg.toolCalls && msg.toolCalls.length > 0) {
                        parts.push(...msg.toolCalls.map(tc => {
                            const functionCall: any = { name: tc.name, args: tc.args };
                            if (tc.id && !tc.id.startsWith('call_')) {
                                functionCall.id = tc.id;
                            }
                            return { functionCall };
                        }));
                    }

                    if (parts.length > 0) {
                        history.push({ role: 'model', parts });
                    }

                    if (msg.toolResults && msg.toolResults.length > 0) {
                        history.push({
                            role: 'user',
                            parts: msg.toolResults.map(tr => {
                                let responseObj = tr.result || { error: tr.error };
                                
                                if (!isLastMessage) {
                                    const jsonStr = JSON.stringify(responseObj);
                                    if (jsonStr.length > 2000) {
                                        responseObj = { _truncated: "Data omitted to save tokens. Please query again if needed." };
                                    }
                                }

                                if (typeof responseObj !== 'object' || responseObj === null || Array.isArray(responseObj)) {
                                    responseObj = { result: responseObj };
                                }
                                responseObj = JSON.parse(JSON.stringify(responseObj));
                                
                                const functionResponse: any = { name: tr.name, response: responseObj };
                                if (tr.id && !tr.id.startsWith('call_')) {
                                    functionResponse.id = tr.id;
                                }
                                
                                return { functionResponse };
                            })
                        });
                    }
                }
            }
        }
        return history;
    }
}
