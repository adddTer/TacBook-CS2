import { Tactic } from '../types';
import { mirageTactics } from './tactics_mirage';
import { TAGS } from '../constants/tags';

const infernoTactics: Tactic[] = [
  {
    id: "t_inferno_b_exec",
    mapId: "inferno",
    title: "B区-连接爆弹",
    side: "T",
    site: "B",
    tags: [TAGS.BUY, TAGS.EXEC, TAGS.STANDARD],
    metadata: {
      author: "IGL_Master",
      lastUpdated: "2023-09-15",
      difficulty: "Medium"
    },
    map_visual: "",
    actions: [
      { id: "i1", time: "1:40", who: "道具辅助", content: "香蕉道集合，给CT烟+棺材烟。", type: 'utility' },
      { id: "i2", time: "1:35", who: "突破手", content: "闪光爆开后横拉，先看沙袋，再看警家。", type: 'frag' },
      { id: "i3", time: "1:35", who: "补枪辅助", content: "烧死角火，防止老六。", type: 'utility' }
    ]
  }
];

// Combine all map tactics
export const ALL_TACTICS: Tactic[] = [
  ...mirageTactics,
  ...infernoTactics
];
