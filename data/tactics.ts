
import { Tactic } from '../types';
import { importTacticFromZip } from '../utils/importHelper';

// --- Static Data Definitions ---

const mirageMid: Tactic[] = [
  {
    "id": "1000001",
    "mapId": "mirage",
    "title": "中路双烟夹B",
    "side": "T",
    "site": "Mid",
    "tags": [
      { "label": "手枪局", "category": "economy" },
      { "label": "控图", "category": "playstyle" },
      { "label": "标准", "category": "playstyle" }
    ],
    "metadata": {
      "author": "addd",
      "lastUpdated": "2026-1-31",
      "difficulty": "Hard"
    },
    "loadout": [
      { "role": "突破手", "equipment": "半甲 (自由人发P250)" },
      { "role": "补枪辅助", "equipment": "半甲" },
      { "role": "道具辅助", "equipment": "烟雾弹, 闪光弹, 闪光弹, C4" },
      { "role": "狙击手", "equipment": "半甲 (扮演步枪手)" },
      { "role": "自由人", "equipment": "烟雾弹, P250, 闪光弹" }
    ],
    "map_visual": "",
    "actions": [
      { "id": "freeze_setup", "time": "Freeze", "who": "自由人", "content": "开局发P250给突破手，自己留道具。" },
      { "id": "act_a", "time": "1:50", "who": "道具辅助", "content": "在出生点/下水道口附近投掷拱门慢烟。", "type": "utility", "utilityId": "2000001" },
      { "id": "act_b", "time": "1:50", "who": "自由人", "content": "投掷VIP慢烟，封锁VIP视野。", "type": "utility", "utilityId": "2000002" },
      { "id": "act_c", "time": "1:45", "who": "全员", "content": "除自由人和狙击手外，3人静步进入B二楼。", "type": "movement" },
      { "id": "act_d", "time": "1:40", "who": "狙击手", "content": "烟雾爆开后，与自由人控制中路，注意下水道前压。", "type": "hold" },
      { "id": "act_e", "time": "1:35", "who": "自由人", "content": "给B小自助闪光，尝试与狙击手控制B小。", "type": "utility", "utilityId": "2000003" },
      { "id": "act_f", "time": "1:35", "who": "道具辅助", "content": "看到中路动作后，给B二楼闪光弹，掩护队友出二楼。", "type": "utility", "utilityId": "2000004" },
      { "id": "act_g", "time": "1:30", "who": "突破手", "content": "闪白后横拉B二楼，注意躲避B小拱门混烟。", "type": "frag" },
      { "id": "act_h", "time": "Post", "who": "全员", "content": "占领包点，下任意包（推荐安全包或B小包）。", "type": "movement" }
    ]
  },
  {
    "id": "1000002",
    "mapId": "mirage",
    "title": "中路双烟夹B - VIP变体",
    "side": "T",
    "site": "Mid",
    "tags": [
      { "label": "手枪局", "category": "economy" },
      { "label": "控图", "category": "playstyle" },
      { "label": "赌点", "category": "playstyle" }
    ],
    "metadata": {
      "author": "addd",
      "lastUpdated": "2026-1-31",
      "difficulty": "Hard"
    },
    "loadout": [
      { "role": "突破手", "equipment": "半甲 (狙击手发P250)" },
      { "role": "补枪辅助", "equipment": "半甲" },
      { "role": "道具辅助", "equipment": "烟雾弹, 闪光弹, 闪光弹, C4" },
      { "role": "狙击手", "equipment": "烟雾弹, P250, 闪光弹" },
      { "role": "自由人", "equipment": "半甲" }
    ],
    "map_visual": "",
    "actions": [
      { "id": "freeze_setup_2", "time": "Freeze", "who": "狙击手", "content": "开局发P250给突破手，自己留道具。" },
      { "id": "act_a2", "time": "1:50", "who": "道具辅助", "content": "在出生点/下水道口附近投掷拱门慢烟。", "type": "utility", "utilityId": "2000001" },
      { "id": "act_b2", "time": "1:50", "who": "狙击手", "content": "投掷VIP慢烟，掩护中路推进。", "type": "utility", "utilityId": "2000002" },
      { "id": "act_c2", "time": "1:45", "who": "全员", "content": "补枪/道具/突破手3人B二楼静音架枪，保持不动，等待中路信号。", "type": "hold" },
      { "id": "act_d2", "time": "1:40", "who": "狙击手", "content": "架枪掩护自由人，或协助自由人双架上VIP。", "type": "movement" },
      { "id": "act_e2", "time": "1:35", "who": "自由人", "content": "进入VIP，利用半甲优势偷人。", "type": "frag" },
      { "id": "act_f2", "time": "1:30", "who": "自由人", "content": "取得击杀或控制后，经超市/厨房夹击B区。", "type": "movement" },
      { "id": "act_g2", "time": "1:30", "who": "突破手", "content": "收到中路信号后，同步爆弹/横拉B二楼。", "type": "frag" },
      { "id": "act_h2", "time": "Post", "who": "全员", "content": "夹击占领B包点。", "type": "movement" }
    ]
  }
];

