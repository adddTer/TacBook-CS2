
// 武器价值表 (严格对齐 data/weapons.ts)
// Key 对应 Demo 解析出的内部名称 (去除 weapon_ 前缀)
export const WEAPON_VALUES: Record<string, number> = {
    // Pistols
    'glock': 200, 'hkp2000': 200, 'usp_silencer': 200, 'p250': 300,
    'cz75a': 600, 'tec9': 500, 'fiveseven': 500, 'deagle': 700, 'revolver': 600, 'elite': 300,
    
    // SMGs
    'mac10': 1050, 'mp9': 1250, 'ump45': 1200, 
    'mp7': 1400, // data/weapons.ts: 1400
    'mp5sd': 1400, // data/weapons.ts: 1400
    'bizon': 1300, 'p90': 2350,
    
    // Rifles
    'galilar': 1800, 
    'famas': 1950, // data/weapons.ts: 1950
    'ak47': 2700, 
    'm4a1': 2900, // M4A4 (internally often m4a1 or m4a4 depending on parser version)
    'm4a4': 2900, 
    'm4a1_silencer': 2900,
    'ssg08': 1700, 'awp': 4750, 'aug': 3300, 'sg553': 3000, 'scar20': 5000, 'g3sg1': 5000,
    
    // Heavy
    'nova': 1050, 'xm1014': 2000, 'sawedoff': 1100, 'mag7': 1300, 'm249': 5200, 'negev': 1700,
    
    // Equipment
    'flashbang': 200, 'smokegrenade': 300, 'hegrenade': 300, 'molotov': 400, 
    'incendiarygrenade': 500, // data/weapons.ts: 500
    'incgrenade': 500, // Alias for parsing
    'decoy': 50,
    'kevlar': 650, 'assaultsuit': 1000, 'defuser': 400, 'taser': 200,
    'vest': 650, 'vesthelm': 1000 // Add strict aliases
};

// 物品显示名称到内部ID的映射 (修复 JSON item 为 null 的问题)
export const DISPLAY_NAME_TO_ID: Record<string, string> = {
    "Kevlar Vest": "vest",
    "Kevlar + Helmet": "vesthelm",
    "Defuse Kit": "defuser",
    "Zeus x27": "taser",
    
    // Pistols
    "Glock-18": "glock",
    "P2000": "hkp2000",
    "USP-S": "usp_silencer",
    "P250": "p250",
    "CZ75-Auto": "cz75a",
    "Tec-9": "tec9",
    "Five-SeveN": "fiveseven",
    "Desert Eagle": "deagle",
    "R8 Revolver": "revolver",
    "Dual Berettas": "elite",

    // SMGs
    "MAC-10": "mac10",
    "MP9": "mp9",
    "UMP-45": "ump45",
    "MP7": "mp7",
    "MP5-SD": "mp5sd",
    "PP-Bizon": "bizon",
    "P90": "p90",

    // Rifles
    "Galil AR": "galilar",
    "FAMAS": "famas",
    "AK-47": "ak47",
    "M4A4": "m4a1", // Internal mapping quirk
    "M4A1-S": "m4a1_silencer",
    "SSG 08": "ssg08",
    "AWP": "awp",
    "AUG": "aug",
    "SG 553": "sg553",
    "SCAR-20": "scar20",
    "G3SG1": "g3sg1",

    // Heavy
    "Nova": "nova",
    "XM1014": "xm1014",
    "Sawed-Off": "sawedoff",
    "MAG-7": "mag7",
    "M249": "m249",
    "Negev": "negev",

    // Grenades
    "Flashbang": "flashbang",
    "Smoke Grenade": "smokegrenade",
    "HE Grenade": "hegrenade",
    "Molotov": "molotov",
    "Incendiary Grenade": "incgrenade",
    "Decoy Grenade": "decoy"
};

// 基础胜率矩阵 (T人数, CT人数) -> T胜率
// Row: T Count (0-5), Col: CT Count (0-5)
export const WIN_PROB_MATRIX: number[][] = [
    [0.00, 0.00, 0.00, 0.00, 0.00, 0.00], // 0 T
    [1.00, 0.50, 0.28, 0.16, 0.10, 0.06], // 1 T
    [1.00, 0.72, 0.50, 0.34, 0.23, 0.15], // 2 T
    [1.00, 0.84, 0.66, 0.50, 0.36, 0.25], // 3 T
    [1.00, 0.90, 0.77, 0.64, 0.50, 0.38], // 4 T
    [1.00, 0.94, 0.85, 0.75, 0.62, 0.50]  // 5 T
];