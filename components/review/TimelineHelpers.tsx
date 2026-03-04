
import React from 'react';

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
    'glock': '格洛克 18型', 
    'hkp2000': 'P2000', 
    'usp_silencer': 'USP-S', 
    'p250': 'P250', 
    'tec9': 'Tec-9',
    'fiveseven': 'FN57', 
    'deagle': '沙漠之鹰', 
    'cz75a': 'CZ75 自动手枪', 
    'elite': '双持贝瑞塔', 
    'revolver': 'R8 左轮手枪',

    // Rifles
    'ak47': 'AK-47', 
    'm4a1': 'M4A4', 
    'm4a1_silencer': 'M4A1-S', 
    'galilar': '加利尔 AR', 
    'famas': '法玛斯',
    'sg553': 'SG 553', 
    'aug': 'AUG', 
    'awp': 'AWP', 
    'ssg08': 'SSG 08', 
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
    'taser': '电击枪 x27', 
    'knife': '刀', 
    'world': '世界'
};

export const getWeaponName = (code?: string) => {
    if (!code) return '';
    // 1. Remove 'weapon_' prefix
    // 2. Remove suffixes like '_txz16' (custom skins/models often seen in demos)
    const clean = code.toLowerCase().replace(/^weapon_/, '').replace(/_txz\d*$/, '');
    
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
    Kill: ({ className }: IconProps) => <svg className={className || "w-3.5 h-3.5"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    Skull: ({ className }: IconProps) => (
        <svg className={className || "w-3.5 h-3.5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 10L9.01 10M15 10L15.01 10M12 2C7.03 2 3 6.03 3 11C3 13.56 4.07 15.87 5.79 17.5L5 22H19L18.21 17.5C19.93 15.87 21 13.56 21 11C21 6.03 16.97 2 12 2Z" />
        </svg>
    ),
    Bomb: ({ className }: IconProps) => (
        <svg className={className || "w-3.5 h-3.5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
        </svg>
    ),
    Defuse: ({ className }: IconProps) => (
        <svg className={className || "w-3.5 h-3.5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 10l-6 6M20 4l-6 6M10 14l-6-6M20 20l-6-6M10 10l4 4" />
        </svg>
    ),
    Explode: ({ className }: IconProps) => (
        <svg className={className || "w-3.5 h-3.5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <circle cx="11" cy="13" r="7" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 8.5c.5-1.5 1.5-2.5 3-2.5M18.5 6l1.5-1.5M18.5 6l-1.5-1.5" />
        </svg>
    ),
    Flag: ({ className }: IconProps) => <svg className={className || "w-3.5 h-3.5 text-white"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-8a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h6v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2zm0 0V3m0 6h.01" /></svg>
};
