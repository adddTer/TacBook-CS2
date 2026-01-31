
import { Tactic } from '../../types';
import { generateId } from '../../utils/idGenerator';
import { TAGS } from '../../constants/tags';

export const mirageATactics: Tactic[] = [
  {
    id: "100003",
    mapId: "mirage",
    title: "手枪局A区爆弹",
    side: "T",
    site: "A",
    tags: [TAGS.PISTOL, TAGS.EXEC],
    metadata: {
      author: "addd",
      lastUpdated: "2026-1-31",
      difficulty: "Medium"
    },
    loadout: [
      { role: "道具辅助", equipment: "燃烧瓶, 烟雾弹" },
      { role: "突破手", equipment: "半甲" },
      { role: "补枪辅助", equipment: "半甲, C4" },
      { role: "自由人", equipment: "半甲" },
      { role: "狙击手", equipment: "半甲" },
    ],
    map_visual: "", 
    actions: [
      { id: generateId(), time: "Freeze", who: "全员", content: "道具辅助起火烟，其余4人起半甲。3人（突破/补枪/自由人）去A二楼集合，静步防漏。" },
      { id: generateId(), time: "1:50", who: "道具辅助", content: "后点（T出生点附近）就位，准备投掷物。", type: 'movement' },
      { id: generateId(), time: "1:45", who: "道具辅助", content: "跳投A区过点烟（不漏身位），封锁CT视线。", type: 'utility', utilityId: '200005' },
      { id: generateId(), time: "1:42", who: "道具辅助", content: "投掷跳台火，覆盖跳台及楼梯下，逼退CT。", type: 'utility', utilityId: '200006' },
      { id: generateId(), time: "1:40", who: "突破手", content: "待道具生效后，与二楼队友同步拉出，清理A包点。", type: 'frag' },
      { id: generateId(), time: "Post", who: "补枪辅助", content: "下包，位置选择警家能看到的（如短箱外侧），方便控制。", type: 'movement' },
      { id: generateId(), time: "Post", who: "全员", content: "迅速控制警家区域。", type: 'movement' },
      { id: generateId(), time: "Post", who: "补枪辅助", content: "下包后重点观察跳台方向，防止偷袭。", type: 'hold' },
      { id: generateId(), time: "Post", who: "全员", content: "借助掩体防止与CT远距离对枪，利用人数优势交叉架枪。", type: 'hold' },
    ]
  }
];
