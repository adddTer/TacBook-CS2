import { GoogleGenAI, GenerateContentResponse, Type, Content, Part, ThinkingLevel } from "@google/genai";
import { CopilotMessage, CopilotThread, ToolCall, ToolResult } from "./types";
import { toolDeclarations, createToolHandlers } from "./tools";
import { convertGeminiToolsToOpenAI, convertGeminiHistoryToOpenAI } from "./openai_adapter";
import { getAIConfig } from "../config";

export class AgenticEngine {
    private ai: GoogleGenAI;
    private thread: CopilotThread;
    private handlers: any;
    private modelName: string;
    private thinkingLevel: string;
    private apiKey: string;

    constructor(apiKey: string, thread: CopilotThread, context: any, modelName: string = "gemini-3.1-pro-preview", thinkingLevel: string = "HIGH") {
        this.apiKey = apiKey;
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
        resumeMessageId?: string,
        abortSignal?: AbortSignal
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
            if (abortSignal?.aborted) {
                throw new DOMException('Aborted', 'AbortError');
            }
            
            loopCount++;
            const loopStartTime = Date.now();
            
            if (apiHistory.length === 0) {
                currentResponseMsg.runningTime = (currentResponseMsg.runningTime || 0) + (Date.now() - startTime);
                onUpdate({ ...currentResponseMsg, text: "错误：对话历史为空。", status: 'error', errorType: 'fatal', endTime: Date.now() });
                break;
            }

            try {
                let response;
                let retryCount = 0;
                const MAX_RETRIES = 1;
                
                const modelConfig: any = {
                    systemInstruction: "你是一个专业的 CS2 战术助手。你可以通过调用工具来查询战术、道具、比赛数据或记录记忆。请尽量通过工具获取真实数据后再回答用户。数据来源是用户自行上传的demo。对于不包含注册玩家的比赛，不返回比赛结果。如果需要多次调用工具才能完成任务，请分步进行。你的回答应该专业、简洁且富有洞察力。\n\n**绝对重要：不要在没有调用 finish 工具的情况下结束你的回答！当你完成了用户的请求，或者已经给出了最终回复，你必须（MUST）调用 finish 工具，并将最终回复作为 message 参数传入。否则对话将永远卡住！**",
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
                        const aiConfig = getAIConfig();
                        if (aiConfig.provider !== 'google') {
                            // OpenAI / DeepSeek / Custom API integration
                            if (!this.apiKey) throw new Error(`${aiConfig.provider} API key is not configured.`);
                            
                            const messages = convertGeminiHistoryToOpenAI(apiHistory);
                            
                            // Add system instruction
                            if (modelConfig.systemInstruction) {
                                messages.unshift({
                                    role: 'system',
                                    content: modelConfig.systemInstruction
                                });
                            }

                            const tools = convertGeminiToolsToOpenAI(toolDeclarations);
                            const baseUrl = aiConfig.baseUrl.replace(/\/$/, "") + "/chat/completions";

                            const res = await fetch(baseUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${this.apiKey}`
                                },
                                body: JSON.stringify({
                                    model: this.modelName,
                                    messages: messages,
                                    tools: tools,
                                    temperature: modelConfig.temperature,
                                    max_tokens: modelConfig.maxOutputTokens,
                                }),
                                signal: abortSignal
                            });

                            if (!res.ok) {
                                const errorData = await res.json().catch(() => ({}));
                                throw new Error(errorData.error?.message || `${aiConfig.provider} API Error: ${res.status}`);
                            }

                            const data = await res.json();
                            const message = data.choices[0].message;
                            
                            const parts: Part[] = [];
                            let textContent = message.content || "";
                            if (message.reasoning_content) {
                                textContent = `<think>\n${message.reasoning_content}\n</think>\n\n` + textContent;
                            }
                            if (textContent) {
                                parts.push({ text: textContent });
                            }
                            if (message.tool_calls) {
                                for (const tc of message.tool_calls) {
                                    parts.push({
                                        functionCall: {
                                            id: tc.id,
                                            name: tc.function.name,
                                            args: JSON.parse(tc.function.arguments)
                                        }
                                    });
                                }
                            }
                            
                            response = {
                                candidates: [{
                                    content: {
                                        role: 'model',
                                        parts: parts
                                    }
                                }]
                            };
                        } else {
                            response = await this.ai.models.generateContent({
                                model: this.modelName,
                                contents: apiHistory,
                                config: modelConfig
                            });
                        }
                        break;
                    } catch (e: any) {
                        const isRetryable = e.message?.includes('429') || e.message?.includes('500') || e.message?.includes('503');
                        if (isRetryable && retryCount < MAX_RETRIES - 1) {
                            retryCount++;
                            await new Promise(r => setTimeout(r, 1000 * retryCount));
                            continue;
                        }
                        
                        // If it's an API key error, make it fatal
                        if (e.message?.includes('API key is not configured')) {
                            throw new Error(e.message);
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
                    let currentText = textParts;
                    
                    // Extract reasoning content
                    const thinkMatch = currentText.match(/<think>([\s\S]*?)<\/think>/);
                    let extractedReasoning = '';
                    if (thinkMatch) {
                        extractedReasoning = thinkMatch[1].trim();
                        currentResponseMsg.reasoningContent = (currentResponseMsg.reasoningContent ? currentResponseMsg.reasoningContent + '\n\n' : '') + extractedReasoning;
                        currentText = currentText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                    }
                    
                    if (currentText) {
                        currentResponseMsg.text = (currentResponseMsg.text ? currentResponseMsg.text + '\n\n' : '') + currentText;
                    }
                    
                    // Add step for reasoning
                    if (extractedReasoning) {
                        currentResponseMsg.steps = [...(currentResponseMsg.steps || []), {
                            id: `step_${Date.now()}_think`,
                            type: 'think',
                            content: extractedReasoning,
                            duration: Date.now() - loopStartTime
                        }];
                    }
                    
                    // Add step for reply text if any remains
                    if (currentText) {
                        currentResponseMsg.steps = [...(currentResponseMsg.steps || []), {
                            id: `step_${Date.now()}_reply`,
                            type: 'reply',
                            content: currentText
                        }];
                    }
                    
                    onUpdate({ ...currentResponseMsg });
                }

                // 2. Handle Tool Calls
                const toolCallParts = parts.filter(p => p.functionCall);
                if (toolCallParts.length > 0) {
                    const newToolCalls: ToolCall[] = toolCallParts.map(p => {
                        const id = p.functionCall!.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                        // Inject ID back into functionCall so it's preserved in apiSequence
                        p.functionCall!.id = id;
                        return {
                            id,
                            name: p.functionCall!.name,
                            args: p.functionCall!.args as Record<string, any>
                        };
                    });

                    currentResponseMsg.toolCalls = [...(currentResponseMsg.toolCalls || []), ...newToolCalls];
                    
                    const actionStep: any = {
                        id: `step_${Date.now()}_action`,
                        type: 'action',
                        toolCalls: newToolCalls,
                        toolResults: []
                    };
                    currentResponseMsg.steps = [...(currentResponseMsg.steps || []), actionStep];
                    onUpdate({ ...currentResponseMsg });

                    const toolResponseParts: Part[] = [];
                    const newToolResults: ToolResult[] = [];

                    for (const call of newToolCalls) {
                        const handler = this.handlers[call.name];
                        const result = await this.executeTool(call, handler);
                        newToolResults.push(result);
                        actionStep.toolResults.push(result);
                        
                        let responseObj = result.result || { error: result.error };
                        if (typeof responseObj !== 'object' || responseObj === null || Array.isArray(responseObj)) {
                            responseObj = { result: responseObj };
                        }
                        // Sanitize responseObj to remove undefined values
                        responseObj = JSON.parse(JSON.stringify(responseObj));

                        const functionResponse: any = { 
                            name: call.name, 
                            response: responseObj,
                            id: call.id // Always include ID for OpenAI compatibility
                        };

                        toolResponseParts.push({
                            functionResponse
                        });
                    }

                    currentResponseMsg.toolResults = [...(currentResponseMsg.toolResults || []), ...newToolResults];
                    // Update the step with results
                    currentResponseMsg.steps = [...currentResponseMsg.steps!];
                    onUpdate({ ...currentResponseMsg });

                    const userContent: Content = {
                        role: 'user',
                        parts: toolResponseParts
                    };
                    apiHistory.push(userContent);
                    currentResponseMsg.apiSequence = [...(currentResponseMsg.apiSequence || []), userContent];

                    onThreadUpdate({ memory: this.thread.memory });
                    
                    // If finish tool was called, we can break the loop after sending the result, or wait for the model's final text?
                    // Actually, if finish is called, the model might still want to say something. Let's just continue and let the model output text.
                    continue;
                }

                const hasFinishTool = currentResponseMsg.toolCalls?.some(tc => tc.name === 'finish');
                
                if (!hasFinishTool) {
                    currentResponseMsg.status = 'error';
                    currentResponseMsg.errorType = 'retryable';
                    currentResponseMsg.errorMessage = 'Copilot 未调用完成工具，可能意外中断。';
                } else {
                    currentResponseMsg.status = 'completed';
                }
                
                currentResponseMsg.endTime = Date.now();
                currentResponseMsg.runningTime = (currentResponseMsg.runningTime || 0) + (Date.now() - startTime);
                onUpdate({ ...currentResponseMsg });
                break;

            } catch (error: any) {
                console.error("Agentic Engine Error:", error);
                
                let errorMessage = error.message || "未知错误";
                let isRetryable = errorMessage.includes('429') || errorMessage.includes('500') || errorMessage.includes('503');
                
                // Translate common errors to Chinese
                if (errorMessage.includes('Token count exceeds maximum') || errorMessage.includes('context_length_exceeded')) {
                    errorMessage = "上下文长度超出模型限制 (Token 爆炸)。请尝试开启新对话，或减少查询的数据量。";
                    isRetryable = false; // Usually requires user action to fix
                } else if (errorMessage.includes('API key not valid') || errorMessage.includes('invalid_api_key')) {
                    errorMessage = "API Key 无效或未配置，请在设置中检查您的 API Key。";
                    isRetryable = false;
                } else if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
                    errorMessage = "请求过于频繁 (触发限流)，请稍后再试。";
                    isRetryable = true;
                } else if (errorMessage.includes('fetch failed') || errorMessage.includes('Network Error')) {
                    errorMessage = "网络请求失败，请检查您的网络连接或代理设置。";
                    isRetryable = true;
                }

                currentResponseMsg.runningTime = (currentResponseMsg.runningTime || 0) + (Date.now() - startTime);
                onUpdate({ 
                    ...currentResponseMsg, 
                    status: 'error', 
                    errorType: isRetryable ? 'retryable' : 'fatal',
                    errorMessage: errorMessage,
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
                    for (const content of sequence) {
                        if (content.role === 'user') {
                            for (const part of content.parts) {
                                if (part.functionResponse && part.functionResponse.response) {
                                    const jsonStr = JSON.stringify(part.functionResponse.response);
                                    const limit = isLastMessage ? 50000 : 500;
                                    if (jsonStr.length > limit) {
                                        part.functionResponse.response = { 
                                            _truncated: `Data omitted to save tokens (exceeded ${limit} chars). Please query again with more specific filters if needed.`,
                                            _preview: jsonStr.substring(0, limit) + '...'
                                        };
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
