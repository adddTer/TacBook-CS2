import { StatsResult } from './playerStatsCalculator';
import { ROLES, RoleDefinition } from './roleDefinitions';

// 1. Define the Feature Vector Interface
interface FeatureVector {
    firepower: number;
    entry: number;
    opening: number;
    trade: number;
    sniper: number;
    clutch: number;
    utility: number;
    survival: number; // survivalRate
    kast: number;
    adr: number;      // Normalized to 0-100
    impact: number;   // Normalized to 0-100
    aggression: number; // attacksPerRound normalized
    flash: number;    // flashAssists normalized
    multiKill: number; // multiKillRate normalized
}

// 2. Define Ideal Profiles for Each Role
// Values are 0-100. 
// Calibration based on user feedback:
// - Excellent Utility: ~60-70
// - Excellent Clutch: ~70
// - Sniper: >40 is significant
const ROLE_PROFILES: Record<string, Partial<FeatureVector>> = {
    // --- 1. 突破手 (Entry) ---
    'entry_machine':     { entry: 85, opening: 75, aggression: 80, survival: 30, firepower: 60 },
    'opening_duelist':   { opening: 85, entry: 70, aggression: 75, firepower: 70, trade: 40 },
    'space_creator':     { entry: 80, aggression: 90, survival: 20, firepower: 40 }, // High death rate, space creation
    'aggressive_pusher': { aggression: 85, opening: 65, entry: 65, survival: 40 }, // CT aggression
    'aim_entry':         { entry: 75, firepower: 85, adr: 85, opening: 60 }, // High aim
    'first_contact':     { opening: 70, aggression: 60, survival: 40, entry: 50 }, // Info gathering entry

    // --- 2. 补枪手 (Trader) ---
    'trade_king':        { trade: 85, kast: 80, entry: 30, survival: 60 },
    'damage_dealer':     { adr: 90, firepower: 85, trade: 65, entry: 40 },
    'multi_fragger':     { multiKill: 85, firepower: 85, impact: 85 },
    'bodyguard':         { trade: 75, survival: 75, kast: 85, entry: 20 },
    'second_entry':      { trade: 75, entry: 65, opening: 40, firepower: 70 },
    'clean_up':          { trade: 70, clutch: 60, survival: 60, kast: 75 },

    // --- 3. 自由人 (Lurker) ---
    'lurker':            { survival: 85, opening: 15, aggression: 15, clutch: 65, trade: 40 },
    'anchor':            { survival: 80, kast: 75, entry: 15, utility: 55 }, // CT Anchor style
    'flanker':           { survival: 65, aggression: 30, impact: 70, trade: 50 }, // Backstabber
    'clutch_minister':   { clutch: 85, survival: 75, impact: 80 },
    'guerrilla':         { aggression: 50, survival: 65, entry: 40, impact: 65 }, // Active lurk
    'silent_killer':     { survival: 90, aggression: 10, firepower: 50, opening: 10 },

    // --- 4. 狙击手 (Sniper) ---
    // User: Sniper score > 40 is significant. Profiles should reflect "Good" sniper stats.
    'awp_god':           { sniper: 90, firepower: 85, opening: 60 },
    'opening_awp':       { sniper: 80, opening: 85, aggression: 70 },
    'aggressive_awp':    { sniper: 75, entry: 70, aggression: 75, survival: 35 },
    'turret_awp':        { sniper: 80, survival: 75, aggression: 15, entry: 10 },
    'hybrid_awp':        { sniper: 60, firepower: 80, entry: 50 }, // Rifles + AWP
    'mobile_awp':        { sniper: 75, survival: 65, aggression: 50, clutch: 55 },

    // --- 5. 道具手 (Support) ---
    // User: Utility > 60 is Excellent.
    'utility_master':    { utility: 80, flash: 70, adr: 40, entry: 15 },
    'flash_assist':      { flash: 85, utility: 70, support: 80 }, // support key not in vector, removed
    'tactician':         { utility: 70, kast: 75, firepower: 35, trade: 55 },
    'support_anchor':    { utility: 65, survival: 75, kast: 80, entry: 10 },
    'best_teammate':     { kast: 90, trade: 75, utility: 60 },
    'sacrifice':         { utility: 70, entry: 50, survival: 20, adr: 35 }, // Dies for info/space

    // --- 6. 全能王 (Flex) ---
    'hexagon':           { firepower: 75, entry: 70, trade: 70, clutch: 70, utility: 70, survival: 65 },
    'impact_player':     { impact: 90, firepower: 80, clutch: 65, multiKill: 65 },
    'system_player':     { kast: 85, trade: 65, utility: 65, adr: 65, survival: 55 },
    'carry':             { firepower: 90, impact: 90, adr: 90, rating: 90 }, // Rating not in vector, use Impact/ADR
    'filler':            { trade: 55, utility: 55, entry: 45, clutch: 45 }, // Average across board
    'all_rounder':       { firepower: 65, entry: 55, trade: 55, utility: 55, clutch: 55 }
};

