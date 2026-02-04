
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

// --- TBTV Types ---

export type RosterPlayerId = 'Ser1EN' | 'Sanatio' | 'FuNct1on' | 'F1oyd' | 'addd';
// Added ++ ranks for Gold styling
export type Rank = 'S' | 'A++' | 'A+' | 'A' | 'A-' | 'B++' | 'B+' | 'B' | 'B-' | 'C++' | 'C+' | 'C' | 'C-' | 'D' | '?' ;

export interface PlayerProfile {
  id: RosterPlayerId;
  name: string;
  role: string;
  roleType: string; // Internal mapping for tactic logic
  avatar?: string;
}

export interface PlayerMatchStats {
  playerId: string; // Changed from PlayerId to string to accommodate enemies
  rank: Rank;
  kills: number;
  deaths: number;
  assists: number;
  adr: number;
  hsRate: number; // percentage 0-100
  rating: number; // HLTV 2.0
  we: number; // Win Effect
}

export interface Match {
  id: string;
  source: 'PWA' | 'Official'; // PWA = Perfect World, Official = Valve Matchmaking
  date: string; // ISO string (Time included)
  mapId: MapId;
  rank: Rank; // Lobby average rank
  result: 'WIN' | 'LOSS' | 'DRAW';
  startingSide: Side; // To color code halftime scores
  score: {
      us: number;
      them: number;
      half1_us: number;
      half1_them: number;
      half2_us: number;
      half2_them: number;
  };
  players: PlayerMatchStats[]; // Our Team
  enemyPlayers: PlayerMatchStats[]; // Opponent Team
}
