import { FunctionDeclaration, Type, Content, Part } from "@google/genai";

export function convertGeminiToolsToOpenAI(declarations: FunctionDeclaration[]) {
    return declarations.map(decl => {
        const parameters: any = {
            type: "object",
            properties: {},
            required: decl.parameters?.required || []
        };

        if (decl.parameters?.properties) {
            for (const [key, prop] of Object.entries(decl.parameters.properties)) {
                parameters.properties[key] = {
                    type: prop.type === Type.STRING ? "string" : 
                          prop.type === Type.NUMBER ? "number" : 
                          prop.type === Type.BOOLEAN ? "boolean" : 
                          prop.type === Type.ARRAY ? "array" : "object",
                    description: prop.description
                };
            }
        }

        return {
            type: "function",
            function: {
                name: decl.name,
                description: decl.description,
                parameters: parameters
            }
        };
    });
}

export function convertGeminiHistoryToOpenAI(apiHistory: Content[]) {
    const messages: any[] = [];
    
    for (const msg of apiHistory) {
        if (msg.role === 'user') {
            // Check if it's a tool response
            const toolResponses = msg.parts?.filter(p => p.functionResponse);
            if (toolResponses && toolResponses.length > 0) {
                for (const tr of toolResponses) {
                    messages.push({
                        role: 'tool',
                        tool_call_id: tr.functionResponse?.id || tr.functionResponse?.name,
                        content: JSON.stringify(tr.functionResponse?.response)
                    });
                }
            } else {
                const content: any[] = [];
                for (const p of msg.parts || []) {
                    if (p.text) content.push({ type: "text", text: p.text });
                    if (p.inlineData) {
                        content.push({ 
                            type: "image_url", 
                            image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } 
                        });
                    }
                }
                messages.push({
                    role: 'user',
                    content: content.length === 1 && content[0].type === 'text' ? content[0].text : content
                });
            }
        } else if (msg.role === 'model') {
            const toolCalls = msg.parts?.filter(p => p.functionCall);
            const textParts = msg.parts?.filter(p => p.text);
            
            let contentText = textParts?.map(p => p.text || '').join('\n') || '';
            
            // Extract reasoning_content from our <think> wrapper so we can pass it natively
            let reasoningContent = undefined;
            const thinkMatch = contentText.match(/<think>([\s\S]*?)<\/think>\s*/i);
            if (thinkMatch) {
                reasoningContent = thinkMatch[1];
            }
            // Strip it from the main content for OpenAI compatibility (or DeepSeek which requires them separate)
            contentText = contentText.replace(/<think>[\s\S]*?<\/think>\s*/gi, '');

            const message: any = {
                role: 'assistant',
                content: contentText
            };

            if (reasoningContent) {
                message.reasoning_content = reasoningContent;
            }

            if (toolCalls && toolCalls.length > 0) {
                message.tool_calls = toolCalls.map(tc => ({
                    id: tc.functionCall?.id || tc.functionCall?.name || `call_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    type: 'function',
                    function: {
                        name: tc.functionCall?.name,
                        arguments: JSON.stringify(tc.functionCall?.args || {})
                    }
                }));
            }
            messages.push(message);
        }
    }
    
    return messages;
}
