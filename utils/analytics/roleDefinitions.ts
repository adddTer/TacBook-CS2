export interface RoleDefinition {
    id: string;
    name: string;
    description: string;
}

export const ROLES: RoleDefinition[] = [
    // --- Entry / Aggressive ---
    { id: 'entry_machine', name: '破点机器', description: '无情的突破机器，总是冲在最前面撕开防线，Entry数据极高。' },
    { id: 'opening_duelist', name: '首杀狂魔', description: '专注于寻找首杀机会，开局交火欲望极强，为队伍确立人数优势。' },
    { id: 'space_creator', name: '空间撕裂者', description: '不惜牺牲自己来为队友拉扯枪线，虽然KD可能不高，但极具战术价值。' },
    { id: 'aggressive_pusher', name: '激进前压', description: '防守方也喜欢主动出击，给予对手极大的压力，攻击性极强。' },
    { id: 'aim_entry', name: '死斗专家', description: '依靠强大的枪法进行硬性突破，正面拼抢能力极强。' },
    { id: 'first_contact', name: '侦察尖兵', description: '总是第一个与敌人接触获取信息，反应迅速。' },
    { id: 'entry_fragger', name: '突破杀手', description: '不仅能进点，还能在突破过程中造成大量击杀。' },
    { id: 'flash_entry', name: '闪光突破', description: '极其依赖闪光弹进行突破，配合道具进点的教科书。' },

    // --- Trader / Damage ---
    { id: 'trade_king', name: '补枪之王', description: '总是紧跟队友，在队友倒下后第一时间完成补枪，Trade数据极高。' },
    { id: 'damage_dealer', name: '重炮手', description: '拥有极高的ADR，是队伍最稳定的火力输出点，枪法狠辣。' },
    { id: 'multi_fragger', name: '收割机', description: '经常在单回合内完成多杀，刷屏能力极强。' },
    { id: 'bodyguard', name: '带刀护卫', description: '生存率高且补枪效率高，像保镖一样守护核心队友。' },
    { id: 'second_entry', name: '第二枪位', description: '紧随突破手之后，负责清理残局和巩固阵地，兼具突破与补枪能力。' },

    // --- Lurker / Survival ---
    { id: 'lurker', name: 'rop紫', description: '游离于大部队之外，擅长断后和偷袭侧身，生存率极高。' },
    { id: 'anchor', name: '定海神针', description: '防守端稳如泰山，进攻方负责断后，防止敌人绕后，主打一个稳字。' },
    { id: 'flanker', name: '背身战神', description: '总是能绕到敌人背后，给予致命一击，让敌人防不胜防。' },
    { id: 'clutch_minister', name: '残局大师', description: '拥有极强的大心脏，越是人少越能发挥，残局胜率极高。' },
    { id: 'guerrilla', name: '游击队员', description: '位置飘忽不定，跑动积极，利用身法和意识戏耍敌人。' },
    { id: 'silent_killer', name: '冷面杀手', description: '隐匿身形，开枪必杀，像幽灵一样存在于地图角落。' },
    { id: 'rat_king', name: '鼠王', description: '极致的生存主义者，为了保枪和偷人无所不用其极，让对手恨得牙痒痒。' },
    { id: 'late_round_hero', name: '残局收割者', description: '前半场隐身，最后30秒开始发力，专打残局。' },
    { id: 'map_control', name: '地图控制者', description: '通过单人行动控制地图关键区域，压缩对手活动空间。' },

    // --- Sniper ---
    { id: 'awp_god', name: '狙神', description: '手中的AWP是敌人的噩梦，拥有极高的狙击击杀占比和命中率。' },
    { id: 'opening_awp', name: '首杀狙', description: '擅长使用狙击枪在开局寻找机会，一击必杀，为队伍打开局面。' },
    { id: 'aggressive_awp', name: '冲锋狙', description: '打法激进，喜欢拿着狙击枪前压和破点，侵略性极强。' },
    { id: 'turret_awp', name: '架点狙', description: '防守端稳如泰山，只要架住点位就没人能通过，极其稳健。' },
    { id: 'hybrid_awp', name: '全能狙', description: '不仅狙击精准，步枪能力也毫不逊色，能适应各种经济局势。' },
    { id: 'mobile_awp', name: '游走狙', description: '位置灵活，经常像自由人一样在地图各处寻找机会，难以被针对。' },

    // --- Support / Utility ---
    { id: 'utility_master', name: '道具大师', description: '精通各种道具投掷，能用道具为队友创造巨大优势，道具分极高。' },
    { id: 'flash_assist', name: '闪光助攻王', description: '擅长投掷瞬爆闪，总是能喂到队友嘴边，助攻数据亮眼。' },
    { id: 'tactician', name: '战术大脑', description: '虽然数据不一定华丽，但通过道具和补枪盘活全队，KAST很高。' },
    { id: 'support_anchor', name: '防守基石', description: '在防守端默默付出，用道具拖延时间，是队伍的坚盾。' },
    { id: 'best_teammate', name: '最佳队友', description: '拥有极高的KAST，总是能为团队做出贡献，不毒瘤。' },

    // --- Flex / General ---
    { id: 'hexagon', name: '六边形战士', description: '所有数据都非常顶尖，完美的CS机器，无懈可击。' },
    { id: 'impact_player', name: '关键先生', description: '总是在关键时刻站出来，拥有极高的影响力评分 (Impact)。' },
    { id: 'system_player', name: '体系选手', description: '完美融入战术体系，虽然不耀眼但不可或缺，发挥稳定。' },
    { id: 'carry', name: '大腿', description: '队伍的绝对核心，Rating和各项数据领跑全队，带飞全场。' },
    { id: 'star_rifler', name: '明星步枪手', description: '拥有顶级的步枪控制能力和意识，是队伍的输出担当。' },
    { id: 'all_rounder', name: '全能战士', description: '各项能力均衡且优秀，没有明显的短板，能胜任任何位置。' },
    { id: 'consistent_rock', name: '稳如老狗', description: '发挥极其稳定，几乎没有拉胯的时候，下限极高。' },
];
