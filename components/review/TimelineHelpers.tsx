
import React from 'react';
import { 
    Crosshair, 
    Skull, 
    Timer, 
    Scissors, 
    Flame, 
    Flag, 
    Target, 
    UserPlus, 
    Sun, 
    EyeOff, 
    SquareArrowRight, 
    Cloud,
    Bomb
} from 'lucide-react';

// --- Mappings ---

export const WIN_REASON_CN_MAP: Record<string, string> = {
    // Number keys (converted to string)
    '1': 'T 歼灭/C4爆炸',   
    '7': 'C4 拆除',        
    '8': 'T 全灭',         
    '9': 'CT 全灭',        
    '10': 'C4 爆炸',       
    '12': '时间耗尽',      
    '17': 'T 投降',
    '18': 'CT 投降',
    // String keys (common parser outputs)
    'target_bombed': 'C4 爆炸',
    'bomb_defused': 'C4 拆除',
    't_killed': 'T 全灭',
    'ct_killed': 'CT 全灭',
    'target_saved': '时间耗尽',
    'terrorists_surrender': 'T 投降',
    'ct_surrender': 'CT 投降',
    'bomb_exploded': 'C4 爆炸',
    'time_ran_out': '时间耗尽'
};

export const getWinReasonText = (reason: number | string) => {
    return WIN_REASON_CN_MAP[String(reason)] || `Reason ${reason}`;
};

// Official CS2 Names aligned with data/weapons.ts
export const WEAPON_CN_MAP: Record<string, string> = {
    // Pistols
    'glock': '格洛克18型', 
    'hkp2000': 'P2000', 
    'usp_silencer': 'USP-S', 
    'p250': 'P250', 
    'tec9': 'Tec-9',
    'fiveseven': 'FN57', 
    'deagle': '沙漠之鹰', 
    'cz75a': 'CZ75自动手枪', 
    'elite': '双持贝瑞塔', 
    'revolver': 'R8左轮手枪',

    // Rifles
    'ak47': 'AK-47', 
    'm4a1': 'M4A4', 
    'm4a1_silencer': 'M4A1-S', 
    'galilar': '加利尔AR', 
    'famas': '法玛斯',
    'sg553': 'SG 553', 
    'aug': 'AUG', 
    'awp': 'AWP', 
    'ssg08': 'SSG08', 
    'g3sg1': 'G3SG1', 
    'scar20': 'SCAR-20',

    // SMGs
    'mac10': 'MAC-10', 
    'mp9': 'MP9', 
    'mp7': 'MP7', 
    'mp5sd': 'MP5-SD', 
    'ump45': 'UMP-45', 
    'p90': 'P90', 
    'bizon': 'PP-野牛',

    // Heavy
    'nova': '新星', 
    'xm1014': 'XM1014', 
    'mag7': 'MAG-7', 
    'sawedoff': '截短霰弹枪', 
    'm249': 'M249', 
    'negev': '内格夫',

    // Grenades & Gear
    'hegrenade': '高爆手雷', 
    'flashbang': '闪光震撼弹', 
    'smokegrenade': '烟雾弹', 
    'incgrenade': '燃烧弹', 
    'molotov': '燃烧瓶', 
    'decoy': '诱饵弹',
    'inferno': '燃烧伤害', 
    'taser': '宙斯x27电击枪', 
    'knife': '匕首', 
    'world': '环境',

    // Knives (CS2 Skins/Types)
    'knife_karambit': '爪子刀',
    'knife_m9_bayonet': 'M9刺刀',
    'knife_bayonet': '刺刀',
    'knife_butterfly': '蝴蝶刀',
    'knife_flip': '折叠刀',
    'knife_gut': '穿肠刀',
    'knife_tactical': '猎杀者匕首',
    'knife_falchion': '弯刀',
    'knife_survival_bowie': '鲍伊猎刀',
    'knife_canis': '求生匕首',
    'knife_cord': '系绳匕首',
    'knife_skeleton': '骷髅匕首',
    'knife_outdoor': '流浪者匕首',
    'knife_stiletto': '短剑',
    'knife_widowmaker': '锯齿爪刀',
    'knife_push': '暗影双匕',
    'knife_gypsy_jackknife': '折刀',
    'knife_ursus': '熊刀',
    'knife_kukri': '廓尔喀刀',
    'knife_css': '海豹短刀',
};

