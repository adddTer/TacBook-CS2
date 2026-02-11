
export type Side = 'T' | 'CT';
export type Site = 'A' | 'Mid' | 'B' | 'All';
export type MapId = 'mirage' | 'inferno' | 'dust2' | 'ancient' | 'anubis' | 'overpass' | 'nuke';
export type Theme = 'light' | 'dark' | 'system';

export type TagCategory = 'economy' | 'playstyle' | 'utility' | 'difficulty' | 'type';

export interface Tag {
  label: string;
  category: TagCategory;
  value?: string;
}

export interface MapInfo {
  id: MapId;
  name: string;
  enName: string;
}

export interface ImageAttachment {
  id: string;
  url: string;
  description?: string;
}

export interface Action {
  id: string;
  time?: string;
  who: string;   
  content: string;
  image?: string; // Deprecated, kept for backward compatibility
  images?: ImageAttachment[]; // New: Multiple images with descriptions
  type?: 'movement' | 'utility' | 'frag' | 'hold';
  utilityId?: string; // Link to a utility item
}

export interface LoadoutItem {
  role: string;
  equipment: string;
}

export interface TacticMetadata {
  author: string;
  lastUpdated: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
}

export interface Tactic {
  id: string;
  mapId: MapId;
  title: string;
  side: Side;
  site: Site;
  tags: Tag[];
  map_visual: string;
  loadout?: LoadoutItem[];
  actions: Action[];
  metadata: TacticMetadata;
  description?: string;
  isRecommended?: boolean; // New field for recommended tactics
  _isTemp?: boolean; // UI Flag: Indicates edited in current session (not saved to file)
  groupId?: string; // Runtime link to parent group
}

export interface UtilityMetadata {
  author?: string;
}

export type UtilityTolerance = 'easy' | 'medium' | 'hard' | 'pixel';

export interface Utility {
  id: string;
  mapId: MapId;
  side: Side;
  site: Site; 
  title: string;
  type: 'smoke' | 'flash' | 'molotov' | 'grenade';
  content: string;
  image?: string; // Deprecated
  images?: ImageAttachment[]; // New: Multiple images
  metadata?: UtilityMetadata;
  
  // New Fields
  tolerance?: UtilityTolerance; // 容错率
  seriesId?: string; // Links variations of the same utility (e.g. "mirage_window_smoke")
  variantLabel?: string; // Label for this specific variation (e.g. "From Spawn", "From Top Mid")
  
  _isTemp?: boolean; // UI Flag: Indicates edited in current session
  groupId?: string; // Runtime link to parent group
}

export interface GroupMetadata {
  id: string;       // Unique ID for the group (e.g. "local" or generated hash)
  name: string;     // Display name
  description: string;
  version: number;  // For update checking
  isReadOnly: boolean; // Imported packs are usually read-only
  author: string;
  lastUpdated: number; // Timestamp
}

export interface ContentGroup {
  metadata: GroupMetadata;
  tactics: Tactic[];
  utilities: Utility[];
  matches: Match[]; // Added Match support
  series?: MatchSeries[]; // Added Series support
}

export interface FilterState {
  searchQuery: string;
  site: Site | 'All';
  selectedTags: string[]; 
  timePhase?: 'early' | 'mid' | 'late';
  specificRole?: string;
  onlyRecommended?: boolean;
}

// Weaponry Types
export type WeaponCategory = 'pistol' | 'mid-tier' | 'rifle' | 'grenade' | 'gear';

export interface Weapon {
  id: string;
  name: string;
  category: WeaponCategory;
  price: number;
  killAward?: number;
  side: 'T' | 'CT' | 'Both';
  desc?: string;
}

export interface EconomyRule {
  title: string;
  values: { label: string; value: string }[];
}

// --- REVIEW / TBTV / Match Stats Types ---

export interface PlayerProfile {
    id: string;
    name: string;
    role: string;
    roleType: string;
}

export type Rank = string; // Flexible rank string (e.g., 'B+', 'S', 'A')

export interface DuelRecord {
    [opponentSteamId: string]: { kills: number; deaths: number };
}

export interface ClutchRecord {
    '1v1': { won: number; lost: number };
    '1v2': { won: number; lost: number };
    '1v3': { won: number; lost: number };
    '1v4': { won: number; lost: number };
    '1v5': { won: number; lost: number };
}

export interface ClutchAttempt {
    round: number;
    opponentCount: number; // 1vN
    result: 'won' | 'lost' | 'saved';
    kills: number; // Kills made during the clutch attempt
    side: Side;
}

export interface UtilityStats {
    smokesThrown: number;
    flashesThrown: number;
    enemiesBlinded: number;
    blindDuration: number; // seconds
    heThrown: number;
    heDamage: number;
    molotovsThrown: number;
    molotovDamage: number;
}

export interface MultiKillBreakdown {
    k2: number;
    k3: number;
    k4: number;
    k5: number;
}

// Detailed stats for a specific round for a player
export interface PlayerRoundStats {
    kills: number;
    deaths: number;
    assists: number;
    damage: number;
    headshot: boolean; // Died by HS or Got HS? Usually tracks if player got HS kills, or bool if simple per-kill
    headshots: number; // Number of HS kills this round
    
    // Rating 3.0 Components
    rating: number;
    impact: number;
    wpa: number; // Win Probability Added (New)
    
    // Mechanics
    isEntryKill: boolean;
    isEntryDeath: boolean;
    traded: boolean; // Killed someone and was traded
    wasTraded: boolean; // Died and was traded
    
