import { FunctionDeclaration, Type } from "@google/genai";

export const toolDeclarations: FunctionDeclaration[] = [
    {
        name: "get_team_stats",
        description: "Get the win rate and performance metrics for a specific team.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                teamName: {
                    type: Type.STRING,
                    description: "The name of the team",
                }
            },
            required: ["teamName"]
        }
    },
    {
        name: "list_tactics",
        description: "List all CS2 tactics available in the system.",
        parameters: {
            type: Type.OBJECT,
            properties: {}
        }
    }
];

export const createToolHandlers = (context: any) => {
    return {
        get_team_stats: async ({ teamName }: { teamName: string }) => {
            return {
                result: `Not implemented. The team ${teamName} stats currently unavailable.`
            };
        },
        list_tactics: async () => {
            if (context.allTactics) {
                return { result: context.allTactics.map((t: any) => t.title || t.name) };
            }
            return { result: "No tactics found." };
        }
    };
};