export const getWeaponName = (code?: string) => {
    if (!code) return '';
    // 1. Remove 'weapon_' prefix
    // 2. Remove suffixes like '_txz16' (custom skins/models often seen in demos)
    const clean = code.toLowerCase().replace(/^weapon_/, '').replace(/_txz\d*$/, '');
    
    // Check for generic knife mapping if specific one not found
    if (clean.startsWith('knife') && !WEAPON_CN_MAP[clean]) {
        return '匕首';
    }
    
    return WEAPON_CN_MAP[clean] || clean.toUpperCase();
};

export const ROUND_DURATION = 115; // 1:55 in seconds
export const BOMB_DURATION = 41;   // 41 seconds bomb timer

export const formatTime = (seconds: number, mode: 'elapsed' | 'countdown' = 'elapsed', plantTime?: number) => {
    let t = seconds;
    
    // Check if we are in a post-plant scenario
    const isPostPlant = plantTime !== undefined && seconds >= plantTime;

    if (mode === 'countdown') {
        if (isPostPlant) {
            // Bomb Countdown: 40s - (CurrentTime - PlantTime)
            t = BOMB_DURATION - (seconds - plantTime);
        } else {
            // Standard Round Countdown: 1:55 - CurrentTime
            // Note: If seconds is negative (freeze time), this naturally becomes > 1:55 (e.g. 1:55 - (-5) = 2:00)
            t = ROUND_DURATION - seconds;
        }
    }

    const sign = t < 0 ? '-' : '';
    const absT = Math.abs(t);
    const m = Math.floor(absT / 60);
    const s = Math.floor(absT % 60);
    
    return `${sign}${m}:${s.toString().padStart(2, '0')}`;
};

// --- Icons (SVG) ---

interface IconProps {
    className?: string;
}

export const Icons = {
    Kill: ({ className }: IconProps) => <Crosshair className={className || "w-3.5 h-3.5"} strokeWidth={2.5} />,
    Skull: ({ className }: IconProps) => <Skull className={className || "w-3.5 h-3.5"} strokeWidth={2.5} />,
    Headshot: ({ className }: IconProps) => <Skull className={className || "w-3 h-3 text-red-500"} strokeWidth={2.5} />,
    Assist: ({ className }: IconProps) => <UserPlus className={className || "w-3 h-3 text-neutral-400"} strokeWidth={2.5} />,
    Flash: ({ className }: IconProps) => <Sun className={className || "w-3 h-3 text-yellow-500"} strokeWidth={2.5} />,
    Blind: ({ className }: IconProps) => <EyeOff className={className || "w-3 h-3 text-neutral-400"} strokeWidth={2.5} />,
    Wallbang: ({ className }: IconProps) => <SquareArrowRight className={className || "w-3 h-3 text-neutral-400"} strokeWidth={2.5} />,
    Smoke: ({ className }: IconProps) => <Cloud className={className || "w-3 h-3 text-neutral-400"} strokeWidth={2.5} />,
    Bomb: ({ className }: IconProps) => <Bomb className={className || "w-3.5 h-3.5"} strokeWidth={2.5} />,
    Defuse: ({ className }: IconProps) => <Scissors className={className || "w-3.5 h-3.5"} strokeWidth={2.5} />,
    Explode: ({ className }: IconProps) => <Bomb className={className || "w-3.5 h-3.5 text-white"} strokeWidth={2.5} />,
    Flag: ({ className }: IconProps) => <Flag className={className || "w-3.5 h-3.5 text-white"} strokeWidth={2.5} />,
    Timer: ({ className }: IconProps) => <Timer className={className || "w-3.5 h-3.5 text-neutral-400"} strokeWidth={2.5} />,
    Target: ({ className }: IconProps) => <Target className={className || "w-3.5 h-3.5 text-neutral-400"} strokeWidth={2.5} />
};
