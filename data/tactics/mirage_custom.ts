
import { Tactic } from '../../types';
import { TAGS } from '../../constants/tags';

export const mirageCustomTactics: Tactic[] = [
  {
    id: "181080",
    mapId: "mirage",
    side: "T",
    site: "A",
    title: "手枪局A区战术",
    tags: [TAGS.PISTOL, TAGS.STANDARD],
    metadata: {
      author: "FuNct1on",
      lastUpdated: "2026-01-31",
      difficulty: "Medium"
    },

    loadout: [
        { role: "道具辅助", equipment: "烟雾弹, 闪光弹, P250" },
        { role: "狙击手", equipment: "半甲" },
        { role: "突破手", equipment: "半甲" },
        { role: "补枪辅助", equipment: "半甲" },
        { role: "自由人", equipment: "半甲" }
    ],
    map_visual: "", 
    actions: [
      {
        id: "149851",
        who: "道具辅助",
        time: "Freeze",
        content: "发P250给狙击手，自己买烟闪，其余人半甲。",
        type: "movement"
      },
      {
        id: "863745",
        who: "道具辅助",
        time: "1:40",
        content: "爆警家烟、灯柱闪。",
        type: "utility"
      },
      {
        id: "962875",
        who: "狙击手",
        time: "1:40",
        content: "A2启动，直架控制跳台Jungle。",
        type: "movement"
      },
      {
        id: "556548",
        who: "突破手",
        time: "1:40",
        content: "A1跟闪出，优先抢进包点。",
        type: "movement"
      }
    ]
  }
];
