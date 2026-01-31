
import { Tactic } from '../../types';
import { generateId } from '../../utils/idGenerator';
import { TAGS } from '../../constants/tags';

export const mirageTactics: Tactic[] = [
  {
    id: "t_mirage_pistol_mid_split",
    mapId: "mirage",
    title: "中路双烟夹B",
    side: "T",
    site: "Mid",
    tags: [TAGS.PISTOL, TAGS.MAP_CONTROL, TAGS.STANDARD],
    metadata: {
      author: "addd",
      lastUpdated: "2026-1-31",
      difficulty: "Hard"
    },
    loadout: [
      { role: "突破手", equipment: "半甲 (自由人发P250)" },
      { role: "补枪辅助", equipment: "半甲" },
      { role: "道具辅助", equipment: "烟雾弹, 闪光弹, 闪光弹, C4" },
      { role: "狙击手", equipment: "半甲 (扮演步枪手)" },
      { role: "自由人", equipment: "烟雾弹, P250, 闪光弹" },
    ],
    map_visual: "", 
    actions: [
      { id: generateId('setup'), time: "Freeze", who: "自由人", content: "开局发P250给突破手，自己留道具。" },
      { id: generateId('a'), time: "1:50", who: "道具辅助", content: "在出生点/下水道口附近投掷拱门慢烟。", type: 'utility', utilityId: 'util_mir_mid_arch' },
      { id: generateId('b'), time: "1:50", who: "自由人", content: "投掷VIP慢烟，封锁VIP视野。", type: 'utility', utilityId: 'util_mir_mid_window' },
      { id: generateId('c'), time: "1:45", who: "全员", content: "除自由人和狙击手外，3人静步进入B二楼。", type: 'movement' },
      { id: generateId('d'), time: "1:40", who: "狙击手", content: "烟雾爆开后，与自由人控制中路，注意下水道前压。", type: 'hold' },
      { id: generateId('e'), time: "1:35", who: "自由人", content: "给B小自助闪光，尝试与狙击手控制B小。", type: 'utility', utilityId: 'util_mir_b_short_pop' },
      { id: generateId('f'), time: "1:35", who: "道具辅助", content: "看到中路动作后，给B二楼闪光弹，掩护队友出二楼。", type: 'utility', utilityId: 'util_mir_b_apps_flash' },
      { id: generateId('g'), time: "1:30", who: "突破手", content: "闪白后横拉B二楼，注意躲避B小拱门混烟。", type: 'frag' },
      { id: generateId('h'), time: "Post", who: "全员", content: "占领包点，下任意包（推荐安全包或B小包）。", type: 'movement' },
    ]
  },
  {
    id: "t_mirage_pistol_mid_split_vip",
    mapId: "mirage",
    title: "中路双烟夹B - VIP变体",
    side: "T",
    site: "Mid",
    tags: [TAGS.PISTOL, TAGS.MAP_CONTROL, TAGS.GAMBLE],
    metadata: {
      author: "addd",
      lastUpdated: "2026-1-31",
      difficulty: "Hard"
    },
    loadout: [
      { role: "突破手", equipment: "半甲 (狙击手发P250)" },
      { role: "补枪辅助", equipment: "半甲" },
      { role: "道具辅助", equipment: "烟雾弹, 闪光弹, 闪光弹, C4" },
      { role: "狙击手", equipment: "烟雾弹, P250, 闪光弹" },
      { role: "自由人", equipment: "半甲" },
    ],
    map_visual: "", 
    actions: [
      { id: generateId('setup'), time: "Freeze", who: "狙击手", content: "开局发P250给突破手，自己留道具。" },
      { id: generateId('a'), time: "1:50", who: "道具辅助", content: "在出生点/下水道口附近投掷拱门慢烟。", type: 'utility', utilityId: 'util_mir_mid_arch' },
      { id: generateId('b'), time: "1:50", who: "狙击手", content: "投掷VIP慢烟，掩护中路推进。", type: 'utility', utilityId: 'util_mir_mid_window' },
      { id: generateId('c'), time: "1:45", who: "全员", content: "补枪/道具/突破手3人B二楼静音架枪，保持不动，等待中路信号。", type: 'hold' },
      { id: generateId('d'), time: "1:40", who: "狙击手", content: "架枪掩护自由人，或协助自由人双架上VIP。", type: 'movement' },
      { id: generateId('e'), time: "1:35", who: "自由人", content: "进入VIP（窗口），利用半甲优势偷人。", type: 'frag' },
      { id: generateId('f'), time: "1:30", who: "自由人", content: "取得击杀或控制后，经超市/厨房夹击B区。", type: 'movement' },
      { id: generateId('g'), time: "1:30", who: "突破手", content: "收到中路信号后，同步爆弹/横拉B二楼。", type: 'frag' },
      { id: generateId('h'), time: "Post", who: "全员", content: "夹击占领B包点。", type: 'movement' },
    ]
  }
];
