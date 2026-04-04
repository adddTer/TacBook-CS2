import { FunctionDeclaration, Type } from "@google/genai";

export const toolDeclarations: FunctionDeclaration[] = [
    {
        name: "memory_save",
        description: "记录下有价值的推理结果或用户信息，以便后续对话使用。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                key: { type: Type.STRING, description: "记忆的键名" },
                value: { type: Type.STRING, description: "记忆的内容" }
            },
            required: ["key", "value"]
        }
    },
    {
        name: "memory_retrieve",
        description: "获取之前记录的记忆内容。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                key: { type: Type.STRING, description: "记忆的键名" }
            },
            required: ["key"]
        }
    },
    {
        name: "query_tactics",
        description: "查询当前的战术列表，可以按地图或阵营过滤。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                mapId: { type: Type.STRING, description: "地图ID (如 mirage, inferno, dust2, ancient, anubis, nuke, vertigo, overpass)" },
                side: { type: Type.STRING, description: "阵营 (T 或 CT)" }
            }
        }
    },
    {
        name: "query_utilities",
        description: "查询当前的道具投掷列表。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                mapId: { type: Type.STRING, description: "地图ID" },
                side: { type: Type.STRING, description: "阵营" },
                type: { type: Type.STRING, description: "道具类型 (smoke, flash, molotov, grenade)" }
            }
        }
    },
    {
        name: "query_matches",
        description: "查询比赛列表，获取比赛的基本信息（ID、地图、结果、比分、日期）。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                mapId: { type: Type.STRING, description: "按地图过滤" },
                result: { type: Type.STRING, description: "按结果过滤 (WIN, LOSS, TIE)" }
            }
        }
    },
    {
        name: "get_match_details",
        description: "获取指定比赛的详细数据，包括每一轮的详情、选手统计、经济情况等。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                matchId: { type: Type.STRING, description: "比赛ID" }
            },
            required: ["matchId"]
        }
    },
    {
        name: "query_player_stats",
        description: "查询选手的统计数据，可以按选手ID或SteamID查询。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                playerId: { type: Type.STRING, description: "选手ID" },
                steamid: { type: Type.STRING, description: "SteamID" }
            }
        }
    },
    {
        name: "query_tournaments",
        description: "查询赛事列表。"
    },
    {
        name: "query_series",
        description: "查询系列赛 (BO1/BO3/BO5) 列表。"
    },
    {
        name: "query_team_stats",
        description: "查询战队的整体统计数据。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                teamName: { type: Type.STRING, description: "战队名称 (默认为 'us')" }
            }
        }
    },
    {
        name: "query_economy_data",
        description: "查询指定比赛的经济数据，包括每轮的装备价值和剩余金钱。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                matchId: { type: Type.STRING, description: "比赛ID" }
            },
            required: ["matchId"]
        }
    }
];

