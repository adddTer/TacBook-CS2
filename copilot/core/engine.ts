import { GoogleGenAI, GenerateContentResponse, Type, Content, Part, ThinkingLevel, FunctionDeclaration } from "@google/genai";
import { CopilotMessage, CopilotThread, ToolCall, ToolResult } from "./types";
import { convertGeminiToolsToOpenAI, convertGeminiHistoryToOpenAI } from "./openai_adapter";
import { getAIConfig, isMultimodalSupported } from "./config";

export class AgenticEngine {
    private ai: GoogleGenAI;
    private thread: CopilotThread;
    private handlers: any;
    private modelName: string;
    private thinkingLevel: string;
    private apiKey: string;
    private systemInstructionBase: string;
    private toolDeclarations: FunctionDeclaration[];

    constructor(
        apiKey: string, 
        thread: CopilotThread, 
        handlers: any, 
        toolDeclarations: FunctionDeclaration[],
        systemInstructionBase: string,
        modelName: string = "gemini-3.1-pro-preview", 
        thinkingLevel: string = "HIGH"
    ) {
        this.apiKey = apiKey;
        this.ai = new GoogleGenAI({ apiKey });
        this.thread = thread;
        this.modelName = modelName;
        this.thinkingLevel = thinkingLevel;
        this.handlers = handlers;
        this.toolDeclarations = toolDeclarations;
        this.systemInstructionBase = systemInstructionBase;
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

    private async determinePathway(userInput: string, abortSignal?: AbortSignal): Promise<'simple' | 'complex'> {
        try {
            const aiConfig = getAIConfig();
            if (aiConfig.provider !== 'google') {
                const baseUrl = aiConfig.baseUrl.replace(/\/$/, "") + "/chat/completions";
                const messages = [{
                    role: 'user',
                    content: `分析以下用户的输入意图，判断这是一个“简单查询”还是“复杂长任务”。\n简单查询：意图明确，只需少量工具调用即可完成（如查询某个选手数据、某场比赛结果、查找特定战术）。\n复杂长任务：意图宽泛，需要多步推理、大量数据聚合、或分步骤执行（如综合分析大量demo、评选TOP20、深度对比战术风格）。\n\n用户输入："${userInput}"\n\n请仅输出 JSON 格式：{"intent": "simple" | "complex"}`
                }];

                const res = await fetch(baseUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${aiConfig.apiKey}`
                    },
                    body: JSON.stringify({
                        model: aiConfig.model,
                        messages: messages,
                        temperature: 0.1,
                        max_tokens: 50,
                        response_format: { type: "json_object" }
                    }),
                    signal: abortSignal
                });

                if (res.ok) {
                    const data = await res.json();
                    const content = data.choices[0].message.content.toLowerCase();
                    if (content.includes('"intent": "complex"') || content.includes('"intent":"complex"')) {
                        return 'complex';
                    }
                }
            } else {
                // For Google provider, we can just use a simple heuristic or default to simple for now to save latency,
                // or implement a similar fetch call if needed. Let's use a basic keyword heuristic for speed if not OpenAI compatible.
                const complexKeywords = ['分析', '评选', '综合', '深度', '对比', '所有', '全部'];
                let score = 0;
                for (const kw of complexKeywords) {
                    if (userInput.includes(kw)) score++;
                }
                if (score >= 2 || userInput.length > 50) return 'complex';
            }
        } catch (e) {
            console.warn("Intent routing failed, defaulting to simple:", e);
        }
        return 'simple';
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
        const MAX_LOOPS = 100; // Increased significantly for extremely long tasks (10-60 mins)
        
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

        // Determine pathway if not set
        if (!this.thread.pathway) {
            const lastUserMsg = this.thread.messages.filter(m => m.role === 'user').pop();
            if (lastUserMsg && lastUserMsg.text) {
                onUpdate({ ...currentResponseMsg, text: "正在分析任务复杂度...", status: 'pending' });
                this.thread.pathway = await this.determinePathway(lastUserMsg.text, abortSignal);
                onThreadUpdate({ pathway: this.thread.pathway });
                onUpdate({ ...currentResponseMsg, text: "" }); // clear the routing text
            } else {
                this.thread.pathway = 'simple';
            }
        }

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
                    
                    // Truncate large responses to prevent token explosion
                    const jsonStr = JSON.stringify(responseObj);
                    const limit = 15000;
                    if (jsonStr.length > limit) {
                        responseObj = { 
                            _truncated: `Data omitted to save tokens (exceeded ${limit} chars). Please query again with more specific filters if needed.`,
                            _preview: jsonStr.substring(0, limit) + '...'
                        };
                    }
                    
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

        // If resuming and the last message in apiHistory is from the model (e.g. interrupted due to token limit or manual abort),
        if (resumeMessageId && apiHistory.length > 0 && apiHistory[apiHistory.length - 1].role === 'model') {
            const aiConfig = getAIConfig();
            const isDeepSeek = aiConfig.model.toLowerCase().includes('deepseek');
            
            if (!isDeepSeek) {
                // 如果是其他模型，返回模型发生了意外错误，继续完成刚刚未完成的事宜。
                const continueContent: Content = {
                    role: 'user',
                    parts: [{ text: "发生了意外错误，继续完成刚刚未完成的事宜。" }] 
                };
                apiHistory.push(continueContent);
                currentResponseMsg.apiSequence = [...(currentResponseMsg.apiSequence || []), continueContent];
            }
            // 思考传入本地的 DeepSeek 模型，直接将过去内容传给服务器，不需要添加用户信息。
        }

        while (loopCount < MAX_LOOPS) {
            if (abortSignal?.aborted) {
                throw new DOMException('Aborted', 'AbortError');
            }
            
            loopCount++;
            const loopStartTime = Date.now();
            
            // Prune history to prevent token explosion during long tasks
            this.pruneApiHistory(apiHistory);
            
            if (apiHistory.length === 0) {
                currentResponseMsg.runningTime = (currentResponseMsg.runningTime || 0) + (Date.now() - startTime);
                onUpdate({ ...currentResponseMsg, text: "错误：对话历史为空。", status: 'error', errorType: 'fatal', endTime: Date.now() });
                break;
            }

            try {
                let response;
                let retryCount = 0;
                const MAX_RETRIES = 3; // Increased for better stability
                
                let systemInstruction = this.systemInstructionBase + "\n\n**重要提示：**\n1. **记忆功能 (memory_save)**：这帮助你记录重要的阶段性结论或备忘，避免丢失上下文。记忆不需要读取，它始终会包含在你的上下文中。\n";

                let activeTools = this.toolDeclarations;

                if (this.thread.pathway === 'complex') {
                    systemInstruction += "2. **复杂长任务处理 (Plan-and-Solve)**：这是一个复杂长任务，请务必充分利用多轮工具调用。不要急于给出最终结论。你可以先浏览数据，再深挖细节。你可以并且**应该**调用 `update_task_state` 来将你的计划和当前执行进度展示给用户（例如 plan: ['搜索基础数据', '分析队伍A的短板', '总结胜率模型', '得出最终推荐']）。把阶段性核心结果保存在 intermediateResults 或 memory_save 中，一步步稳扎稳打。";
                } else {
                    systemInstruction += "2. **简单查询任务 (Fast Pathway)**：这是一个简单查询任务，请直接调用相关工具获取数据并快速回答，无需制定复杂计划或更新任务状态。";
                    activeTools = this.toolDeclarations.filter(t => t.name !== 'update_task_state');
                }

                const aiConfig = getAIConfig();
                let toolsConfig: any[] = [];
                if (activeTools && activeTools.length > 0) {
                    toolsConfig.push({ functionDeclarations: activeTools });
                }

                const modelConfig: any = {
                    systemInstruction: systemInstruction,
                    tools: toolsConfig,
                };
                
                // Keep toolConfig but do not inject googleSearch or include_server_side_tool_invocations 
                // which causes INVALID_ARGUMENT and PERMISSION_DENIED on some keys
                if (aiConfig.provider === 'google' || this.modelName.includes('gemini')) {
                    modelConfig.toolConfig = { 
                        functionCallingConfig: { mode: 'AUTO' }
                    };
                }

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
                        
                        // Construct context block for Prompt Caching optimization
                        // By injecting dynamic state here instead of systemInstruction, the system prompt remains static
                        let contextBlock = "";
                        if (this.thread.memory && Object.keys(this.thread.memory).length > 0) {
                            contextBlock += `\n\n[SYSTEM INJECTION: Current Memory]\n\`\`\`json\n${JSON.stringify(this.thread.memory, null, 2)}\n\`\`\`\n`;
                        }
                        if (this.thread.pathway === 'complex' && this.thread.taskState) {
                            contextBlock += `\n\n[SYSTEM INJECTION: Current Task State]\n\`\`\`json\n${JSON.stringify(this.thread.taskState, null, 2)}\n\`\`\`\n请根据此状态继续执行你的任务。\n`;
                        }

                        const requestHistory = JSON.parse(JSON.stringify(apiHistory));
                        if (contextBlock && requestHistory.length > 0) {
                            const lastMsg = requestHistory[requestHistory.length - 1];
                            if (lastMsg.role === 'user') {
                                lastMsg.parts.push({ text: contextBlock });
                            } else {
                                requestHistory.push({ role: 'user', parts: [{ text: contextBlock }] });
                            }
                        }

                        if (aiConfig.provider !== 'google') {
                            // OpenAI / DeepSeek / Custom API integration
                            if (!aiConfig.apiKey) throw new Error(`${aiConfig.provider} API key is not configured.`);
                            
                            const messages = convertGeminiHistoryToOpenAI(requestHistory);
                            
                            // Add system instruction
                            if (modelConfig.systemInstruction) {
                                messages.unshift({
                                    role: 'system',
                                    content: modelConfig.systemInstruction
                                });
                            }

                            const tools = convertGeminiToolsToOpenAI(activeTools);
                            const baseUrl = aiConfig.baseUrl.replace(/\/$/, "") + "/chat/completions";

                            const reqBody: any = {
                                model: aiConfig.model,
                                messages: messages,
                                temperature: modelConfig.temperature,
                                max_tokens: modelConfig.maxOutputTokens,
                                stream: true, // ENABLING STREAMING
                                stream_options: { include_usage: true }
                            };
                            if (tools && tools.length > 0) {
                                reqBody.tools = tools;
                            }

                            const res = await fetch(baseUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${aiConfig.apiKey}`
                                },
                                body: JSON.stringify(reqBody),
                                signal: abortSignal
                            });

                            if (!res.ok) {
                                const errorData = await res.json().catch(() => ({}));
                                throw new Error(errorData.error?.message || `${aiConfig.provider} API Error: ${res.status}`);
                            }

                            const reader = res.body?.getReader();
                            if (!reader) throw new Error("No response body");
                            const decoder = new TextDecoder("utf-8");
                            
                            let textContent = "";
                            let reasoningContent = "";
                            const toolCallsMap: Record<number, any> = {};
                            const mUsage = currentResponseMsg.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0, cachedPromptTokens: 0 };
                            let pendingChunk = "";

                            while (true) {
                                if (abortSignal?.aborted) throw new DOMException('Aborted', 'AbortError');
                                
                                const { done: streamDone, value: chunk } = await reader.read();
                                if (streamDone) break;
                                
                                pendingChunk += decoder.decode(chunk, { stream: true });
                                const lines = pendingChunk.split('\n');
                                pendingChunk = lines.pop() || ""; // keep the last potentially incomplete line

                                for (const line of lines) {
                                    const trimmedLine = line.trim();
                                    if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
                                    
                                    const dataStr = trimmedLine.slice(6);
                                    if (dataStr === '[DONE]') continue;
                                    
                                    try {
                                        const parsed = JSON.parse(dataStr);
                                        
                                        // Usage might be in a separate chunk with stream_options: include_usage
                                        if (parsed.usage) {
                                            mUsage.promptTokens += (parsed.usage.prompt_tokens || 0);
                                            mUsage.completionTokens += (parsed.usage.completion_tokens || 0);
                                            mUsage.totalTokens += (parsed.usage.total_tokens || 0);
                                            mUsage.cachedPromptTokens = (mUsage.cachedPromptTokens || 0) + (parsed.usage.prompt_tokens_details?.cached_tokens || 0);
                                            currentResponseMsg.usage = mUsage;
                                        }

                                        const delta = parsed.choices?.[0]?.delta;
                                        if (!delta) continue;
                                        
                                        let updated = false;

                                        if (delta.content) {
                                            textContent += delta.content;
                                            updated = true;
                                        }
                                        if (delta.reasoning_content) {
                                            reasoningContent += delta.reasoning_content;
                                            updated = true;
                                        }
                                        
                                        if (delta.tool_calls) {
                                            for (const tc of delta.tool_calls) {
                                                const index = tc.index;
                                                if (!toolCallsMap[index]) {
                                                    toolCallsMap[index] = { id: tc.id, name: '', arguments: '' };
                                                }
                                                if (tc.function?.name) toolCallsMap[index].name += tc.function.name;
                                                if (tc.function?.arguments) toolCallsMap[index].arguments += tc.function.arguments;
                                            }
                                        }

                                        if (updated) {
                                            let displayPreviewText = textContent;
                                            const blockCount = (displayPreviewText.match(/```/g) || []).length;
                                            if (blockCount % 2 !== 0) {
                                                displayPreviewText += '\n```';
                                            }
                                            
                                            const combinedText = (currentResponseMsg.text ? currentResponseMsg.text + (currentResponseMsg.text.endsWith('\n\n') ? '' : '\n\n') : '') + displayPreviewText;
                                            const combinedReasoning = (currentResponseMsg.reasoningContent ? currentResponseMsg.reasoningContent + '\n\n' : '') + reasoningContent;
                                            
                                            onUpdate({ 
                                                ...currentResponseMsg, 
                                                text: combinedText,
                                                reasoningContent: combinedReasoning || undefined
                                            });
                                        }
                                    } catch (e) {
                                        // Ignore parse errors for incomplete chunks
                                    }
                                }
                            }
                            
