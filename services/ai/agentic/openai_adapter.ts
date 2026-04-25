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
                messages.push({
                    role: 'user',
                    content: msg.parts?.map(p => p.text || '').join('\n') || ''
                });
            }
        } else if (msg.role === 'model') {
            const toolCalls = msg.parts?.filter(p => p.functionCall);
            const textParts = msg.parts?.filter(p => p.text);
            
            let contentText = textParts?.map(p => p.text || '').join('\n') || '';
            // DeepSeek V4 specifically forbids sending reasoning content back in the history
            contentText = contentText.replace(/<think>[\s\S]*?<\/think>\s*/gi, '');

            const message: any = {
                role: 'assistant',
                content: contentText
            };

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