// Helper: Normalize values to 0-100 scale
const normalize = (val: number, max: number) => Math.min(Math.max((val / max) * 100, 0), 100);

export const identifyRole = (stats: StatsResult['filtered']): RoleDefinition => {
    const { 
        scoreFirepower, scoreEntry, scoreOpening, scoreTrade, scoreSniper, scoreClutch, scoreUtility, 
        details, survivalRate, headshotPct, kast, adr, impact, multiKillRate 
    } = stats;

    // 1. Build Player Feature Vector
    const playerVector: FeatureVector = {
        firepower: scoreFirepower,
        entry: scoreEntry,
        opening: scoreOpening,
        trade: scoreTrade,
        sniper: scoreSniper,
        clutch: scoreClutch,
        utility: scoreUtility,
        survival: survivalRate,
        kast: kast,
        adr: normalize(adr, 110),           // 110 ADR = 100
        impact: normalize(impact, 1.8),     // 1.8 Impact = 100
        aggression: normalize(details.attacksPerRound, 0.35), // 0.35 attacks/round = 100
        flash: normalize(details.flashAssistsPerRound, 0.15), // 0.15 FA/round = 100
        multiKill: normalize(multiKillRate, 25) // 25% MKR = 100
    };

    // 2. Hard Filters (Sniper Check)
    // If player is NOT a sniper, exclude all sniper roles
    // User: > 40 Score or > 20% Kills is significant
    const isSniper = details.sniperKillsPct > 20 || scoreSniper > 40;

    // 3. Find Closest Role
    let bestRole = 'all_rounder';
    let minDistance = Infinity;

    for (const [roleId, profile] of Object.entries(ROLE_PROFILES)) {
        // Skip sniper roles if player is not a sniper
        if (!isSniper && ROLES.find(r => r.id === roleId)?.category === '狙击手') {
            continue;
        }
        // Skip NON-sniper roles if player IS a dedicated sniper (optional)
        // If sniper usage is VERY high (>50%), penalize non-sniper roles?
        // Let's rely on the distance. AWP God has sniper: 90. 
        // If player has sniper: 80, AWP God will be close. Entry Machine (sniper: undefined/0) will be far.
        
        let distance = 0;
        let count = 0;

        // Calculate Euclidean distance for defined keys
        for (const key of Object.keys(profile) as (keyof FeatureVector)[]) {
            const idealVal = profile[key] || 50; 
            const playerVal = playerVector[key] || 0;
            
            // Weighting: Give more weight to "defining" features of the role?
            // For now, uniform weight.
            
            const diff = playerVal - idealVal;
            distance += diff * diff;
            count++;
        }

        // Normalize distance by number of features checked
        if (count > 0) {
            const avgDistance = Math.sqrt(distance / count);
            
            if (avgDistance < minDistance) {
                minDistance = avgDistance;
                bestRole = roleId;
            }
        }
    }

    return ROLES.find(r => r.id === bestRole) || ROLES.find(r => r.id === 'all_rounder')!;
};