const mirageA: Tactic[] = [
  {
    "id": "1000003",
    "mapId": "mirage",
    "title": "手枪局A区爆弹",
    "side": "T",
    "site": "A",
    "tags": [
      { "label": "手枪局", "category": "economy" },
      { "label": "爆弹", "category": "utility" }
    ],
    "isRecommended": true,
    "metadata": {
      "author": "addd",
      "lastUpdated": "2026-1-31",
      "difficulty": "Medium"
    },
    "loadout": [
      { "role": "道具辅助", "equipment": "燃烧瓶, 烟雾弹" },
      { "role": "突破手", "equipment": "半甲" },
      { "role": "补枪辅助", "equipment": "半甲, C4" },
      { "role": "自由人", "equipment": "半甲" },
      { "role": "狙击手", "equipment": "半甲" }
    ],
    "map_visual": "",
    "actions": [
      { "id": "freeze", "time": "Freeze", "who": "全员", "content": "道具辅助起火烟，其余4人起半甲。3人（突破/补枪/自由人）去A二楼集合，静步防漏。" },
      { "id": "act1", "time": "1:50", "who": "道具辅助", "content": "后点（T出生点附近）就位，准备投掷物。", "type": "movement" },
      { "id": "act2", "time": "1:45", "who": "道具辅助", "content": "跳投A区过点烟（不漏身位），封锁CT视线。", "type": "utility", "utilityId": "2000005" },
      { "id": "act3", "time": "1:42", "who": "道具辅助", "content": "投掷跳台火，覆盖跳台及楼梯下，逼退CT。", "type": "utility", "utilityId": "2000006" },
      { "id": "act4", "time": "1:40", "who": "突破手", "content": "待道具生效后，与二楼队友同步拉出，清理A包点。", "type": "frag" },
      { "id": "act5", "time": "Post", "who": "补枪辅助", "content": "下包，位置选择警家能看到的（如短箱外侧），方便控制。", "type": "movement" },
      { "id": "act6", "time": "Post", "who": "全员", "content": "迅速控制警家区域。", "type": "movement" },
      { "id": "act7", "time": "Post", "who": "补枪辅助", "content": "下包后重点观察跳台方向，防止偷袭。", "type": "hold" },
      { "id": "act8", "time": "Post", "who": "全员", "content": "借助掩体防止与CT远距离对枪，利用人数优势交叉架枪。", "type": "hold" }
    ]
  }
];

const mirageCustom: Tactic[] = [
  {
    "id": "1181080",
    "mapId": "mirage",
    "side": "T",
    "site": "A",
    "title": "手枪局A区战术",
    "tags": [
      { "label": "手枪局", "category": "economy" },
      { "label": "标准", "category": "playstyle" }
    ],
    "metadata": {
      "author": "FuNct1on",
      "lastUpdated": "2026-01-31",
      "difficulty": "Medium"
    },
    "loadout": [
        { "role": "道具辅助", "equipment": "烟雾弹, 闪光弹, P250" },
        { "role": "狙击手", "equipment": "半甲" },
        { "role": "突破手", "equipment": "半甲" },
        { "role": "补枪辅助", "equipment": "半甲" },
        { "role": "自由人", "equipment": "半甲" }
    ],
    "map_visual": "",
    "actions": [
      {
        "id": "149851",
        "who": "道具辅助",
        "time": "Freeze",
        "content": "发P250给狙击手，自己买烟闪，其余人半甲。",
        "type": "movement"
      },
      {
        "id": "863745",
        "who": "道具辅助",
        "time": "1:40",
        "content": "爆警家烟、灯柱闪。",
        "type": "utility"
      },
      {
        "id": "962875",
        "who": "狙击手",
        "time": "1:40",
        "content": "A2启动，直架控制跳台Jungle。",
        "type": "movement"
      },
      {
        "id": "556548",
        "who": "突破手",
        "time": "1:40",
        "content": "A1跟闪出，优先抢进包点。",
        "type": "movement"
      }
    ]
  }
];

