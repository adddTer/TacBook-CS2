
import { WEAPONS } from '../data/weapons';

// Map common colloquial terms (Chinese & English) to Weapon IDs
const NAME_MAP: Record<string, string> = {
    '半甲': 'kevlar',
    '全甲': 'helmet',
    '大甲': 'helmet',
    '防弹背心': 'kevlar',
    '头盔': 'helmet',
    
    '烟雾弹': 'smoke',
    '烟': 'smoke',
    '烟雾': 'smoke',
    'smoke': 'smoke',
    
    '闪光弹': 'flash',
    '闪光': 'flash',
    '闪': 'flash',
    'flash': 'flash',
    
    '燃烧瓶': 'molotov', // T side
    '燃烧弹': 'incendiary', // CT side
    '火': 'molotov', // Generic fallback
    'molotov': 'molotov',
    'incendiary': 'incendiary',
    
    '手雷': 'he',
    '雷': 'he',
    '炸弹': 'he',
    '高爆手雷': 'he',
    'he': 'he',
    
    '诱饵弹': 'decoy',
    '诱饵': 'decoy',
    'decoy': 'decoy',
    
    '钳子': 'kit',
    '拆弹器': 'kit',
    '雷钳': 'kit',
    'kit': 'kit',
    'defuser': 'kit',
    
    '电击枪': 'zeus',
    '电': 'zeus',
    'zeus': 'zeus',

    'ak': 'ak47',
    'm4': 'm4a1s',
    'awp': 'awp',
    '大狙': 'awp',
    '鸟狙': 'ssg08',
    '沙鹰': 'deagle',
};

const getWeaponPrice = (term: string): number => {
    const cleanTerm = term.trim();
    if (!cleanTerm) return 0;
    
    const lowerTerm = cleanTerm.toLowerCase();

    // 1. Direct ID or Name match in WEAPONS database
    const weapon = WEAPONS.find(w => w.id === lowerTerm || w.name === cleanTerm || w.name.toLowerCase() === lowerTerm);
    if (weapon) return weapon.price;

    // 2. Alias match
    const aliasId = NAME_MAP[cleanTerm] || NAME_MAP[lowerTerm];
    if (aliasId) {
        const w = WEAPONS.find(w => w.id === aliasId);
        return w ? w.price : 0;
    }
    
    return 0;
};

export const calculateLoadoutCost = (equipmentStr: string): number => {
    if (!equipmentStr) return 0;

    // 1. Remove parenthetical content (usually instructions like "drop for xxx")
    // e.g., "半甲 (自由人发P250)" -> "半甲 "
    const cleanStr = equipmentStr.replace(/\(.*?\)|（.*?）/g, '');
    
    // 2. Split by common separators: comma, plus, Chinese comma
    const items = cleanStr.split(/[,，+]/).map(s => s.trim()).filter(s => s);
    
    let total = 0;
    
    items.forEach(item => {
        total += getWeaponPrice(item);
    });
    
    return total;
};
