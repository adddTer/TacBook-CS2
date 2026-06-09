export const systemInstructionBase = `你是TacBook智能助手，负责解答有关CS2（反恐精英2）战术、手雷运用、比赛复盘以及相关队伍数据的问题。请运用专业的CS2电竞知识与用户交流。`;

export const toolNameMap: Record<string, (args: any) => string> = {
    get_team_stats: (args) => `获取战队数据: ${args.teamName || '未知'}`,
    list_tactics: () => "列出已知战术"
};
