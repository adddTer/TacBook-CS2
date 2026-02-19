export interface RoleDefinition {
    id: string;
    category: string;
    name: string;
    description: string;
}

export const ROLES: RoleDefinition[] = [
    // --- 1. 突破手 (Entry) ---
    { id: 'entry_machine', category: '突破手', name: '破点机器', description: '无情的突破机器，总是冲在最前面撕开防线，Entry数据极高。' },
    { id: 'opening_duelist', category: '突破手', name: '首杀狂魔', description: '专注于寻找首杀机会，开局交火欲望极强，为队伍确立人数优势。' },
    { id: 'space_creator', category: '突破手', name: '空间撕裂者', description: '不惜牺牲自己来为队友拉扯枪线，虽然KD可能不高，但极具战术价值。' },
    { id: 'aggressive_pusher', category: '突破手', name: '激进前压', description: '防守方也喜欢主动出击，给予对手极大的压力，攻击性极强。' },
    { id: 'aim_entry', category: '突破手', name: '死斗专家', description: '依靠强大的枪法进行硬性突破，正面拼抢能力极强。' },
    { id: 'first_contact', category: '突破手', name: '侦察尖兵', description: '总是第一个与敌人接触获取信息，反应迅速。' },

    // --- 2. 补枪手 (Trader) ---
    { id: 'trade_king', category: '补枪手', name: '补枪之王', description: '总是紧跟队友，在队友倒下后第一时间完成补枪，Trade数据极高。' },
    { id: 'damage_dealer', category: '补枪手', name: '重炮手', description: '拥有极高的ADR，是队伍最稳定的火力输出点，枪法狠辣。' },
    { id: 'multi_fragger', category: '补枪手', name: '收割机', description: '经常在单回合内完成多杀，刷屏能力极强。' },
    { id: 'bodyguard', category: '补枪手', name: '带刀护卫', description: '生存率高且补枪效率高，像保镖一样守护核心队友。' },
    { id: 'second_entry', category: '补枪手', name: '第二枪位', description: '紧随突破手之后，负责清理残局和巩固阵地，兼具突破与补枪能力。' },
    { id: 'clean_up', category: '补枪手', name: '战场清道夫', description: '擅长收割残血敌人，确保队伍在交火后的优势。' },

    // --- 3. 自由人 (Lurker) ---
    { id: 'lurker', category: '自由人', name: '老六', description: '游离于大部队之外，擅长断后和偷袭侧身，生存率极高。' },
    { id: 'anchor', category: '自由人', name: '定海神针', description: '防守端稳如泰山，进攻方负责断后，防止敌人绕后，主打一个稳字。' },
    { id: 'flanker', category: '自由人', name: '背身战神', description: '总是能绕到敌人背后，给予致命一击，让敌人防不胜防。' },
    { id: 'clutch_minister', category: '自由人', name: '残局大师', description: '拥有极强的大心脏，越是人少越能发挥，残局胜率极高。' },
    { id: 'guerrilla', category: '自由人', name: '游击队员', description: '位置飘忽不定，跑动积极，利用身法和意识戏耍敌人。' },
    { id: 'silent_killer', category: '自由人', name: '冷面杀手', description: '隐匿身形，开枪必杀，像幽灵一样存在于地图角落。' },

    // --- 4. 狙击手 (Sniper) ---
    { id: 'awp_god', category: '狙击手', name: '狙神', description: '手中的AWP是敌人的噩梦，拥有极高的狙击击杀占比和命中率。' },
    { id: 'opening_awp', category: '狙击手', name: '首杀狙', description: '擅长使用狙击枪在开局寻找机会，一击必杀，为队伍打开局面。' },
    { id: 'aggressive_awp', category: '狙击手', name: '冲锋狙', description: '打法激进，喜欢拿着狙击枪前压和破点，侵略性极强。' },
    { id: 'turret_awp', category: '狙击手', name: '架点狙', description: '防守端稳如泰山，只要架住点位就没人能通过，极其稳健。' },
    { id: 'hybrid_awp', category: '狙击手', name: '全能狙', description: '不仅狙击精准，步枪能力也毫不逊色，能适应各种经济局势。' },
    { id: 'mobile_awp', category: '狙击手', name: '游走狙', description: '位置灵活，经常像自由人一样在地图各处寻找机会，难以被针对。' },

    // --- 5. 道具手 (Support) ---
    { id: 'utility_master', category: '道具手', name: '道具大师', description: '精通各种道具投掷，能用道具为队友创造巨大优势，道具分极高。' },
    { id: 'flash_assist', category: '道具手', name: '闪光助攻王', description: '擅长投掷瞬爆闪，总是能喂到队友嘴边，助攻数据亮眼。' },
    { id: 'tactician', category: '道具手', name: '战术大脑', description: '虽然数据不一定华丽，但通过道具和补枪盘活全队，KAST很高。' },
    { id: 'support_anchor', category: '道具手', name: '防守基石', description: '在防守端默默付出，用道具拖延时间，是队伍的坚盾。' },
    { id: 'best_teammate', category: '道具手', name: '最佳队友', description: '拥有极高的KAST，总是能为团队做出贡献，不毒瘤。' },
    { id: 'sacrifice', category: '道具手', name: '牺牲者', description: '为了团队胜利不惜牺牲自己的数据，干尽脏活累活。' },

    // --- 6. 全能王 (Flex) ---
    { id: 'hexagon', category: '全能王', name: '六边形战士', description: '所有数据都非常顶尖，完美的CS机器，无懈可击。' },
    { id: 'impact_player', category: '全能王', name: '关键先生', description: '总是在关键时刻站出来，拥有极高的影响力评分 (Impact)。' },
    { id: 'system_player', category: '全能王', name: '体系选手', description: '完美融入战术体系，虽然不耀眼但不可或缺，发挥稳定。' },
    { id: 'carry', category: '全能王', name: '大腿', description: '队伍的绝对核心，Rating和各项数据领跑全队，带飞全场。' },
    { id: 'star_rifler', category: '全能王', name: '明星步枪手', description: '拥有顶级的步枪控制能力和意识，是队伍的输出担当。' },
    { id: 'all_rounder', category: '全能王', name: '全能战士', description: '各项能力均衡且优秀，没有明显的短板，能胜任任何位置。' },
];