const anubisB: Tactic[] = [
  {
    "id": "1000005",
    "mapId": "anubis",
    "title": "长枪局中夹B",
    "side": "T",
    "site": "B",
    "tags": [
      { "label": "长枪局", "category": "economy" },
      { "label": "控图", "category": "playstyle" },
      { "label": "爆弹", "category": "utility" }
    ],
    "metadata": {
      "author": "addd",
      "lastUpdated": "2026-1-31",
      "difficulty": "Medium"
    },
    "loadout": [
      { "role": "突破手", "equipment": "步枪, C4, 烟闪 (去B外)" },
      { "role": "补枪辅助", "equipment": "步枪, 烟闪 (去B外)" },
      { "role": "道具辅助", "equipment": "燃烧瓶, 手雷, 烟雾 (去中路)" },
      { "role": "狙击手", "equipment": "大狙, 燃烧瓶 (去中路)" },
      { "role": "自由人", "equipment": "步枪, 闪光 (去中路)" }
    ],
    "map_visual": "",
    "actions": [
      { "id": "act1", "time": "Freeze", "who": "全员", "content": "2人（突破/补枪）去B外控图，3人（道具/狙击/自由人）去中路集合。" },
      { "id": "act2", "time": "1:45", "who": "道具辅助", "content": "在匪桥投掷狗洞火（或双雷套餐），防止CT前压。", "type": "utility", "utilityId": "2000001" },
      { "id": "act3", "time": "1:45", "who": "狙击手", "content": "同步投掷中路火，压制桥下区域，随后架枪掩护。", "type": "utility", "utilityId": "2000002" },
      { "id": "act4", "time": "1:40", "who": "自由人", "content": "沿着火焰边缘快速推进，控制中路水下。", "type": "movement" },
      { "id": "act5", "time": "1:35", "who": "自由人", "content": "推进时时刻留意A包点/A连接方向，防止偷袭。", "type": "hold" },
      { "id": "act6", "time": "1:30", "who": "突破手", "content": "听到中路交火或就位信号后，B外爆弹施压B门。", "type": "utility" },
      { "id": "act7", "time": "Exec", "who": "全员", "content": "中路组走连接/黑屋，B外组进B门，同步夹击B包点。", "type": "frag" },
      { "id": "act8", "time": "Post", "who": "补枪辅助", "content": "负责携带并安放C4，建议下在死点或安全位。", "type": "movement" }
    ]
  }
];

const ancientTactics: Tactic[] = [
    {
        "id": "532742",
        "mapId": "ancient",
        "side": "T",
        "site": "A",
        "tags": [
            {
                "label": "手枪局",
                "category": "economy"
            }
        ],
        "metadata": {
            "author": "FuNct1on",
            "lastUpdated": "2026-02-01",
            "difficulty": "Medium"
        },
        "actions": [
            {
                "id": "522374",
                "who": "道具辅助",
                "time": "freeze",
                "content": "道具手买烟闪\n补枪手买烟闪\n其余人半甲",
                "type": "movement"
            },
            {
                "id": "793404",
                "who": "道具辅助",
                "time": "1:45",
                "content": "爆a点警家烟\n补枪手爆甜甜圈烟",
                "type": "movement"
            },
            {
                "id": "265274",
                "who": "突破手",
                "time": "1:40",
                "content": "一闪清大箱\n一闪清包点\n架住遗迹\n下包",
                "type": "movement"
            }
        ],
        "map_visual": "",
        "title": "手枪局a区战术"
    },
    {
        "id": "710617",
        "mapId": "ancient",
        "side": "T",
        "site": "B",
        "tags": [
            {
                "label": "手枪局",
                "category": "economy"
            }
        ],
        "metadata": {
            "author": "FuNct1on",
            "lastUpdated": "2026-02-01",
            "difficulty": "Medium"
        },
        "actions": [
            {
                "id": "763630",
                "who": "道具辅助",
                "time": "freeze",
                "content": "买烟➕双闪\n其余人半甲",
                "type": "movement"
            },
            {
                "id": "441889",
                "who": "道具辅助",
                "time": "1:50",
                "content": "爆b点faze烟\n其余人b坡待命",
                "type": "movement"
            },
            {
                "id": "115011",
                "who": "道具辅助",
                "time": "1:45",
                "content": "两颗包点闪\n其余人先搜死点\n后抢二道\n下包",
                "type": "movement"
            }
        ],
        "map_visual": "",
        "title": "手枪局b区战术"
    }
];

// Combine all defined tactics
const LOCAL_TACTICS: Tactic[] = [
    ...mirageMid,
    ...mirageA,
    ...mirageCustom,
    ...anubisB,
    ...ancientTactics
];

export const loadAllTactics = async (): Promise<Tactic[]> => {
  const loadedTactics: Tactic[] = [...LOCAL_TACTICS];

  // Logic for loading extra TAC files if needed in future
  const tacUrls: string[] = []; 
  
  for (const url of tacUrls) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Fetch error: ${response.status}`);
        const blob = await response.blob();
        const tactic = await importTacticFromZip(blob);
        loadedTactics.push(tactic);
      } catch (err) {
        console.error(`Failed to load tac file from ${url}:`, err);
      }
  }

  return loadedTactics;
};
