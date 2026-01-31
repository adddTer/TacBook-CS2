
import { Tactic } from '../../types';
import { generateId } from '../../utils/idGenerator';
import { TAGS } from '../../constants/tags';

export const anubisTactics: Tactic[] = [
  {
    id: "t_anubis_buy_mid_split_b",
    mapId: "anubis",
    title: "长枪局中夹B",
    side: "T",
    site: "B",
    tags: [TAGS.BUY, TAGS.MAP_CONTROL, TAGS.EXEC],
    metadata: {
      author: "addd",
      lastUpdated: "2026-1-31",
      difficulty: "Medium"
    },
    loadout: [
      { role: "B外组", equipment: "步枪, C4, 烟闪" },
      { role: "B外组", equipment: "步枪, 烟闪" },
      { role: "中路组", equipment: "燃烧瓶, 手雷, 烟雾" },
      { role: "中路组", equipment: "燃烧瓶, 手雷" },
      { role: "中路组", equipment: "步枪, 闪光" },
    ],
    map_visual: "", 
    actions: [
      { id: generateId(), time: "Freeze", who: "全员", content: "2人去B外（带包），3人去中路集合。" },
      { id: generateId(), time: "1:45", who: "中路组", content: "投掷狗洞火或双雷套餐，防止CT前压。", type: 'utility', utilityId: '400001' },
      { id: generateId(), time: "1:45", who: "中路组", content: "同步投掷中路火，压制桥下区域。", type: 'utility', utilityId: '400002' },
      { id: generateId(), time: "1:40", who: "中路组", content: "沿着火焰边缘快速推进，控制中路水下。", type: 'movement' },
      { id: generateId(), time: "1:35", who: "中路组", content: "推进时时刻留意A包点/A连接方向，防止侧身被偷。", type: 'hold' },
      { id: generateId(), time: "1:30", who: "B外组", content: "听到中路交火或就位信号后，爆弹施压B门。", type: 'utility' },
      { id: generateId(), time: "Exec", who: "全员", content: "中路组走连接/黑屋，B外组进B门，同步夹击B包点。", type: 'frag' },
    ]
  }
];
