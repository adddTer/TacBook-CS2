
export type AbilityType = 'firepower' | 'entry' | 'trade' | 'opening' | 'clutch' | 'sniper' | 'utility';

// 9-tier evaluation system (0-100 score mapping)
// Index 0: 0-19, 1: 20-29, ... 8: 90-100
export const ABILITY_INFO: Record<AbilityType, { 
    title: string, 
    desc: string, 
    metrics: { label: string, key: string, format?: string }[],
    evaluations: string[] 
}> = {
    firepower: {
        title: "火力",
        desc: "选手的火力输出指标，基于击杀、伤害和多杀得分。这项数据是为明星选手或是那些状态火热的选手准备的。在这里生存能力根本不重要，这里只属于枪男。",
        metrics: [
            { label: "Rating", key: "rating", format: "0.00" },
            { label: "ADR", key: "dpr", format: "0.0" },
            { label: "KPR", key: "kpr", format: "0.00" },
            { label: "胜局 KPR", key: "kprWin", format: "0.00" },
            { label: "多杀率", key: "multiKillRounds", format: "0%" },
            { label: "击杀回合%", key: "roundsWithKills", format: "0%" },
        ],
        evaluations: [
            "在此领域几乎没有存在感，急需提升对枪能力。", // 0-19
            "火力严重不足，在正面对抗中几乎总是处于劣势。", // 20-29
            "输出疲软，难以在交火中为队伍提供足够的伤害支持。", // 30-39
            "火力略低于平均水平，主要依赖队友创造输出环境。", // 40-49
            "合格的火力输出手。能完成基本的对枪任务，发挥中规中矩。", // 50-59
            "可靠的火力点。不仅能完成击杀，还能经常打出多杀。", // 60-69
            "强力输出核心。能持续提供大量伤害，是队伍取胜的利器。", // 70-79
            "顶尖枪男。拥有极其恐怖的爆发力，经常凭借一己之力撕碎防线。", // 80-89
            "统治级火力。只要出现在准星里，对手就已经是尸体了，绝对的赛场主宰。"  // 90-100
        ]
    },
    entry: {
        title: "破点",
        desc: "选手为队友“牺牲”的概率。高得分是那些率先通过危险点位（通常第一位交火会送命）的选手，或者是那些在中期率先进入包点为队内明星选手创造空间的选手。评分基于有价值的（队友能补掉对手）每回合死亡数与占比，以及每回合被队友补枪“救下”的次数。",
        metrics: [
            { label: "被补枪率", key: "tradedDeathsPct", format: "0.0%" },
            { label: "首死被补%", key: "openingDeathsTradedPct", format: "0.0%" },
            { label: "局均被补", key: "tradedDeathsPerRound", format: "0.00" },
            { label: "被保全/R", key: "savedByTeammatePerRound", format: "0.00" },
            { label: "辅助回合", key: "supportRounds", format: "0" },
            { label: "APR", key: "assistsPerRound", format: "0.00" },
        ],
        evaluations: [
            "几乎不参与突破任务，或者突破效率极低。", 
            "极少承担高危位置的探索，往往躲在队友身后。",
            "突破意愿不强，阵亡往往是因为走位失误而非战术牺牲。",
            "偶尔尝试拉枪线，但与队友的补枪配合经常脱节。",
            "尽职的团队成员。愿意配合战术执行，能完成基本的拉扯任务。",
            "优秀的敢死队。敢于用身体去探知信息，并能有效换取空间。",
            "顶级突破手。在进攻端如同尖刀一般，总能撕开缺口。",
            "完美的空间创造者。即便阵亡也能换取巨额战术价值，辅助效率极高。",
            "教科书级的破点专家。用生命为队伍铺平胜利的道路，牺牲的艺术。"
        ]
    },
    trade: {
        title: "补枪",
        desc: "钓鱼型选手，但这不是一个贬义词。在职业CS中，能补掉对手是至关重要的能力。每回合补枪击杀和占比，以及补枪救下受伤队友的能力是这项评分的关键。",
        metrics: [
            { label: "补枪 KPR", key: "tradeKillsPerRound", format: "0.00" },
            { label: "补枪率", key: "tradeKillsPct", format: "0.0%" },
            { label: "救援队友", key: "savedTeammatePerRound", format: "0.00" },
            { label: "助攻率", key: "assistPct", format: "0.0%" },
            { label: "致死伤害", key: "damagePerKill", format: "0.0" },
        ],
        evaluations: [
            "补枪意识极差，经常卖掉队友且无法完成置换。",
            "反应迟钝，队友倒下后往往无法做出有效回应。",
            "偶尔能完成补枪，但经常出现脱节，导致人数劣势扩大。",
            "补枪效率一般，有时会因为犹豫而错失良机。",
            "合格的二号位。能够完成基础的人头置换，但上限不高。",
            "嗅觉敏锐。能够紧跟突破位，高效地惩罚对手的击杀。",
            "极其可靠的后盾。在队友倒下时总能第一时间站出来止损。",
            "收割机器。队友倒下的瞬间必定完成置换，绝不让对手全身而退。",
            "完美的补枪大师。将“钓鱼”变成了一种战术艺术，让对手不仅杀不死你，还要付出代价。"
        ]
    },
    opening: {
        title: "开局",
        desc: "选手在回合早期拿到首杀的概率。考虑到职业选手在5v4回合下平均胜率超过70%，证明侵略性打法是每支队伍必备的技能。每回合首杀次数和开局尝试次数是这项评分的关键。",
        metrics: [
            { label: "首杀 KPR", key: "openingKillsPerRound", format: "0.00" },
            { label: "首杀胜率", key: "openingSuccessPct", format: "0.0%" },
            { label: "尝试率", key: "openingAttempts", format: "0.0%" },
            { label: "首杀后胜率", key: "winPctAfterOpening", format: "0.0%" },
            { label: "首死 DPR", key: "openingDeathsPerRound", format: "0.00" },
        ],
        evaluations: [
            "开局隐形人，几乎从不参与首杀争夺。",
            "开局非常被动，极少尝试前压或通过对枪寻找机会。",
            "首杀尝试效率低，经常因为激进而白给。",
            "偶尔能拿到首杀，但状态起伏较大，不够稳定。",
            "常规的开局表现。懂得在合适的时机尝试首杀，也能控制风险。",
            "具有侵略性。经常能通过个人能力在开局阶段拿到人数优势。",
            "开局破局者。极高的首杀成功率，是队伍前期节奏的发动机。",
            "顶级掠食者。对手在开局阶段必须时刻提防你的位置。",
            "开局即胜势。只要你出手，这一回合的天平就已经倾斜，具有统治级的首杀能力。"
        ]
    },
    clutch: {
        title: "残局",
        desc: "存活到回合后期和1vN的残局专家，通常能在下包或回防时发挥优势。这项评分主要基于残局胜率，并以回合平均存活时间为附加指标，来识别回合后期的残局专家。",
        metrics: [
            { label: "残局得分", key: "clutchPointsPerRound", format: "0.00" },
            { label: "1v1 胜率", key: "win1v1Pct", format: "0.0%" },
            { label: "最后存活%", key: "lastAlivePct", format: "0.0%" },
            { label: "存活时间", key: "timeAlivePerRound", format: "0.0s" },
            { label: "败局保枪", key: "savesPerLoss", format: "0.00" },
        ],
        evaluations: [
            "残局心态极差，在压力下操作完全变形。",
            "不擅长处理残局，经常在少打多时做出错误决策。",
            "残局能力较弱，容易被对手的多人协同轻松瓦解。",
            "能在简单的残局中取胜，但面对复杂局面显得力不从心。",
            "稳健的残局处理。能赢下该赢的局，思路清晰。",
            "值得信赖的终结者。在少打多的局面下依然极具威胁。",
            "残局大师。拥有顶级的大局观和令人窒息的冷静。",
            "奇迹创造者。经常上演不可思议的1vN翻盘，对手的噩梦。",
            "残局之神。只要你还活着，回合就没有结束，拥有扭转乾坤的能力。"
        ]
    },
    sniper: {
        title: "狙击",
        desc: "主要针对狙击选手，根据AWP和SSG-08的击杀和多杀数得分，低分一般为步枪手，中等得分为狙击步枪全能选手，高分一般为队内主狙。",
        metrics: [
            { label: "狙杀占比", key: "sniperKillsPct", format: "0.0%" },
            { label: "狙击 KPR", key: "sniperKillsPerRound", format: "0.00" },
            { label: "狙杀回合%", key: "roundsWithSniperKillsPct", format: "0.0%" },
            { label: "狙击多杀", key: "sniperMultiKillRounds", format: "0" },
            { label: "狙击首杀", key: "sniperOpeningKillsPerRound", format: "0.00" },
        ],
        evaluations: [
            "纯步枪手，几乎不碰狙击枪。",
            "不擅长使用狙击枪，拿起AWP往往是负作用。",
            "偶尔捡起狙击枪保枪，但不具备主动架点的能力。",
            "可以客串副狙，但命中率和走位有待提高。",
            "合格的副狙。在战术需要时能拿起AWP起到一定的威慑作用。",
            "优秀的狙击手。空枪率低，能有效控制关键区域。",
            "顶级主狙。这把AWP是队伍的定海神针，防守端的铁闸。",
            "神级狙击手。你的狙击枪就是对手无法逾越的禁区，威慑力拉满。",
            "世界级AWP。反应、预瞄、身法均已臻化境，一杆枪足以改变比赛走向。"
        ]
    },
    utility: {
        title: "道具",
        desc: "队伍中的道具大师，CS中有很多方法可以为团队提供支援，有效的道具依然是其中关键一项。主要基于闪光弹的数据以及每回合手雷、燃烧弹伤害评分。",
        metrics: [
            { label: "道具伤害", key: "utilDmgPerRound", format: "0.0" },
            { label: "道具击杀", key: "utilKillsPer100", format: "0.00" },
            { label: "闪光投掷", key: "flashesPerRound", format: "0.00" },
            { label: "闪光助攻", key: "flashAssistsPerRound", format: "0.00" },
            { label: "致盲时间", key: "blindTimePerRound", format: "0.00s" },
        ],
        evaluations: [
            "从不购买或使用道具，完全依赖干拉。", // 0-19
            "道具使用极其匮乏，经常带着满道具阵亡。", // 20-29
            "道具投掷随意，且往往效果不佳。", // 30-39
            "掌握基本定点道具，能通过道具带来一定优势。", // 40-49 (Average)
            "优秀的辅助手。能熟练运用道具为团队创造优势。", // 50-59 (apEX level)
            "道具专家。精通各类瞬爆闪和单向烟，道具管理极佳。", // 60-69
            "战术大师。每一颗投掷物都是致命的，完美配合战术意图。", // 70-79
            "投掷物艺术家。将道具运用到了极致，仅凭道具就能瓦解对手的攻防体系。", // 80-89
            "理论极限。这种级别的道具效率在职业赛场上几乎不可能长期保持。" // 90-100
        ]
    }
};
