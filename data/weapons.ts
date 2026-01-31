
import { Weapon } from '../types';

export const WEAPONS: Weapon[] = [
  // --- Pistols (手枪) ---
  { id: 'glock', name: '格洛克 18型', category: 'pistol', price: 200, killAward: 300, side: 'T', desc: 'T阵营默认手枪。' },
  { id: 'usp', name: 'USP-S', category: 'pistol', price: 200, killAward: 300, side: 'CT', desc: 'CT阵营默认手枪（消音）。' },
  { id: 'p2000', name: 'P2000', category: 'pistol', price: 200, killAward: 300, side: 'CT', desc: 'CT阵营默认手枪（备选）。' },
  { id: 'p250', name: 'P250', category: 'pistol', price: 300, killAward: 300, side: 'Both' },
  { id: 'cz75', name: 'CZ75 自动手枪', category: 'pistol', price: 600, killAward: 100, side: 'Both' },
  { id: 'tec9', name: 'Tec-9', category: 'pistol', price: 500, killAward: 300, side: 'T' },
  { id: 'fiveseven', name: 'FN57', category: 'pistol', price: 500, killAward: 300, side: 'CT' },
  { id: 'deagle', name: '沙漠之鹰', category: 'pistol', price: 700, killAward: 300, side: 'Both' },
  { id: 'r8', name: 'R8 左轮手枪', category: 'pistol', price: 600, killAward: 300, side: 'Both' },
  { id: 'dualberettas', name: '双持贝瑞塔', category: 'pistol', price: 300, killAward: 300, side: 'Both' },

  // --- Mid-Tier (微冲/霰弹/机枪) ---
  { id: 'mac10', name: 'MAC-10', category: 'mid-tier', price: 1050, killAward: 600, side: 'T' },
  { id: 'mp9', name: 'MP9', category: 'mid-tier', price: 1250, killAward: 600, side: 'CT' },
  { id: 'ump45', name: 'UMP-45', category: 'mid-tier', price: 1200, killAward: 600, side: 'Both' },
  { id: 'mp7', name: 'MP7', category: 'mid-tier', price: 1400, killAward: 600, side: 'Both' },
  { id: 'mp5sd', name: 'MP5-SD', category: 'mid-tier', price: 1400, killAward: 600, side: 'Both' },
  { id: 'bizon', name: 'PP-野牛', category: 'mid-tier', price: 1300, killAward: 600, side: 'Both' },
  { id: 'p90', name: 'P90', category: 'mid-tier', price: 2350, killAward: 300, side: 'Both' },
  
  { id: 'nova', name: '新星', category: 'mid-tier', price: 1050, killAward: 900, side: 'Both' },
  { id: 'xm1014', name: 'XM1014', category: 'mid-tier', price: 2000, killAward: 900, side: 'Both' },
  { id: 'sawedoff', name: '截短霰弹枪', category: 'mid-tier', price: 1100, killAward: 900, side: 'T' },
  { id: 'mag7', name: 'MAG-7', category: 'mid-tier', price: 1300, killAward: 900, side: 'CT' },

  { id: 'm249', name: 'M249', category: 'mid-tier', price: 5200, killAward: 300, side: 'Both' },
  { id: 'negev', name: '内格夫', category: 'mid-tier', price: 1700, killAward: 300, side: 'Both' },

  // --- Rifles (步枪) ---
  { id: 'galil', name: '加利尔 AR', category: 'rifle', price: 1800, killAward: 300, side: 'T' },
  { id: 'famas', name: '法玛斯', category: 'rifle', price: 1950, killAward: 300, side: 'CT' },
  { id: 'ak47', name: 'AK-47', category: 'rifle', price: 2700, killAward: 300, side: 'T' },
  { id: 'm4a4', name: 'M4A4', category: 'rifle', price: 2900, killAward: 300, side: 'CT' },
  { id: 'm4a1s', name: 'M4A1-S', category: 'rifle', price: 2900, killAward: 300, side: 'CT' },
  { id: 'ssg08', name: 'SSG 08', category: 'rifle', price: 1700, killAward: 300, side: 'Both', desc: '俗称“鸟狙”。' },
  { id: 'awp', name: 'AWP', category: 'rifle', price: 4750, killAward: 100, side: 'Both' },
  { id: 'sg553', name: 'SG 553', category: 'rifle', price: 3000, killAward: 300, side: 'T' },
  { id: 'aug', name: 'AUG', category: 'rifle', price: 3300, killAward: 300, side: 'CT' },
  { id: 'g3sg1', name: 'G3SG1', category: 'rifle', price: 5000, killAward: 300, side: 'T', desc: 'T阵营连狙。' },
  { id: 'scar20', name: 'SCAR-20', category: 'rifle', price: 5000, killAward: 300, side: 'CT', desc: 'CT阵营连狙。' },

  // --- Grenades (投掷物) ---
  { id: 'flash', name: '闪光震撼弹', category: 'grenade', price: 200, side: 'Both', desc: '致盲敌人，不仅瞎眼还会耳鸣。' },
  { id: 'smoke', name: '烟雾弹', category: 'grenade', price: 300, side: 'Both', desc: '持续18秒，用于隔断视线和灭火。' },
  { id: 'he', name: '高爆手雷', category: 'grenade', price: 300, side: 'Both', desc: '对无甲敌人造成巨大伤害。' },
  { id: 'molotov', name: '燃烧瓶', category: 'grenade', price: 400, side: 'T', desc: '持续7秒，随时间增加伤害。' },
  { id: 'incendiary', name: '燃烧弹', category: 'grenade', price: 500, side: 'CT', desc: '价格更贵，范围和持续时间略小于燃烧瓶。' },
  { id: 'decoy', name: '诱饵弹', category: 'grenade', price: 50, side: 'Both', desc: '模拟主武器枪声，并在结束时爆炸。' },

  // --- Gear (装备) ---
  { id: 'kevlar', name: '防弹背心', category: 'gear', price: 650, side: 'Both', desc: '半甲，防止被无甲一击必杀。' },
  { id: 'helmet', name: '防弹背心 + 头盔', category: 'gear', price: 1000, side: 'Both', desc: '全甲，防止爆头伤害（AK/AWP除外）。' },
  { id: 'kit', name: '拆弹器', category: 'gear', price: 400, side: 'CT', desc: '将拆包时间从10秒减少到5秒。' },
  { id: 'zeus', name: '电击枪 x27', category: 'gear', price: 200, killAward: 0, side: 'Both', desc: '近距离一击必杀，可充能。' },
];
