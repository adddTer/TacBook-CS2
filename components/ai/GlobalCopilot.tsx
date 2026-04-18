import React from 'react';
import { CopilotUI } from './CopilotUI';
import { toolDeclarations, createToolHandlers } from '../../services/ai/agentic/tools';

interface GlobalCopilotProps {
    allTactics: any[];
    allUtilities: any[];
    allMatches: any[];
    allTournaments: any[];
    allBons: any[];
    onSaveTactic?: (tactic: any) => void;
    onSaveUtility?: (utility: any) => void;
    onSaveMatch?: (match: any) => void;
    onDeleteTactic?: (tactic: any) => void;
    onDeleteUtility?: (utility: any) => void;
    onDeleteMatch?: (match: any) => void;
}

export const GlobalCopilot: React.FC<GlobalCopilotProps> = (props) => {
    const systemInstructionBase = "你是一个专业的 CS2 战术助手。你可以通过调用工具来查询战术、道具、比赛数据或记录记忆。请尽量通过工具获取真实数据后再回答用户。数据来源是用户自行上传的demo。对于不包含注册玩家的比赛，不返回比赛结果。你的回答应该专业、简洁且富有洞察力。\n\n**重要引导：** 当你想引导用户查看特定的详细数据界面时，**必须**使用以下链接格式，系统会自动将它们渲染为精美的服务卡片：\n- 比赛数据卡片: `[显示名称，如：Mirage 13:10](#match/比赛ID)`\n- 玩家数据卡片: `[玩家名](#player/玩家ID)`\n- 战术详情卡片: `[战术名称](#tactic/战术ID)`\n- 道具详情卡片: `[道具名称](#utility/道具ID)`\n\n**计分板 (Scoreboard) 渲染：**\n当你需要专门展示一场比赛（或你自行假设/添加的比赛）的两队比分对阵时，你可以输出格式为 json 的代码块，并指定语言为 `scoreboard`，系统会将其渲染成了精美的 UI 计分板。**注意：计分板专门用于快速概览双方核心比分，不能滥用，更不能替代展示多名玩家详细数据的常规全数据表格。** \n例子：\n```scoreboard\n{\n  \"teamA\": \"Natus Vincere\",\n  \"teamB\": \"FaZe Clan\",\n  \"scoreA\": 13,\n  \"scoreB\": 10,\n  \"mapName\": \"Mirage\",\n  \"event\": \"IEM Cologne 2024\"\n}\n```\n\n**数据查询原则**：\n当你需要分析比赛数据时，默认先使用 `get_match_data` 获取“积分板”级别的基础简略数据（即 players 和 summary 基础信息），这就足够你回答大部分内容（如比分、地图、各选手 KD 数据）。只有当用户明确要求深度分析、查看每回合详情、或者确实需要提取更庞大细节时，才获取全量数据（加入 rounds, economy 等）。这样可以避免上下文长度爆炸导致理解失败或服务中断。\n\n**代码解释器沙盒 (Code Interpreter)**：对于需要海量数据分析或复杂计算的任务，请优先使用 `run_data_analysis` 工具编写 JavaScript 脚本执行，你可以通过 `console.log` 获取中间调试信息，并根据报错信息进行自省和重试。";

    const toolNameMap: Record<string, (args: any) => string> = {
        'memory_save': () => `记录了新的记忆`,
        'memory_retrieve': () => `检索了相关的记忆`,
        'query_tactics': () => `查询了战术列表`,
        'query_utilities': () => `查询了道具列表`,
        'query_matches': () => `查询了比赛记录`,
        'get_match_data': (args) => `获取了比赛详细数据 (${args?.matchId || '未知'})`,
        'query_player_stats': (args) => `查询了玩家统计数据 (${args?.playerId || args?.steamid || '未知'})`,
        'query_player_matches': (args) => `查询了玩家比赛记录 (${args?.playerId || args?.steamid || '未知'})`,
        'query_tournaments': () => `查询了赛事列表`,
        'query_series': () => `查询了系列赛信息`,
        'query_team_stats': (args) => `查询了队伍统计数据 (${args?.teamName || '未知'})`,
        'create_service_card': (args) => `生成了服务卡片 (${args?.type || '未知'})`,
        'aggregate_player_stats': () => `聚合了玩家统计数据`,
        'run_data_analysis': () => `执行了数据分析脚本`,
        'calculate': () => `执行了数学计算`,
        'search_wikipedia': (args) => `搜索了维基百科 (${args?.query || ''})`,
        'search_internet': (args) => `联网搜索了 (${args?.query || ''})`,
        'update_database_item': (args) => `更新了数据库项目 (${args?.collection || '未知'})`,
        'delete_database_item': (args) => `删除了数据库项目 (${args?.collection || '未知'})`,
        'update_task_state': () => `更新了长任务状态`
    };

    return (
        <CopilotUI
            toolDeclarations={toolDeclarations}
            createHandlers={createToolHandlers}
            systemInstructionBase={systemInstructionBase}
            context={props}
            title="TacBook Copilot"
            toolNameMap={toolNameMap}
            emptyStateTitle="我是你的战术助手"
            emptyStateDescription="你可以问我关于战术、道具投掷、比赛复盘的任何问题。我会通过 Agentic Workflow 为你提供最专业的建议。"
        />
    );
};
