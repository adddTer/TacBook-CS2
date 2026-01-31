import { Tactic } from '../types';
import { generateId } from '../utils/idGenerator';
import { TAGS } from '../constants/tags';

export const mirageTactics: Tactic[] = [
  {
    id: "t_mirage_a_exec",
    mapId: "mirage",
    title: "A区-爆弹一波流",
    side: "T",
    site: "A",
    tags: [TAGS.BUY, TAGS.RUSH, TAGS.EXEC],
    metadata: {
      author: "IGL_Master",
      lastUpdated: "2023-10-25",
      difficulty: "Medium"
    },
    map_visual: "", 
    actions: [
      { id: generateId('a'), time: "1:55", who: "道具辅助", content: "在出生点瞄准A区投掷警家烟+拱门烟。" },
      { id: generateId('a'), time: "1:45", who: "突破手", content: "直接干拉A1，只看三明治，不管警家。", type: 'movement' },
      { id: generateId('a'), time: "1:45", who: "补枪辅助", content: "紧跟突破1，第一时间预瞄跳台，随后清二楼下。", type: 'frag' },
      { id: generateId('a'), time: "1:40", who: "自由人", content: "默认断B二楼，1:30准时归队看下水道屁股。", type: 'hold' },
      { id: generateId('a'), time: "Post", who: "狙击手", content: "包点下包后，去A1架住中路过点，防止CT绕后。", type: 'hold' }
    ]
  },
  {
    id: "t_mirage_mid_split",
    mapId: "mirage",
    title: "中路-夹B战术",
    side: "T",
    site: "Mid",
    tags: [TAGS.BUY, TAGS.MAP_CONTROL, TAGS.SLOW],
    metadata: {
      author: "Coach_Li",
      lastUpdated: "2023-11-02",
      difficulty: "Hard"
    },
    map_visual: "",
    actions: [
      { id: generateId('m'), time: "Freeze", who: "道具辅助", content: "全员默认道具开局，做控图准备。", type: 'utility' },
      { id: generateId('m'), time: "1:30", who: "VIP", content: "封VIP烟雾，快速过拱门，准备夹击B小。", type: 'movement' }, 
      { id: generateId('m'), time: "1:30", who: "自由人", content: "听到中路枪声，同步压出B二楼，给白车火。", type: 'movement' },
      { id: generateId('m'), time: "1:20", who: "突破手", content: "过中远，架住B小近点，小心下水道前压。", type: 'hold' },
      { id: generateId('m'), time: "1:10", who: "狙击手", content: "在后点架住拱门和警家，掩护队友进B小。", type: 'frag' }
    ]
  },
  {
    id: "t_mirage_b_rush",
    mapId: "mirage",
    title: "B区-提速Rush",
    side: "T",
    site: "B",
    tags: [TAGS.ECO, TAGS.GAMBLE, TAGS.RUSH],
    metadata: {
      author: "Rusher_King",
      lastUpdated: "2023-12-01",
      difficulty: "Easy"
    },
    map_visual: "",
    actions: [
      { id: generateId('b'), time: "1:55", who: "突破手", content: "最强身法跳车，直冲白车，不要停。", type: 'movement' },
      { id: generateId('b'), time: "1:50", who: "道具辅助", content: "跑动中投掷超市烟+窗户烟，两颗闪光弹送出。", type: 'utility' },
      { id: generateId('b'), time: "1:50", who: "补枪辅助", content: "紧跟突破1，补枪，清沙发和死点。", type: 'frag' },
      { id: generateId('b'), time: "1:45", who: "自由人", content: "从二楼跳下，看超市方向，封超市火。", type: 'utility' }
    ]
  }
];
