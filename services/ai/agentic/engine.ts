import { GoogleGenAI, GenerateContentResponse, Type, Content, Part } from "@google/genai";
import { CopilotMessage, CopilotThread, ToolCall, ToolResult } from "./types";
import { toolDeclarations, createToolHandlers } from "./tools";

const MODEL_NAME = "gemini-3.1-pro-preview"; // Default to pro for complex tasks

export class AgenticEngine {
    private ai: GoogleGenAI;
    private thread: CopilotThread;
    private handlers: any;

    constructor(apiKey: string, thread: CopilotThread, context: any) {
        this.ai = new GoogleGenAI({ apiKey });
        this.thread = thread;
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
     * Main entry point for processing a user message.
     * Runs the tool-calling loop until a final response is generated.
     */
    async process(
        onUpdate: (message: Partial<CopilotMessage>) => void,
        onThreadUpdate: (thread: Partial<CopilotThread>) => void
    ) {
        let loopCount = 0;
        const MAX_LOOPS = 10; // Increased for complex multi-step tasks
        
        // Create a single response message that we will update throughout the loop for UI
        const responseMsgId = `msg_model_${Date.now()}`;
        let currentResponseMsg: CopilotMessage = {
            id: responseMsgId,
            role: 'model',
            text: '',
            toolCalls: [],
            toolResults: [],
            timestamp: Date.now(),
            status: 'pending'
        };

        // Initial update to show the thinking state
        onUpdate(currentResponseMsg);

        // We maintain a separate API history for the SDK to ensure correct role sequencing
        // Start with the existing thread history
        const apiHistory = this.prepareApiHistory();

        while (loopCount < MAX_LOOPS) {
            loopCount++;
            
            // Safety check: if no contents, something is wrong
            if (apiHistory.length === 0) {
                onUpdate({ ...currentResponseMsg, text: "错误：对话历史为空。", status: 'error' });
                break;
            }

            try {
                const response = await this.ai.models.generateContent({
                    model: MODEL_NAME,
                    contents: apiHistory,
                    config: {
                        systemInstruction: "你是一个专业的 CS2 战术助手。你可以通过调用工具来查询战术、道具、比赛数据或记录记忆。请尽量通过工具获取真实数据后再回答用户。如果需要多次调用工具才能完成任务，请分步进行。你的回答应该专业、简洁且富有洞察力。",
                        tools: [{ functionDeclarations: toolDeclarations }],
                    }
                });

                const candidate = response.candidates?.[0];
                const content = candidate?.content;
                if (!content) throw new Error("Model returned empty content");
                
                const parts = content.parts || [];

                // Add model's response to API history
                apiHistory.push(content);

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

                    // Update UI message
                    currentResponseMsg.toolCalls = [...(currentResponseMsg.toolCalls || []), ...newToolCalls];
                    onUpdate({ ...currentResponseMsg });

                    // Execute Tool Calls
                    const toolResponseParts: Part[] = [];
                    const newToolResults: ToolResult[] = [];

                    for (const call of newToolCalls) {
                        const handler = this.handlers[call.name];
                        if (handler) {
                            try {
                                const result = await handler(call.args);
                                newToolResults.push({ id: call.id, name: call.name, result });
                                toolResponseParts.push({
                                    functionResponse: { name: call.name, response: result, id: call.id }
                                });
                            } catch (e: any) {
                                newToolResults.push({ id: call.id, name: call.name, result: null, error: e.message });
                                toolResponseParts.push({
                                    functionResponse: { name: call.name, response: { error: e.message }, id: call.id }
                                });
                            }
                        } else {
                            const error = "Tool not found";
                            newToolResults.push({ id: call.id, name: call.name, result: null, error });
                            toolResponseParts.push({
                                functionResponse: { name: call.name, response: { error }, id: call.id }
                            });
                        }
                    }

                    // Update UI message with results
                    currentResponseMsg.toolResults = [...(currentResponseMsg.toolResults || []), ...newToolResults];
                    onUpdate({ ...currentResponseMsg });

                    // Add tool responses to API history with role 'tool'
                    apiHistory.push({
                        role: 'tool',
                        parts: toolResponseParts
                    });

                    // Update thread memory if changed
                    onThreadUpdate({ memory: this.thread.memory });

                    // Continue loop to let Gemini process the tool results
                    continue;
                }

                // If no tool calls, we are done
                currentResponseMsg.status = 'completed';
                onUpdate({ ...currentResponseMsg });
                break;

            } catch (error: any) {
                console.error("Agentic Engine Error:", error);
                onUpdate({ ...currentResponseMsg, text: `抱歉，处理指令时出现错误: ${error.message}`, status: 'error' });
                break;
            }
        }
    }

    /**
     * Converts CopilotMessage history into Gemini Content format for the initial call.
     */
    private prepareApiHistory(): Content[] {
        const recentMessages = this.thread.messages.slice(-10);
        const history: Content[] = [];

        for (const msg of recentMessages) {
            if (msg.role === 'user') {
                history.push({ role: 'user', parts: [{ text: msg.text || '' }] });
            } else if (msg.role === 'model') {
                // If it's a grouped model message, we need to decompose it for the API
                // 1. Tool Calls
                if (msg.toolCalls && msg.toolCalls.length > 0) {
                    history.push({
                        role: 'model',
                        parts: msg.toolCalls.map(tc => ({
                            functionCall: { name: tc.name, args: tc.args, id: tc.id }
                        }))
                    });

                    // 2. Tool Results
                    if (msg.toolResults && msg.toolResults.length > 0) {
                        history.push({
                            role: 'tool',
                            parts: msg.toolResults.map(tr => ({
                                functionResponse: { name: tr.name, response: tr.result || { error: tr.error }, id: tr.id }
                            }))
                        });
                    }
                }
                
                // 3. Text (Final answer or intermediate thought)
                if (msg.text) {
                    history.push({ role: 'model', parts: [{ text: msg.text }] });
                }
            }
        }
        return history;
    }
}