                            const parts: Part[] = [];
                            if (reasoningContent) {
                                // For OpenAI/DeepSeek models with explicit reasoning, we insert it manually in the context block 
                                // to remember it in future turns, or Gemini-style formatting. But wait, OpenAI remembers via API automatically?
                                // Actually, DeepSeek provides reasoning_content natively, OpenAI doesn't support repeating reasoning_content yet, so we format it as <think> for Gemini cross-compatibility.
                                textContent = `<think>\n${reasoningContent}\n</think>\n\n` + textContent;
                            }
                            if (textContent) {
                                parts.push({ text: textContent });
                            }
                            
                            const parsedToolCalls = Object.values(toolCallsMap);
                            for (const tc of parsedToolCalls) {
                                parts.push({
                                    functionCall: {
                                        id: tc.id,
                                        name: tc.name,
                                        args: JSON.parse(tc.arguments || '{}')
                                    }
                                });
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
                            const dynamicAi = new GoogleGenAI({ apiKey: aiConfig.apiKey });
                            const stream = await dynamicAi.models.generateContentStream({
                                model: aiConfig.model,
                                contents: requestHistory,
                                config: modelConfig
                            });
                            
                            const parts: Part[] = [];
                            let textContent = "";
                            let reasoningContent = "";
                            let lastChunkUsage: any = null;
                            
                            for await (const chunk of stream) {
                                if (abortSignal?.aborted) {
                                    throw new DOMException('Aborted', 'AbortError');
                                }
                                
                                if (chunk.usageMetadata) {
                                    lastChunkUsage = chunk.usageMetadata;
                                }
                                
                                const candidate = chunk.candidates?.[0];
                                if (!candidate || !candidate.content || !candidate.content.parts) continue;
                                
                                for (const part of candidate.content.parts as any[]) {
                                    if (part.text) {
                                        if (part.thought) {
                                            reasoningContent += part.text;
                                        } else {
                                            textContent += part.text;
                                        }
                                        
                                        // We can do a naive update for the UI to see the stream without mutating the base text yet
                                        let previewText = textContent;
                                        let previewReasoning = reasoningContent;
                                        
                                        const thinkMatch = previewText.match(/<think>([\s\S]*?)<\/think>/);
                                        const thinkOpenMatch = previewText.match(/<think>([\s\S]*)$/);
                                        
                                        if (thinkMatch) {
                                            previewReasoning += (previewReasoning ? '\n\n' : '') + thinkMatch[1].trim();
                                            previewText = previewText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                                        } else if (thinkOpenMatch) {
                                            previewReasoning += (previewReasoning ? '\n\n' : '') + thinkOpenMatch[1].trim();
                                            previewText = previewText.replace(/<think>[\s\S]*$/g, '').trim();
                                        }
                                        
                                        let displayPreviewText = previewText;
                                        const blockCount = (displayPreviewText.match(/```/g) || []).length;
                                        if (blockCount % 2 !== 0) {
                                            displayPreviewText += '\n```';
                                        }
                                        
                                        const combinedText = (currentResponseMsg.text ? currentResponseMsg.text + (currentResponseMsg.text.endsWith('\n\n') ? '' : '\n\n') : '') + displayPreviewText;
                                        const combinedReasoning = (currentResponseMsg.reasoningContent ? currentResponseMsg.reasoningContent + '\n\n' : '') + previewReasoning;
                                        
                                        onUpdate({ 
                                            ...currentResponseMsg, 
                                            text: combinedText,
                                            reasoningContent: combinedReasoning || undefined
                                        });
                                    }
                                    if (part.functionCall) {
                                        parts.push(part);
                                    }
                                }
                            }
                            
                            let finalTextContent = textContent;
                            // Add reasoning to finalTextContent as <think> for memory in future turns
                            if (reasoningContent) {
                                finalTextContent = `<think>\n${reasoningContent}\n</think>\n\n` + finalTextContent;
                            }
                            if (finalTextContent) {
                                parts.unshift({ text: finalTextContent });
                            }
                            
                            if (lastChunkUsage) {
                                const mUsage = currentResponseMsg.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0, cachedPromptTokens: 0 };
                                mUsage.promptTokens += (lastChunkUsage.promptTokenCount || 0);
                                mUsage.completionTokens += (lastChunkUsage.candidatesTokenCount || 0);
                                mUsage.totalTokens += (lastChunkUsage.totalTokenCount || 0);
                                mUsage.cachedPromptTokens = (mUsage.cachedPromptTokens || 0) + (lastChunkUsage.cachedContentTokenCount || 0);
                                currentResponseMsg.usage = mUsage;
                            }
                            
                            response = {
                                candidates: [{
                                    content: {
                                        role: 'model',
                                        parts: parts
                                    }
                                }]
                            };
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
                let currentText = '';
                if (textParts) {
                    currentText = textParts;
                    
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

                    let shouldInterrupt = false;

                    for (const call of newToolCalls) {
                        const handler = this.handlers[call.name];
                        const result = await this.executeTool(call, handler);
                        newToolResults.push(result);
                        actionStep.toolResults.push(result);
                        
                        let responseObj = result.result || { error: result.error };
                        if (typeof responseObj !== 'object' || responseObj === null || Array.isArray(responseObj)) {
                            responseObj = { result: responseObj };
                        }
                        
                        if (responseObj._engine_interrupt) {
                            shouldInterrupt = true;
                            // Clean it up so the model only sees the acknowledgment
                            responseObj = { status: "Awaiting user input..." };
                        }
                        
                        // Sanitize responseObj to remove undefined values
                        responseObj = JSON.parse(JSON.stringify(responseObj));
                        
                        // Truncate large responses to prevent token explosion during long tasks
                        const jsonStr = JSON.stringify(responseObj);
                        const limit = 15000;
                        if (jsonStr.length > limit) {
                            responseObj = { 
                                _truncated: `Data omitted to save tokens (exceeded ${limit} chars). Please query again with more specific filters if needed.`,
                                _preview: jsonStr.substring(0, limit) + '...'
                            };
                        }

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

                    // Check for infinite loop and inject warning if needed
                    if (this.checkInfiniteLoop(currentResponseMsg)) {
                        const lastPart = toolResponseParts[toolResponseParts.length - 1];
                        if (lastPart.functionResponse && lastPart.functionResponse.response) {
                            lastPart.functionResponse.response._SYSTEM_WARNING = "INFINITE LOOP DETECTED. You are repeating the exact same tool call with the same arguments multiple times. Please STOP repeating this action. Try a different approach, use a different tool, or ask the user for clarification.";
                        }
                    }

                    const userContent: Content = {
                        role: 'user',
                        parts: toolResponseParts
                    };
                    apiHistory.push(userContent);
                    currentResponseMsg.apiSequence = [...(currentResponseMsg.apiSequence || []), userContent];

                    onThreadUpdate({ memory: this.thread.memory, taskState: this.thread.taskState });
                    
                    if (shouldInterrupt) {
                        currentResponseMsg.status = 'completed'; // Or 'interrupted', but completed means we just wait for the user to answer natively.
                        currentResponseMsg.endTime = Date.now();
                        onUpdate({ ...currentResponseMsg });
                        break; // exit while loop
                    }
                    
                    continue;
                }

                // If there are no tool calls, the model naturally finished its turn.
                // Check if it hit the token limit
                const finishReason = candidate?.finishReason;
                if (finishReason === 'MAX_TOKENS') {
                    currentResponseMsg.status = 'interrupted';
                } else if (loopCount >= MAX_LOOPS - 1) {
                    currentResponseMsg.status = 'interrupted';
                } else {
                    currentResponseMsg.status = 'completed';
                }
                
                currentResponseMsg.endTime = Date.now();
                currentResponseMsg.runningTime = (currentResponseMsg.runningTime || 0) + (Date.now() - startTime);
                onUpdate({ ...currentResponseMsg });
                break;

            } catch (error: any) {
                if (error.name === 'AbortError') {
                    currentResponseMsg.runningTime = (currentResponseMsg.runningTime || 0) + (Date.now() - startTime);
                    onUpdate({ 
                        ...currentResponseMsg, 
                        status: 'aborted', 
                        errorMessage: '已停止生成。',
                        endTime: Date.now()
                    });
                    break;
                }

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

    private pruneApiHistory(apiHistory: Content[]) {
        const historyStr = JSON.stringify(apiHistory);
        // Only trigger compress when tokens are incredibly huge and it destroys context windows / explodes costs
        // e.g. 500,000 chars roughly 120k tokens.
        if (historyStr.length < 500000) return;
        
        if (apiHistory.length <= 12) return;
        
        for (let i = 1; i < apiHistory.length - 10; i++) {
            const content = apiHistory[i];
            if (content.role === 'user') {
                for (const part of content.parts) {
                    if (part.functionResponse && part.functionResponse.response) {
                        const jsonStr = JSON.stringify(part.functionResponse.response);
                        if (jsonStr.length > 2000) {
                            part.functionResponse.response = {
                                _truncated: `Data omitted to save tokens.`,
                                _preview: jsonStr.substring(0, 2000) + '...'
                            };
                        }
                    }
                }
            }
        }
    }

    private checkInfiniteLoop(currentResponseMsg: CopilotMessage): boolean {
        if (!currentResponseMsg.toolCalls || currentResponseMsg.toolCalls.length < 5) return false;
        
        const calls = currentResponseMsg.toolCalls;
        const last1 = calls[calls.length - 1];
        const last2 = calls[calls.length - 2];
        const last3 = calls[calls.length - 3];
        
        if (last1.name === last2.name && last2.name === last3.name) {
            const str1 = JSON.stringify(last1.args);
            const str2 = JSON.stringify(last2.args);
            const str3 = JSON.stringify(last3.args);
            if (str1 === str2 && str2 === str3) {
                return true;
            }
        }
        return false;
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
        // Use all messages to maintain matching prefix for caching (sliding windows break the cache)
        const recentMessages = this.thread.messages;
        const history: Content[] = [];

        for (let i = 0; i < recentMessages.length; i++) {
            const msg = recentMessages[i];
            
            if (msg.role === 'user') {
                const parts: any[] = [];
                if (msg.text) parts.push({ text: msg.text });
                
                if (msg.attachments && msg.attachments.length > 0) {
                    const aiConfig = getAIConfig();
                    for (const att of msg.attachments) {
                        const actuallyUnsupported = !isMultimodalSupported(aiConfig.model, att.type || 'application/octet-stream');
                        
                        if (att.textContent) {
                            parts.push({ text: `[Attached file: ${att.name}]\n\`\`\`\n${att.textContent}\n\`\`\`` });
                        } else if (actuallyUnsupported || att.unsupported) {
                            parts.push({ text: `[Attached file: ${att.name}] (Note: As an AI model not supporting multimodal inputs or this file type, you cannot see the contents of this file. Do not pretend to know its contents unless you use a tool to read the file.)` });
                        } else if (att.base64 && att.type) {
                            parts.push({ inlineData: { mimeType: att.type, data: att.base64 } });
                        }
                    }
                }
                if (parts.length === 0) parts.push({ text: "" });
                history.push({ role: 'user', parts });
            } else if (msg.role === 'model') {
                if (msg.apiSequence && msg.apiSequence.length > 0) {
                    // Do NOT post-compress old tool results in the sequence.
                    // Modifying old content breaks exact prefix matching for Prompt Caching.
                    const sequence = JSON.parse(JSON.stringify(msg.apiSequence));
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
                                
                                const jsonStr = JSON.stringify(responseObj);
                                if (jsonStr.length > 15000) {
                                    responseObj = { 
                                        _truncated: "Data omitted to save tokens. Please query again if needed.",
                                        _preview: jsonStr.substring(0, 15000) + '...'
                                    };
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

        // Avoid infinite growth, drop massive chunks at once rather than sliding.
        if (history.length > 100) {
            history.splice(0, history.length - 80);
        }

        return history;
    }
}
