
// Prices for Economy Calculation (Simplified for Rating 3.0)
export const WEAPON_PRICES: Record<string, number> = {
    // Pistols
    'glock': 200, 'hkp2000': 200, 'usp_silencer': 200, 'p250': 300,
    'cz75a': 600, 'tec9': 500, 'fiveseven': 500, 'deagle': 700, 'revolver': 600, 'elite': 300,
    
    // SMGs
    'mac10': 1050, 'mp9': 1250, 'ump45': 1200, 'mp7': 1400, 'mp5sd': 1400, 'bizon': 1300, 'p90': 2350,
    
    // Rifles
    'galilar': 1800, 'famas': 1950, 'ak47': 2700, 'm4a1': 2900, 'm4a1_silencer': 2900,
    'ssg08': 1700, 'awp': 4750, 'aug': 3300, 'sg553': 3000, 'scar20': 5000, 'g3sg1': 5000,
    
    // Heavy
    'nova': 1050, 'xm1014': 2000, 'sawedoff': 1100, 'mag7': 1300, 'm249': 5200, 'negev': 1700,
    
    // Grenades
    'flashbang': 200, 'smokegrenade': 300, 'hegrenade': 300, 'molotov': 400, 'incendiarygrenade': 600, 'decoy': 50,
    
    // Gear
    'kevlar': 650, 'assaultsuit': 1000, 'defuser': 400, 'taser': 200
};

// Simple Win Probability Matrix (T Alive, CT Alive) -> T Win %
// Source: Simplified generic competitive matrix
// Rows: T Count (0-5), Cols: CT Count (0-5)
export const WIN_PROBABILITY_MATRIX: number[][] = [
    // CT: 0    1     2     3     4     5
    [0.0, 0.0,  0.0,  0.0,  0.0,  0.0], // T: 0
    [1.0, 0.5,  0.3,  0.15, 0.1,  0.05], // T: 1
    [1.0, 0.7,  0.5,  0.35, 0.2,  0.1], // T: 2
    [1.0, 0.85, 0.65, 0.5,  0.35, 0.2], // T: 3
    [1.0, 0.9,  0.8,  0.65, 0.5,  0.35], // T: 4
    [1.0, 0.95, 0.9,  0.8,  0.65, 0.5]  // T: 5
];

export const getWinProbability = (tAlive: number, ctAlive: number): number => {
    if (tAlive <= 0) return 0;
    if (ctAlive <= 0) return 1;
    if (tAlive > 5) tAlive = 5;
    if (ctAlive > 5) ctAlive = 5;
    return WIN_PROBABILITY_MATRIX[tAlive][ctAlive];
};
