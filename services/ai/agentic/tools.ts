import { FunctionDeclaration, Type } from "@google/genai";
import { getTeams } from "../../../utils/teamLoader";
import { calculateTeamRating, calculateTeamWinRateMatrix } from '../../../utils/analytics/teamStatsCalculator';
import { saveVersion } from "../../../utils/versionDb";

export const toolDeclarations: FunctionDeclaration[] = [
    {
        name: "update_task_state",
        description: "更新全局长任务状态机。在处理复杂长任务时，必须使用此工具来维护宏观进度。包含任务计划、当前步骤、已完成步骤和中间结果。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                plan: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "结构化的执行步骤列表" 
                },
                currentStepIndex: { 
                    type: Type.INTEGER, 
                    description: "当前正在执行的步骤索引（从 0 开始）" 
                },
                completedSteps: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "已完成的步骤描述列表" 
                },
                intermediateResults: { 
                    type: Type.STRING, 
                    description: "阶段性结果的 JSON 字符串，用于在步骤间传递数据" 
                }
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
        name: "get_match_data",
        description: "按需获取指定比赛的详细数据。为了节省 Token 并且精准获取所需信息，请通过 includes 数组指定你要获取的模块（例如：['summary', 'players']）。如果没有指定，只会返回比赛摘要。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                matchId: { type: Type.STRING, description: "比赛ID" },
                includes: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "要包含的数据模块。可选值: 'summary' (包含对阵表、比分等), 'rounds' (每回合胜负结果), 'players' (赛后总成绩如K/D、rating), 'economy' (每回合经济与装备)。" 
                }
            },
            required: ["matchId"]
        }
    },
    {
        name: "query_player_stats",
        description: "查询选手的统计数据，可以按选手ID或SteamID查询。注意：返回的 wpa 是回合平均值（百分比形式），请直接展示该平均值，不要将其作为总和处理。",
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
        description: "查询指定战队的整体统计数据（包括：总胜率、平均Rating、以及XvY不同人数优势下的阵型回合胜率矩阵）。队伍判定依据：一局比赛的一方至少3人属于该队伍。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                teamName: { type: Type.STRING, description: "战队名称" }
            },
            required: ["teamName"]
        }
    },
    {
        name: "list_registered_teams",
        description: "查询当前数据库中已注册的队伍列表。"
    },
    {
        name: "query_team_members",
        description: "查询指定队伍的成员信息。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                teamName: { type: Type.STRING, description: "战队名称" }
            },
            required: ["teamName"]
        }
    },
    {
        name: "query_unassociated_matches",
        description: "查询不属于任何队伍的比赛。"
    },
    {
        name: "create_service_card",
        description: "生成一个服务卡片（Service Card），提供点击跳转功能。⚠️ 绝对警告：只有在需要强引导用户跳转到特定页面查看详情时才使用！不要滥用它来列举数据。如果只是列举比赛、战术或玩家数据，请直接使用 Markdown 文本或表格即可。仅在明确需要“提供一个快捷入口让用户点进去看”时才使用此卡片。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                type: { type: Type.STRING, description: "实体类型，可选值为: 'match', 'tactic', 'utility', 'player'" },
                id: { type: Type.STRING, description: "实体对象的唯一 ID" },
                label: { type: Type.STRING, description: "卡片上要显示的标题或文本内容" }
            },
            required: ["type", "id", "label"]
        }
    },
    {
        name: "aggregate_player_stats",
        description: "使用通用聚合器聚合所有或经过筛选的比赛中的选手数据，返回所有选手的聚合统计信息和角色定位。注意：返回的 wpa 是回合平均值（百分比形式），请直接展示该平均值，不要将其作为总和处理。",
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
        description: "代码解释器沙盒 (Code Interpreter Sandbox)。执行 JavaScript 代码进行高级数据分析、统计、查询与筛选。你可以访问全局变量 `db`，它包含 { matches, tactics, utilities, tournaments, bons }。你可以使用 `console.log()` 打印中间结果或调试信息，这些信息会作为终端输出返回给你。代码必须返回一个最终值。**警告：代码运行在主线程，严禁编写死循环 (如 while(true))，否则会导致浏览器崩溃。**",
        parameters: {
            type: Type.OBJECT,
            properties: {
                code: { type: Type.STRING, description: "要执行的 JavaScript 代码。例如: `console.log('Total matches:', db.matches.length); return db.matches.filter(m => m.mapId === 'mirage').length;`" }
            },
            required: ["code"]
        }
    },
    {
        name: "calculate",
        description: "执行数学表达式计算（支持加减乘除、括号等），用于复杂的统计计算或验证计算结果。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                expression: { type: Type.STRING, description: "要计算的数学表达式 (例: '(15+3)/2' 或 '0.65 * 100')" }
            },
            required: ["expression"]
        }
    },
    {
        name: "search_wikipedia",
        description: "搜索维基百科以获取关于电竞、队伍、游戏机制百科等公开资料作为分析辅助。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: { type: Type.STRING, description: "搜索关键词（支持中英文）" }
            },
            required: ["query"]
        }
    },
    {
        name: "search_internet",
        description: "搜索外部互联网新闻、时事或通用知识。仅在本地数据库或维基百科查不到时使用此工具作为备用。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: { type: Type.STRING, description: "搜索关键词" }
            },
            required: ["query"]
        }
    },
    {
        name: "read_webpage",
        description: "读取指定网页的内容正文文本。（在 search_internet 返回有价值的 URL 后，可以使用此工具深入读取）",
        parameters: {
            type: Type.OBJECT,
            properties: {
                url: { type: Type.STRING, description: "要读取的完整 URL 地址" }
            },
            required: ["url"]
        }
    },
    {
        name: "ask_user",
        description: "主动中止当前执行循环，向人类用户提问或请求确认。只有在遇到重大歧义、极其危险的操作，或者必须让用户做选择（如给出 A/B 两套方案）才能继续时使用。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                question: { type: Type.STRING, description: "直接向用户提问的文本，将直接展示给用户。" }
            },
            required: ["question"]
        }
    },
    {
        name: "update_database_item",
        description: "更新战术或道具数据库。如果修改或创建战术/道具，必须遵循用户的语言（中文）。\n注意：创建战术('tactics')时，item必须是一个完整的Tactic对象。对象结构尽量包含: mapId, title, side ('T'|'CT'), site ('A'|'B'|'Mid'|'All'), tags (数组，包含{label, category}), loadout (数组，包含{role, equipment}), actions (数组，包含{id, who, content, time}), metadata (包含{author, lastUpdated})等字段。避免传入空对象。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                collection: { type: Type.STRING, description: "集合名称 ('tactics', 'utilities', 'matches')" },
                item: { type: Type.OBJECT, description: "要更新或创建的完整项目对象。必须至少包含 id。若是新建战术，务必填充完整的字段如 title, mapId, side, site, tags[], loadout[], actions[], metadata 等。" },
                edit_summary: { type: Type.STRING, description: "本次修改的内容摘要，必须用中文详细说明修改了哪些地方、起到了什么作用。例如：加入了A大爆烟、修改了B区突破站位。" }
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
    updateTaskState?: (state: any) => void,
    isAdmin?: boolean,
    onSaveTactic?: (tactic: any, description?: string, author?: string) => Promise<void> | void,
    onSaveUtility?: (utility: any, description?: string, author?: string) => Promise<void> | void,
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
        update_task_state: async (args: any) => {
            if (context.updateTaskState) {
                context.updateTaskState(args);
                return { status: "success", message: "全局任务状态已更新" };
            }
            return { error: "无法更新状态" };
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
        get_match_data: async ({ matchId, includes = ['summary'] }: { matchId: string, includes?: string[] }) => {
            const match = context.allMatches.find(m => m.id === matchId);
            if (!match) return { error: "未找到该比赛数据" };
            
            const result: any = {};
            
            if (includes.includes('summary') || includes.length === 0) {
                const { rawDemoJson, rounds, players, ...safeMatch } = match;
                result.summary = safeMatch;
            }
            
            if (includes.includes('rounds')) {
                result.rounds = match.rounds || [];
            }
            
            if (includes.includes('players')) {
                result.players = match.players.map((p: any) => {
                    const { r3_wpa_accum, r3_impact_accum, r3_econ_accum, r3_rounds_played, kastSum, headshots, ...cleanP } = p;
                    return cleanP;
                }) || [];
            }
            
            if (includes.includes('economy')) {
                const rounds = match.rounds || [];
                result.economy = rounds.map((r: any) => ({
                    round: r.roundNumber,
                    winner: r.winnerSide,
                    equip_us: r.equip_value_us,
                    equip_them: r.equip_value_them
                }));
            }
            
            return result;
        },
        query_player_stats: async ({ playerId, steamid }: { playerId?: string, steamid?: string }) => {
            // Aggregate stats for a player across all matches
            const matches = context.allMatches;
            const playerStats: any[] = [];
            
            matches.forEach(m => {
                const searchStr = playerId?.toLowerCase();
                const steamSearch = steamid?.toLowerCase();
                
                let p = m.players.find((ps: any) => 
                    (searchStr && ps.playerId?.toLowerCase().includes(searchStr)) || 
                    (steamSearch && ps.steamid?.toLowerCase().includes(steamSearch))
                );
                
                if (!p && m.enemyPlayers) {
                    p = m.enemyPlayers.find((ps: any) => 
                        (searchStr && ps.playerId?.toLowerCase().includes(searchStr)) || 
                        (steamSearch && ps.steamid?.toLowerCase().includes(steamSearch))
                    );
                }

                if (p) {
                    const { r3_wpa_accum, r3_impact_accum, r3_econ_accum, r3_rounds_played, kastSum, headshots, ...cleanP } = p as any;
                    playerStats.push({ matchId: m.id, date: m.date, mapId: m.mapId, ...cleanP });
                }
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
                const searchStr = playerId?.toLowerCase();
                const steamSearch = steamid?.toLowerCase();
                
                let p = m.players.find((ps: any) => 
                    (searchStr && ps.playerId?.toLowerCase().includes(searchStr)) || 
                    (steamSearch && ps.steamid?.toLowerCase().includes(steamSearch))
                );
                
                if (!p && m.enemyPlayers) {
                    p = m.enemyPlayers.find((ps: any) => 
                        (searchStr && ps.playerId?.toLowerCase().includes(searchStr)) || 
                        (steamSearch && ps.steamid?.toLowerCase().includes(steamSearch))
                    );
                }

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
        query_team_stats: async ({ teamName }: { teamName: string }) => {
            const teams = getTeams();
            const targetTeam = teams.find(t => t.name.toLowerCase() === teamName.toLowerCase() || t.id.toLowerCase() === teamName.toLowerCase());
            if (!targetTeam) return { error: `未找到战队: ${teamName}` };

            const teamPlayerIds = new Set(targetTeam.players.map(p => p.id));
            const teamPlayerSteamIds = new Set(targetTeam.players.flatMap(p => p.steamids || []));
            
            const matches = context.allMatches.filter(m => {
                let teamMembersInMatch = 0;
                const allPlayers = [...(m.players || []), ...(m.enemyPlayers || [])];
                
                // Track user names to avoid double counting if duplicate stats exist
                const countedPlayerKeys = new Set<string>();
                
                allPlayers.forEach((p: any) => {
                    const matchIdKey = p.playerId || p.name;
                    const matchSteamKey = p.steamid?.toString();
                    
                    if (countedPlayerKeys.has(matchIdKey)) return;

                    let isMatch = false;
                    // Exact name/id check
                    if (teamPlayerIds.has(matchIdKey)) {
                        isMatch = true;
                    } 
                    // SteamID check with robust parsing
                    else if (matchSteamKey) {
                        for (const teamSteamStr of teamPlayerSteamIds) {
                            if (teamSteamStr === matchSteamKey || 
                                teamSteamStr.includes(matchSteamKey) || 
                                matchSteamKey.includes(teamSteamStr)) {
                                isMatch = true;
                                break;
                            }
                            
                            // 64-bit conversion check (rough approximation)
                            if (/^\d+$/.test(matchSteamKey) && matchSteamKey.length < 16) {
                                const accountId = parseInt(matchSteamKey, 10);
                                const base = BigInt('76561197960265728');
                                const convertedId = (base + BigInt(accountId)).toString();
                                if (teamSteamStr === convertedId) {
                                    isMatch = true;
                                    break;
                                }
                            }
                        }
                    }

                    if (isMatch) {
                        teamMembersInMatch++;
                        countedPlayerKeys.add(matchIdKey);
                    }
                });
                
                return teamMembersInMatch >= 3;
            });

            // Correct match win logic for 'us' vs 'them' based on the team's side or players.
            // Since `m.result` is typically relative to the US team (user's team), we need to ensure the team was actually on the "us" side to count the result correctly. 
            // In typical match storage, if it's a known user team, m.players = US, m.enemyPlayers = THEM.
            // We'll count wins based on whether they were on the winning side.
            let wins = 0;
            let losses = 0;
            let ties = 0;
            
            matches.forEach(m => {
                // Determine if our target team is predominantly in `m.players`
                let teamInUssers = 0;
                m.players.forEach((p: any) => {
                    if (teamPlayerIds.has(p.playerId) || teamPlayerIds.has(p.name) || (p.steamid && teamPlayerSteamIds.has(p.steamid.toString()))) {
                        teamInUssers++;
                    }
                });

                const isTargetOnUsSide = teamInUssers >= 3 || (teamInUssers > 0 && teamInUssers >= (m.players.length / 2));

                if (m.result === 'TIE') {
                    ties++;
                } else if ((m.result === 'WIN' && isTargetOnUsSide) || (m.result === 'LOSS' && !isTargetOnUsSide)) {
                    wins++;
                } else if ((m.result === 'LOSS' && isTargetOnUsSide) || (m.result === 'WIN' && !isTargetOnUsSide)) {
                    losses++;
                }
            });
            
            const mapStats: Record<string, { wins: number, losses: number }> = {};
            matches.forEach(m => {
                if (!mapStats[m.mapId]) mapStats[m.mapId] = { wins: 0, losses: 0 };
                if (m.result === 'WIN') mapStats[m.mapId].wins++;
                if (m.result === 'LOSS') mapStats[m.mapId].losses++;
            });
            
            // Dynamic Team Calculation via existing utilities
            const teamRating = calculateTeamRating(targetTeam.players, matches);
            const winRateMatrixAll = calculateTeamWinRateMatrix(targetTeam.players, matches, 'ALL').matrix;
            const winRateMatrixT = calculateTeamWinRateMatrix(targetTeam.players, matches, 'T').matrix;
            const winRateMatrixCT = calculateTeamWinRateMatrix(targetTeam.players, matches, 'CT').matrix;
            
            return {
                teamName: targetTeam.name,
                totalMatches: matches.length,
                wins,
                losses,
                ties,
                winRate: matches.length > 0 ? (wins / matches.length) * 100 : 0,
                mapStats,
                teamRating,
                winRateMatrix: {
                    all: winRateMatrixAll,
                    t: winRateMatrixT,
                    ct: winRateMatrixCT
                }
            };
        },
        list_registered_teams: async () => {
            return getTeams().map(t => ({ id: t.id, name: t.name, type: t.type }));
        },
        query_team_members: async ({ teamName }: { teamName: string }) => {
            const teams = getTeams();
            const targetTeam = teams.find(t => t.name.toLowerCase() === teamName.toLowerCase() || t.id.toLowerCase() === teamName.toLowerCase());
            if (!targetTeam) return { error: `未找到战队: ${teamName}` };
            return targetTeam.players;
        },
        query_unassociated_matches: async () => {
            const teams = getTeams();
            const allRegisteredPlayerIds = new Set(teams.flatMap(t => t.players.map(p => p.id)));
            
            const matches = context.allMatches.filter(m => {
                let registeredPlayersInMatch = 0;
                m.players.forEach((p: any) => {
                    if (allRegisteredPlayerIds.has(p.playerId) || allRegisteredPlayerIds.has(p.name)) {
                        registeredPlayersInMatch++;
                    }
                });
                return registeredPlayersInMatch < 3;
            });
            
            return matches.map(m => ({
                id: m.id,
                date: m.date,
                mapId: m.mapId,
                score: m.score,
                players: m.players.map((p: any) => p.name)
            }));
        },
        create_service_card: async ({ type, id, label }: { type: string, id: string, label: string }) => {
            const validTypes = ['match', 'tactic', 'utility', 'player'];
            if (!validTypes.includes(type)) {
                return { error: "无效的实体类型。必须是 'match', 'tactic', 'utility', 或 'player'" };
            }

            // Verify existence based on type to avoid dead links
            let exists = false;
            if (type === 'match') exists = !!context.allMatches.find(m => m.id === id);
            if (type === 'tactic') exists = !!context.allTactics.find(t => t.id === id);
            if (type === 'utility') exists = !!context.allUtilities.find(u => u.id === id);
            if (type === 'player') {
                // Players are embedded in matches, let's just do a loose check or trust the AI
                exists = true; 
            }

            if (!exists) {
                return { error: `警告: 未找到该 ID (${id}) 对应的 ${type} 实体。` };
            }
            
            // Return a special markdown link that the UI will intercept and render as a service card
            return `[${label}](#${type}/${id})`;
        },
        aggregate_player_stats: async ({ mapId, result, startDate, endDate }: { mapId?: string, result?: string, startDate?: string, endDate?: string }) => {
            let filtered = context.allMatches;
            if (mapId) filtered = filtered.filter(m => m.mapId === mapId);
            if (result) filtered = filtered.filter(m => m.result === result);
            if (startDate) filtered = filtered.filter(m => m.date >= startDate);
            if (endDate) filtered = filtered.filter(m => m.date <= endDate);
            
            const { MatchAggregator } = await import('../../../utils/analytics/matchAggregator');
            const aggregated = MatchAggregator.aggregate(filtered);
            
            // Clean up internal accumulators to avoid confusing the AI
            const cleanedPlayers = aggregated.map(p => {
                const { r3_wpa_accum, r3_impact_accum, r3_econ_accum, r3_rounds_played, kastSum, headshots, ...cleanP } = p as any;
                return cleanP;
            });

            return {
                matchCount: filtered.length,
                players: cleanedPlayers
            };
        },
        calculate: async ({ expression }: { expression: string }) => {
            try {
                // Remove everything except numbers, math operators, and parentheses to prevent injection
                const sanitized = expression.replace(/[^0-9+\-*/(). ]/g, '');
                // eslint-disable-next-line no-new-func
                const result = new Function(`return (${sanitized})`)();
                return { expression: sanitized, result };
            } catch (e: any) {
                return { error: `计算失败: ${e.message}` };
            }
        },
        search_wikipedia: async ({ query }: { query: string }) => {
            try {
                const url = `https://zh.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.query && data.query.search) {
                    return { 
                        results: data.query.search.slice(0, 5).map((s: any) => ({
                            title: s.title,
                            snippet: s.snippet.replace(/<\/?[^>]+(>|$)/g, "")
                        }))
                    };
                }
                return { error: "未找到相关结果" };
            } catch (e: any) {
                return { error: `搜索失败: ${e.message}` };
            }
        },
        search_internet: async ({ query }: { query: string }) => {
            try {
                const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;
                const res = await fetch(proxyUrl);
                if (!res.ok) throw new Error('Proxy returned status ' + res.status);
                const data = await res.json();
                const html = data.contents;
                
                const results = [];
                const snippetRegex = /<a class="result__url"[^>]* href="([^"]+)">(.*?)<\/a>.*?<a class="result__snippet[^>]*>(.*?)<\/a>/gs;
                let match;
                let count = 0;
                while ((match = snippetRegex.exec(html)) !== null && count < 5) {
                    results.push({
                        url: match[1],
                        title: match[2].replace(/<\/?[^>]+(>|$)/g, ""),
                        snippet: match[3].replace(/<\/?[^>]+(>|$)/g, "")
                    });
                    count++;
                }
                if (results.length === 0) return { error: "未找到结果，请尝试简化的搜索词或其他工具。" };
                return { results };
            } catch (e: any) {
                return { error: `搜索失败: ${e.message}` };
            }
        },
        read_webpage: async ({ url }: { url: string }) => {
            try {
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                const res = await fetch(proxyUrl);
                if (!res.ok) throw new Error('Failed to fetch webpage');
                const html = await res.text();
                // Extremely simple regex strip for texts
                const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
                const bodyHtml = bodyMatch ? bodyMatch[1] : html;
                const text = bodyHtml
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '\n')
                    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '\n')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                return { text: text.substring(0, 8000) + (text.length > 8000 ? "...\n(TRUNCATED)" : "") };
            } catch (e: any) {
                return { error: `无法读取网页: ${e.message}` };
            }
        },
        ask_user: async ({ question }: { question: string }) => {
            // This tool's main purpose is to be detected by the engine and HALT execution.
            // When executing, we return a signal that execution should yield to user.
            return { _engine_interrupt: true, _question: question };
        },
        query_tournaments: async () => {
            return context.allTournaments || [];
        },
        query_series: async () => {
            return context.allBons || [];
        },
        run_data_analysis: async ({ code }: { code: string }) => {
            try {
                const db = {
                    matches: context.allMatches || [],
                    tactics: context.allTactics || [],
                    utilities: context.allUtilities || [],
                    tournaments: context.allTournaments || [],
                    bons: context.allBons || []
                };
                
                let logs: string[] = [];
                const mockConsole = {
                    log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
                    error: (...args: any[]) => logs.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
                    warn: (...args: any[]) => logs.push('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
                };

                const fn = new Function('db', 'console', `return (async () => { ${code} })();`);
                const result = await fn(db, mockConsole);
                
                return { 
                    result,
                    logs: logs.length > 0 ? logs.join('\n') : undefined
                };
            } catch (e: any) {
                return { error: `执行代码时出错: ${e.message}\n请检查代码语法或逻辑。` };
            }
        },
        update_database_item: async (args: { collection: string, item: any, edit_summary?: string }) => {
            const { collection, item, edit_summary } = args;
            checkPermission("修改数据库");
            if (!item || !item.id) return { error: "项目必须包含 id" };
            
            try {
                let snapshot = null;
                const authorStr = 'Copilot AI';
                const descStr = edit_summary || 'AI 自动生成/修改';

                if (collection === 'tactics') {
                    // Provide defaults to prevent UI crashes if AI generates incomplete objects
                    item.tags = item.tags || [];
                    item.loadout = item.loadout || [];
                    item.actions = item.actions || [];
                    item.metadata = item.metadata || {};
                    item.metadata.author = authorStr;
                    // Force using the current system time to prevent AI from fabricating times
                    item.metadata.lastUpdated = new Date().toISOString();
                    item.title = item.title || 'Untitled Tactic';
                    item.mapId = item.mapId || 'mirage';
                    item.side = item.side || 'T';
                    item.site = item.site || 'All';

                    snapshot = context.allTactics.find(t => t.id === item.id);
                    if (snapshot) saveVersion(snapshot, '系统自动', 'AI 修改前系统自动备份');
                    if (context.onSaveTactic) {
                        await context.onSaveTactic(item, descStr, authorStr);
                        return { status: "success", message: `已更新战术: ${item.id}`, snapshot, updated: item };
                    }
                } else if (collection === 'utilities') {
                    // Provide defaults for utilities
                    item.title = item.title || 'Untitled Utility';
                    item.mapId = item.mapId || 'mirage';
                    item.side = item.side || 'T';
                    item.site = item.site || 'All';
                    item.type = item.type || 'smoke';
                    item.content = item.content || '';
                    item.metadata = item.metadata || {};
                    item.metadata.author = authorStr;
                    item.metadata.lastUpdated = new Date().toISOString();

                    snapshot = context.allUtilities.find(u => u.id === item.id);
                    if (snapshot) saveVersion(snapshot, '系统自动', 'AI 修改前系统自动备份');
                    if (context.onSaveUtility) {
                        await context.onSaveUtility(item, descStr, authorStr);
                        return { status: "success", message: `已更新道具: ${item.id}`, snapshot, updated: item };
                    }
                } else if (collection === 'matches') {
                    snapshot = context.allMatches.find(m => m.id === item.id);
                    if (context.onSaveMatch) {
                        await context.onSaveMatch(item);
                        return { status: "success", message: `已更新比赛: ${item.id}`, snapshot, updated: item };
                    }
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
