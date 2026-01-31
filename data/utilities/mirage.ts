
import { Utility } from '../../types';

export const mirageUtilities: Utility[] = [
  {
    id: 'util_mir_mid_arch',
    mapId: 'mirage',
    side: 'T',
    site: 'Mid',
    title: '中路-拱门烟',
    type: 'smoke',
    content: '在T出生点下水道口附近，瞄准天线顶端投掷。用于遮挡连接/拱门视野。',
    metadata: { author: 'Admin' },
    image: 'https://files.catbox.moe/dummy_arch_smoke.jpg' // Placeholder, in real app user uploads this
  },
  {
    id: 'util_mir_mid_window',
    mapId: 'mirage',
    side: 'T',
    site: 'Mid',
    title: '中路-VIP烟',
    type: 'smoke',
    content: '瞄准特定标志物跑投/跳投，封锁VIP窗口视野，掩护中路推进。',
    metadata: { author: 'Admin' }
  },
  {
    id: 'util_mir_b_short_pop',
    mapId: 'mirage',
    side: 'T',
    site: 'B',
    title: 'B小-自助瞬爆闪',
    type: 'flash',
    content: '在B小道墙壁反弹，致盲B小近点及超市外敌人，自己背身不白。',
    metadata: { author: 'Admin' }
  },
  {
    id: 'util_mir_b_apps_flash',
    mapId: 'mirage',
    side: 'T',
    site: 'B',
    title: 'B二楼-掩护闪',
    type: 'flash',
    content: '从二楼窗口/门缝投掷，致盲B包点及白车敌人，掩护队友跳出二楼。',
    metadata: { author: 'Admin' }
  }
];