    // Economy
    equipmentValue: number;
    remainingMoney?: number;
    
    // Objective
    planted: boolean;
    defused: boolean;
    
    // Utility
    utility: UtilityStats;
    utilityDamage: number;
    
    side: Side;
    survived: boolean;
}

// Timeline event within a round
export interface MatchTimelineEvent {
    tick: number;
    seconds: number; // Seconds from round start
    type: 'damage' | 'kill' | 'assist' | 'flash_assist' | 'plant' | 'defuse' | 'explode' | 'round_end';
    
    // Subject (Actor)
    subject?: { steamid: string; name: string; side: Side };
    
    // Target (Victim)
    target?: { steamid: string; name: string; side: Side };
    
    // Details
    weapon?: string;
    damage?: number;
    hitgroup?: number; // 1=Head, etc.
    blindDuration?: number;
    
    // Metadata
    isHeadshot?: boolean;
    isWallbang?: boolean;
    isBlind?: boolean;
    isSmoke?: boolean;
    
    // WPA
    winProb?: number; // T Win Probability after this event (0-1)
}

export interface MatchRound {
    roundNumber: number;
    winnerSide: Side;
    winReason: number; // CS GO/2 Reason ID
    duration: number; // Seconds
    endTick: number;
    
    // Detailed stats per player for this round
    playerStats: Record<string, PlayerRoundStats>;
    
    // Chronological events
    timeline: MatchTimelineEvent[];
}

export interface PlayerMatchStats {
    playerId: string;
    steamid?: string; // New: Link to demo data
    rank: Rank;
    kills: number;
    deaths: number;
    assists: number;
    adr: number;
    hsRate: number;
    rating: number; // Rating 3.0
    we: number; // Win Effect (Legacy)
    wpa: number; // Win Probability Added (New)
    
    // Detailed Stats from Demo
    total_damage?: number;
    utility_count?: number; // General counter
    flash_assists?: number;
    entry_kills: number;
    kast: number; // Percentage
    multikills: MultiKillBreakdown;
    
    // RATING 3.0 Internal Accumulators
    r3_wpa_accum?: number; // Total Win Probability Added (Internal)
    r3_impact_accum?: number; // Raw Impact score accumulator
    r3_econ_accum?: number; // Economy weighted score
    r3_rounds_played?: number;
    ratingHistory?: number[]; // Array of ratings per round

    // Advanced Stats
    duels: DuelRecord;
    utility: UtilityStats;
    clutches: ClutchRecord;
    clutchHistory: ClutchAttempt[]; // New detailed history
}

export interface MatchScore {
    us: number;
    them: number;
    half1_us: number;
    half1_them: number;
    half2_us: number;
    half2_them: number;
}

export interface Match {
    id: string;
    source: 'PWA' | 'Official' | 'Demo'; // Added Demo source
    date: string;
    mapId: string; // Changed from MapId to string to accommodate raw map names
    serverName?: string; // Server Name from Demo
    rank: string;
    result: 'WIN' | 'LOSS' | 'TIE';
    startingSide?: Side;
    score: MatchScore;
    teamNameUs?: string;
    teamNameThem?: string;
    players: PlayerMatchStats[];
    enemyPlayers: PlayerMatchStats[];
    groupId?: string; // Runtime link to parent group
    
    // NEW: Detailed Round History
    rounds?: MatchRound[]; 
}

// --- Series Support ---

export interface SeriesMatchRef {
    matchId: string;
    swapSides: boolean; // If true, in this match, "Us/Team A" is actually "Them/Team B" data
}

export interface MatchSeries {
    id: string;
    title: string; // e.g. "IEM Cologne Final vs G2"
    format: 'BO1' | 'BO3' | 'BO5' | 'BO7';
    matches: SeriesMatchRef[];
    date: string;
    groupId?: string;
}

// --- Demo JSON Specification Types ---

export interface DemoMeta {
    client_name: string;
    server_name?: string;
    map_name: string;
    game_directory?: string;
    // ... other meta fields
}

export interface DemoPlayer {
    steamid: number | string; // Can be big number or string
    name: string;
    team_number: number;
}

export interface DemoEventBase {
    event_name: string;
    tick: number;
}

export interface PlayerDeathEvent extends DemoEventBase {
    event_name: "player_death";
    
    attacker_name: string | null;
    attacker_steamid: number | string | null;
    
    user_name: string | null;
    user_steamid: number | string | null;
    
    assister_name: string | null;
    assister_steamid: number | string | null;
    
    assistedflash: boolean;
    weapon: string;
    headshot: boolean;
    dmg_health: number;
    dmg_armor: number;
    
    thrusmoke: boolean;
    penetrated: number; // number in provided JSON (0.0)
    noscope: boolean;
    attackerblind: boolean;
    
    round: number | null;
    wipe: number;
}

export interface ItemEvent extends DemoEventBase {
    event_name: "item_purchase" | "item_pickup" | "item_drop";
    user_steamid: number | string | null;
    user_name: string;
    item: string; // "weapon_ak47", "item_kevlar", etc.
}

export interface RoundEvent extends DemoEventBase {
    event_name: "round_start" | "round_end" | "round_freeze_end" | "round_announce_match_start";
    winner?: number;
    reason?: number;
}

export type DemoEvent = PlayerDeathEvent | ItemEvent | RoundEvent | DemoEventBase;

export interface DemoData {
    meta: DemoMeta;
    players: DemoPlayer[];
    events: DemoEvent[];
}