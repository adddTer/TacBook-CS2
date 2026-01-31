import { Utility } from '../types';

export const UTILITIES: Utility[] = [
  // Mirage A
  {
    id: 'util_mir_stairs',
    mapId: 'mirage',
    side: 'T',
    site: 'A',
    title: 'A区-楼梯烟',
    type: 'smoke',
    content: '在T台阶下第一根柱子贴墙，瞄准墙壁黑点投掷。',
    metadata: { author: 'Admin' }
  },
  {
    id: 'util_mir_jungle',
    mapId: 'mirage',
    side: 'T',
    site: 'A',
    title: 'A区-拱门/链接烟',
    type: 'smoke',
    content: 'T台阶上第三个台阶，瞄准屋檐缺口投掷。',
    metadata: { author: 'Admin' }
  },
  {
    id: 'util_mir_ct',
    mapId: 'mirage',
    side: 'T',
    site: 'A',
    title: 'A区-警家烟',
    type: 'smoke',
    content: '贴墙瞄准脚手架右侧突起，跑投。',
    metadata: { author: 'Admin' }
  },
  
  // Mirage Mid
  {
    id: 'util_mir_window',
    mapId: 'mirage',
    side: 'T',
    site: 'Mid',
    title: '中路-窗口烟 (Instant)',
    type: 'smoke',
    content: '垃圾桶旁按住D+W+Jumpthrow。',
    metadata: { author: 'Admin' }
  },
  {
    id: 'util_mir_conn',
    mapId: 'mirage',
    side: 'T',
    site: 'Mid',
    title: '中路-拱门烟',
    type: 'smoke',
    content: '下水道口瞄准天线顶端投掷。',
    metadata: { author: 'Admin' }
  },

  // Mirage B
  {
    id: 'util_mir_market_window',
    mapId: 'mirage',
    side: 'T',
    site: 'B',
    title: 'B区-超市窗口烟',
    type: 'smoke',
    content: 'B二楼瞄准塔尖，跳投。',
    metadata: { author: 'Admin' }
  }
];