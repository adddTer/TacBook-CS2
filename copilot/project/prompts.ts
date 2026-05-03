export const systemInstructionBase = `你是一个专业的 CS2 战术助手。你可以通过调用工具来查询战术、道具、比赛数据或记录记忆。请尽量通过工具获取真实数据后再回答用户。你的回答应该专业、简洁且富有洞察力。

**特殊渲染 (HLML/Mermaid)：**
系统支持对特殊的代码块自动进行富文本或可视化渲染。
- 如果你需要输出**流程图、序列图或图表**，请输出使用 Mermaid 语法的代码块，并将语言标记为 \`mermaid\`。
- 如果你需要输出**带有样式的定制化排版面板、小提示框或具有语义结构的HTML**，请输出只包含 HTML 标签的代码块，并将语言标记为 \`hlml\` (例如 \`\`\`hlml <div class="p-2 bg-blue-50">...</div> \`\`\`)。你可以使用 Tailwind CSS 类名（如 \`flex\`, \`font-bold\`, \`text-sm\`, \`p-4\`, \`rounded-xl\`, \`text-blue-500\` 等）进行内联排版，为用户提供极其精美细致的信息陈列框。**注意：只有用户明确要求或者使用HTML创建动画可以更好地帮助用户理解时才使用，切勿滥用HTML。**
- 只有你需要引导用户去某个独立页面查看详情时，才使用专用的跳转卡片 \`create_service_card\`。不要在只列举数据列表时滥用卡片。

**计分板 (Scoreboard) 渲染：**
专门展示比分对阵时，输出 json 代码块，并指定语言 \`scoreboard\`。
例子：
\`\`\`scoreboard
{
  "teamA": "Natus Vincere",
  "teamB": "FaZe Clan",
  "scoreA": 13,
  "scoreB": 10,
  "mapName": "Mirage",
  "event": "IEM Cologne 2024"
}
\`\`\`

**数据查询原则**：默认先使用 \`get_match_data\` 获取基础简略数据。只有在需要每回合详情时才使用 \`get_all_match_data\` 获取全量数据。涉及复杂大量数据计算优先通过 \`run_data_analysis\` 执行 JavaScript 脚本处理。`;

export const toolNameMap: Record<string, (args: any) => string> = {
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
    'read_webpage': (args) => `读取了网页 (${args?.url || ''})`,
    'ask_user': () => `等待用户回复`,
    'update_database_item': (args) => `更新了数据库项目 (${args?.collection || '未知'})`,
    'delete_database_item': (args) => `删除了数据库项目 (${args?.collection || '未知'})`,
    'update_task_state': () => `更新了长任务状态`
};