// Tool Implementation Factory
export const createToolHandlers = (context: {
    allTactics: any[],
    allUtilities: any[],
    allMatches: any[],
    allTournaments?: any[],
    allBons?: any[],
    threadMemory: Record<string, any>,
    updateMemory: (key: string, value: any) => void,
    isAdmin?: boolean
}) => {
    const checkPermission = (action: string) => {
        if (!context.isAdmin) {
            throw new Error(`权限不足：无法执行 ${action} 操作。请联系管理员。`);
        }
    };

    return {
        memory_save: async ({ key, value }: { key: string, value: any }) => {
            checkPermission("保存记忆");
            context.updateMemory(key, value);
            return { status: "success", message: `已记录记忆: ${key}` };
        },
        memory_retrieve: async ({ key }: { key: string }) => {
            const value = context.threadMemory[key];
            return value ? { key, value } : { error: "未找到相关记忆" };
        },
        query_tactics: async ({ mapId, side }: { mapId?: string, side?: string }) => {
            let filtered = context.allTactics;
            if (mapId) filtered = filtered.filter(t => t.mapId === mapId);
            if (side) filtered = filtered.filter(t => t.side === side);
            return filtered.map(t => ({ id: t.id, title: t.title, mapId: t.mapId, side: t.side, tags: t.tags }));
        },
        query_utilities: async ({ mapId, side, type }: { mapId?: string, side?: string, type?: string }) => {
            let filtered = context.allUtilities;
            if (mapId) filtered = filtered.filter(u => u.mapId === mapId);
            if (side) filtered = filtered.filter(u => u.side === side);
            if (type) filtered = filtered.filter(u => u.type === type);
            return filtered.map(u => ({ id: u.id, title: u.title, mapId: u.mapId, side: u.side, type: u.type }));
        },
        query_matches: async ({ mapId, result }: { mapId?: string, result?: string }) => {
            let filtered = context.allMatches;
            if (mapId) filtered = filtered.filter(m => m.mapId === mapId);
            if (result) filtered = filtered.filter(m => m.result === result);
            return filtered.map(m => ({ id: m.id, mapId: m.mapId, result: m.result, score: m.score, date: m.date }));
        },
        get_match_details: async ({ matchId }: { matchId: string }) => {
            const match = context.allMatches.find(m => m.id === matchId);
            if (!match) return { error: "未找到该比赛数据" };
            // Return full match data but omit rawDemoJson to prevent token explosion
            const { rawDemoJson, ...safeMatch } = match;
            return safeMatch;
        },
        query_player_stats: async ({ playerId, steamid }: { playerId?: string, steamid?: string }) => {
            // Aggregate stats for a player across all matches
            const matches = context.allMatches;
            const playerStats: any[] = [];
            
            matches.forEach(m => {
                const p = m.players.find((ps: any) => ps.playerId === playerId || ps.steamid === steamid);
                if (p) playerStats.push({ matchId: m.id, date: m.date, mapId: m.mapId, ...p });
            });
            
            if (playerStats.length === 0) return { error: "未找到该选手的统计数据" };
            
            // Basic aggregation
            const totalKills = playerStats.reduce((sum, p) => sum + p.kills, 0);
            const totalDeaths = playerStats.reduce((sum, p) => sum + p.deaths, 0);
            const avgRating = playerStats.reduce((sum, p) => sum + p.rating, 0) / playerStats.length;
            
            return {
                playerId,
                steamid,
                matchCount: playerStats.length,
                totalKills,
                totalDeaths,
                kdRatio: totalKills / (totalDeaths || 1),
                avgRating,
                recentMatches: playerStats.slice(-5)
            };
        },
        query_team_stats: async ({ teamName = 'us' }: { teamName?: string }) => {
            const matches = context.allMatches;
            const wins = matches.filter(m => m.result === 'WIN').length;
            const losses = matches.filter(m => m.result === 'LOSS').length;
            const ties = matches.filter(m => m.result === 'TIE').length;
            
            const mapStats: Record<string, { wins: number, losses: number }> = {};
            matches.forEach(m => {
                if (!mapStats[m.mapId]) mapStats[m.mapId] = { wins: 0, losses: 0 };
                if (m.result === 'WIN') mapStats[m.mapId].wins++;
                if (m.result === 'LOSS') mapStats[m.mapId].losses++;
            });
            
            return {
                teamName,
                totalMatches: matches.length,
                wins,
                losses,
                ties,
                winRate: (wins / (matches.length || 1)) * 100,
                mapStats
            };
        },
        query_economy_data: async ({ matchId }: { matchId: string }) => {
            const match = context.allMatches.find(m => m.id === matchId);
            if (!match) return { error: "未找到该比赛数据" };
            
            const rounds = match.rounds || [];
            return rounds.map((r: any) => ({
                round: r.roundNumber,
                winner: r.winnerSide,
                equip_us: r.equip_value_us,
                equip_them: r.equip_value_them
            }));
        },
        query_tournaments: async () => {
            return context.allTournaments || [];
        },
        query_series: async () => {
            return context.allBons || [];
        }
    };
};
