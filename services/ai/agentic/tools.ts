import { FunctionDeclaration, Type } from "@google/genai";

export const toolDeclarations: FunctionDeclaration[] = [
    {
        name: "finish",
        description: "当你完成了用户的请求，并且不需要再调用任何工具时，调用此工具以结束当前回合。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                message: { type: Type.STRING, description: "（可选）结束语或最终总结" }
            }
        }
    },
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
        description: "获取指定比赛的详细数据（不包含具体回合和选手数据，请使用专门的工具获取）。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                matchId: { type: Type.STRING, description: "比赛ID" }
            },
            required: ["matchId"]
        }
    },
    {
        name: "get_match_rounds",
        description: "获取指定比赛的每一轮详细数据（击杀、胜负、比分等）。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                matchId: { type: Type.STRING, description: "比赛ID" }
            },
            required: ["matchId"]
        }
    },
    {
        name: "get_match_players",
        description: "获取指定比赛中所有选手的详细统计数据（击杀、死亡、Rating等）。",
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
        name: "query_player_matches",
        description: "查询指定选手参与的所有比赛记录。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                playerId: { type: Type.STRING, description: "选手ID" },
                steamid: { type: Type.STRING, description: "SteamID" },
                limit: { type: Type.NUMBER, description: "返回的比赛数量限制 (默认 10)" }
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
    },
    {
        name: "aggregate_player_stats",
        description: "使用通用聚合器聚合所有或经过筛选的比赛中的选手数据，返回所有选手的聚合统计信息和角色定位。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                mapId: { type: Type.STRING, description: "按地图过滤" },
                result: { type: Type.STRING, description: "按比赛结果过滤 (WIN, LOSS, TIE)" },
                startDate: { type: Type.STRING, description: "起始日期 (YYYY-MM-DD)" },
                endDate: { type: Type.STRING, description: "结束日期 (YYYY-MM-DD)" }
            }
        }
    },
    {
        name: "run_data_analysis",
        description: "执行 JavaScript 代码进行高级数据分析、统计、查询与筛选。你可以访问全局变量 `db`，它包含 { matches, tactics, utilities, tournaments, bons }。代码必须返回一个值（例如通过 return 语句）。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                code: { type: Type.STRING, description: "要执行的 JavaScript 代码。例如: `return db.matches.filter(m => m.mapId === 'mirage').length;`" }
            },
            required: ["code"]
        }
    },
    {
        name: "update_database_item",
        description: "更新或创建数据库中的项目（战术、道具、比赛等）。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                collection: { type: Type.STRING, description: "集合名称 ('tactics', 'utilities', 'matches')" },
                item: { type: Type.OBJECT, description: "要更新或创建的完整项目对象。必须包含 id。" }
            },
            required: ["collection", "item"]
        }
    },
    {
        name: "delete_database_item",
        description: "删除数据库中的项目。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                collection: { type: Type.STRING, description: "集合名称 ('tactics', 'utilities', 'matches')" },
                id: { type: Type.STRING, description: "要删除的项目 ID" }
            },
            required: ["collection", "id"]
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
    isAdmin?: boolean,
    onSaveTactic?: (tactic: any) => Promise<void> | void,
    onSaveUtility?: (utility: any) => Promise<void> | void,
    onSaveMatch?: (match: any) => Promise<void> | void,
    onDeleteTactic?: (tactic: any) => Promise<void> | void,
    onDeleteUtility?: (utility: any) => Promise<void> | void,
    onDeleteMatch?: (match: any) => Promise<void> | void
}) => {
    const checkPermission = (action: string) => {
        if (!context.isAdmin) {
            throw new Error(`权限不足：无法执行 ${action} 操作。请联系管理员。`);
        }
    };

    return {
        finish: async ({ message }: { message: string }) => {
            return { status: "success", message: "对话已完成" };
        },
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
            // Return full match data but omit rawDemoJson, rounds, and players to prevent token explosion
            const { rawDemoJson, rounds, players, ...safeMatch } = match;
            return safeMatch;
        },
        get_match_rounds: async ({ matchId }: { matchId: string }) => {
            const match = context.allMatches.find(m => m.id === matchId);
            if (!match) return { error: "未找到该比赛数据" };
            return match.rounds || [];
        },
        get_match_players: async ({ matchId }: { matchId: string }) => {
            const match = context.allMatches.find(m => m.id === matchId);
            if (!match) return { error: "未找到该比赛数据" };
            return match.players || [];
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
        query_player_matches: async ({ playerId, steamid, limit = 10 }: { playerId?: string, steamid?: string, limit?: number }) => {
            const matches = context.allMatches;
            const playerMatches: any[] = [];
            
            matches.forEach(m => {
                const p = m.players.find((ps: any) => ps.playerId === playerId || ps.steamid === steamid);
                if (p) {
                    playerMatches.push({
                        matchId: m.id,
                        date: m.date,
                        mapId: m.mapId,
                        result: m.result,
                        score: m.score,
                        kills: p.kills,
                        deaths: p.deaths,
                        rating: p.rating
                    });
                }
            });
            
            // Sort by date descending
            playerMatches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            return playerMatches.slice(0, limit);
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
        aggregate_player_stats: async ({ mapId, result, startDate, endDate }: { mapId?: string, result?: string, startDate?: string, endDate?: string }) => {
            let filtered = context.allMatches;
            if (mapId) filtered = filtered.filter(m => m.mapId === mapId);
            if (result) filtered = filtered.filter(m => m.result === result);
            if (startDate) filtered = filtered.filter(m => m.date >= startDate);
            if (endDate) filtered = filtered.filter(m => m.date <= endDate);
            
            const { MatchAggregator } = await import('../../../utils/analytics/matchAggregator');
            const aggregated = MatchAggregator.aggregate(filtered);
            return {
                matchCount: filtered.length,
                players: aggregated
            };
        },
        query_tournaments: async () => {
            return context.allTournaments || [];
        },
        query_series: async () => {
            return context.allBons || [];
        },
        run_data_analysis: async ({ code }: { code: string }) => {
            try {
                // Create a safe-ish environment with access to db
                const db = {
                    matches: context.allMatches || [],
                    tactics: context.allTactics || [],
                    utilities: context.allUtilities || [],
                    tournaments: context.allTournaments || [],
                    bons: context.allBons || []
                };
                // We use new Function to execute the code. 
                // Wrap in an async IIFE to support await inside the code if needed.
                const fn = new Function('db', `return (async () => { ${code} })();`);
                const result = await fn(db);
                return { result };
            } catch (e: any) {
                return { error: `执行代码时出错: ${e.message}\n请检查代码语法或逻辑。` };
            }
        },
        update_database_item: async ({ collection, item }: { collection: string, item: any }) => {
            checkPermission("修改数据库");
            if (!item || !item.id) return { error: "项目必须包含 id" };
            
            try {
                if (collection === 'tactics' && context.onSaveTactic) {
                    await context.onSaveTactic(item);
                    return { status: "success", message: `已更新战术: ${item.id}` };
                } else if (collection === 'utilities' && context.onSaveUtility) {
                    await context.onSaveUtility(item);
                    return { status: "success", message: `已更新道具: ${item.id}` };
                } else if (collection === 'matches' && context.onSaveMatch) {
                    await context.onSaveMatch(item);
                    return { status: "success", message: `已更新比赛: ${item.id}` };
                }
                return { error: `不支持的集合或未提供保存回调: ${collection}` };
            } catch (e: any) {
                return { error: `保存失败: ${e.message}` };
            }
        },
        delete_database_item: async ({ collection, id }: { collection: string, id: string }) => {
            checkPermission("删除数据库项目");
            
            try {
                if (collection === 'tactics' && context.onDeleteTactic) {
                    const item = context.allTactics.find(t => t.id === id);
                    if (!item) return { error: "未找到该项目" };
                    await context.onDeleteTactic(item);
                    return { status: "success", message: `已删除战术: ${id}` };
                } else if (collection === 'utilities' && context.onDeleteUtility) {
                    const item = context.allUtilities.find(u => u.id === id);
                    if (!item) return { error: "未找到该项目" };
                    await context.onDeleteUtility(item);
                    return { status: "success", message: `已删除道具: ${id}` };
                } else if (collection === 'matches' && context.onDeleteMatch) {
                    const item = context.allMatches.find(m => m.id === id);
                    if (!item) return { error: "未找到该项目" };
                    await context.onDeleteMatch(item);
                    return { status: "success", message: `已删除比赛: ${id}` };
                }
                return { error: `不支持的集合或未提供删除回调: ${collection}` };
            } catch (e: any) {
                return { error: `删除失败: ${e.message}` };
            }
        }
    };
};
