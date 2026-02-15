
export type AbilityType = 'firepower' | 'entry' | 'trade' | 'opening' | 'clutch' | 'sniper' | 'utility';

export const ABILITY_INFO: Record<AbilityType, { 
    title: string, 
    desc: string, 
    metrics: { label: string, key: string, format?: string }[],
    evaluations: { outstanding: string, excellent: string, ordinary: string, poor: string }
}> = {
    firepower: {
        title: "火力",
        desc: "衡量造成击杀和伤害的原始能力。这是明星选手的核心指标，不考虑生存率，只看能否摧毁对手的防线。",
        metrics: [
            { label: "Rating", key: "rating", format: "0.00" },
            { label: "ADR (均伤)", key: "dpr", format: "0.0" },
            { label: "KPR (均杀)", key: "kpr", format: "0.00" },
            { label: "胜局 KPR", key: "kprWin", format: "0.00" },
            { label: "多杀回合%", key: "multiKillRounds", format: "0%" },
            { label: "有击杀回合%", key: "roundsWithKills", format: "0%" },
        ],
        evaluations: {
            outstanding: "统治级火力。只要出现在准星里，对手就已经是尸体了。",
            excellent: "强力输出核心。能持续提供大量击杀，是队伍取胜的基石。",
            ordinary: "合格的火力输出。能完成基本的对枪任务，发挥较为稳定。",
            poor: "正面火力不足。在对枪环节经常处于劣势，难以造成有效杀伤。"
        }
    },
    entry: {
        title: "破点",
        desc: "衡量为队友创造机会的能力。包括拉扯空间、被补枪（牺牲自己换取信息）以及辅助队友击杀。",
        metrics: [
            { label: "被补枪死亡%", key: "tradedDeathsPct", format: "0.0%" },
            { label: "首死被补%", key: "openingDeathsTradedPct", format: "0.0%" },
            { label: "均被补死", key: "tradedDeathsPerRound", format: "0.00" },
            { label: "均被救", key: "savedByTeammatePerRound", format: "0.00" },
            { label: "辅助回合", key: "supportRounds", format: "0" },
            { label: "APR (助攻)", key: "assistsPerRound", format: "0.00" },
        ],
        evaluations: {
            outstanding: "完美的空间创造者。即便阵亡也能换取巨额战术价值，辅助效率极高。",
            excellent: "优秀的破点手/辅助。敢于承担高危任务，能有效拉扯防线。",
            ordinary: "尽职的团队成员。愿意配合战术执行，能完成基本的拉枪线任务。",
            poor: "辅助效率较低。阵亡往往未能换取有效信息或补枪机会。"
        }
    },
    trade: {
        title: "补枪",
        desc: "衡量人头置换能力。不仅是“收割残血”，更是紧跟队友节奏、确保人数均势的关键意识。",
        metrics: [
            { label: "KPR (补枪)", key: "tradeKillsPerRound", format: "0.00" },
            { label: "补枪占比", key: "tradeKillsPct", format: "0.0%" },
            { label: "均救援队友", key: "savedTeammatePerRound", format: "0.00" },
            { label: "助攻占比", key: "assistPct", format: "0.0%" },
            { label: "单杀均伤", key: "damagePerKill", format: "0.0" },
        ],
        evaluations: {
            outstanding: "收割机器。队友倒下的瞬间必定完成置换，绝不让对手全身而退。",
            excellent: "嗅觉敏锐的补枪手。能够紧跟突破位，高效地惩罚对手的击杀。",
            ordinary: "合格的二号位。能够完成基础的人头置换，但反应速度有时稍慢。",
            poor: "补枪意识薄弱。经常出现脱节，导致队伍陷入人数劣势。"
        }
    },
    opening: {
        title: "开局",
        desc: "衡量回合早期打开局面的能力。首杀成功率直接决定了该回合的胜率走向。",
        metrics: [
            { label: "OpKPR (首杀)", key: "openingKillsPerRound", format: "0.00" },
            { label: "首杀成功率", key: "openingSuccessPct", format: "0.0%" },
            { label: "首杀尝试%", key: "openingAttempts", format: "0" },
            { label: "首杀后胜率", key: "winPctAfterOpening", format: "0.0%" },
            { label: "OpDPR (首死)", key: "openingDeathsPerRound", format: "0.00" },
        ],
        evaluations: {
            outstanding: "开局破局者。极高的首杀成功率，往往在开局就为队伍奠定胜势。",
            excellent: "极具侵略性。经常能通过个人能力拿到人数优势。",
            ordinary: "常规的开局表现。偶尔尝试首杀，但也懂得控制风险。",
            poor: "开局容易白给。首杀尝试效率低，或因走位失误送出首死。"
        }
    },
    clutch: {
        title: "残局",
        desc: "衡量回合后期处理少打多局面的能力。包括冷静的心态、生存能力和1vN的胜率。",
        metrics: [
            { label: "残局得分/局", key: "clutchPointsPerRound", format: "0.00" },
            { label: "1v1 胜率", key: "win1v1Pct", format: "0.0%" },
            { label: "活到最后%", key: "lastAlivePct", format: "0.0%" },
            { label: "局均存活(s)", key: "timeAlivePerRound", format: "0.0s" },
            { label: "败局保枪", key: "savesPerLoss", format: "0.00" },
        ],
        evaluations: {
            outstanding: "残局大师。拥有顶级的残局思路和令人窒息的冷静，总能创造奇迹。",
            excellent: "值得信赖的终结者。在少打多的局面下依然极具威胁。",
            ordinary: "稳健的残局处理。能赢下该赢的局，偶尔能处理复杂局面。",
            poor: "残局心态易崩。在压力下容易出现判断失误或操作变形。"
        }
    },
    sniper: {
        title: "狙击",
        desc: "衡量使用 AWP 和 SSG-08 的效能。高分代表专职狙击手，低分通常为纯步枪手。",
        metrics: [
            { label: "狙杀占比", key: "sniperKillsPct", format: "0.0%" },
            { label: "狙杀 KPR", key: "sniperKillsPerRound", format: "0.00" },
            { label: "有狙杀回合%", key: "roundsWithSniperKillsPct", format: "0.0%" },
            { label: "狙击多杀回合", key: "sniperMultiKillRounds", format: "0" },
            { label: "狙击首杀", key: "sniperOpeningKillsPerRound", format: "0.00" },
        ],
        evaluations: {
            outstanding: "神级狙击手。这把 AWP 就是对手无法逾越的禁区，威慑力拉满。",
            excellent: "优秀的专职狙击手。空枪率低，能有效控制关键区域。",
            ordinary: "客串狙击手或副狙。偶尔起狙能起到战术作用，但非核心武器。",
            poor: "纯步枪手，或者不适合担任主狙位置。"
        }
    },
    utility: {
        title: "道具",
        desc: "衡量投掷物的使用效率。不仅仅是扔出去，而是能否造成伤害、致盲敌人或辅助击杀。",
        metrics: [
            { label: "局均道具伤", key: "utilDmgPerRound", format: "0.0" },
            { label: "道具击杀/100局", key: "utilKillsPer100", format: "0.00" },
            { label: "局均闪光数", key: "flashesPerRound", format: "0.00" },
            { label: "局均闪光助攻", key: "flashAssistsPerRound", format: "0.00" },
            { label: "局均致盲(s)", key: "blindTimePerRound", format: "0.00s" },
        ],
        evaluations: {
            outstanding: "道具管理大师。每一颗投掷物都是致命的，完美配合战术意图。",
            excellent: "道具专家。熟练运用各类道具，能有效辅助团队或造成杀伤。",
            ordinary: "常规道具水平。掌握基本定点雷，偶尔能形成配合。",
            poor: "道具使用匮乏。经常忘记买道具，或者投掷效果微乎其微。"
        }
    },
};
