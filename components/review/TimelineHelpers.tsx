
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

export const Icons = {
    Kill: () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    Skull: () => <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5zm0 2a3 3 0 013 3v2H7V7a3 3 0 013-3zm0 8a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-4-1h2v2H6v-2zm8 0h2v2h-2v-2z" /></svg>, 
    Headshot: () => <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-5.5l2-2 2 2 1.5-1.5L13.5 11l2-2-1.5-1.5-2 2-2-2-1.5 1.5 2 2-2 2z"/></svg>,
    Assist: () => <svg className="w-3 h-3 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    Flash: () => <svg className="w-3 h-3 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    Blind: () => <svg className="w-3 h-3 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>,
    Wallbang: () => <svg className="w-3 h-3 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
    Smoke: () => <svg className="w-3 h-3 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>,
    Bomb: () => <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Defuse: () => <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0 0L3 3m5.758 5.758a3 3 0 104.243-4.243 3 3 0 00-4.243 4.243z" /></svg>,
    Explode: () => <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>,
    Flag: () => <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-8a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h6v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2zm0 0V3m0 6h.01" /></svg>
};
