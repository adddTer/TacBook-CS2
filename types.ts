
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

export interface Action {
  id: string;
  time?: string;
  who: string;   
  content: string;
  image?: string;
  type?: 'movement' | 'utility' | 'frag' | 'hold';
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
  loadout?: LoadoutItem[]; // New field for equipment distribution
  actions: Action[];
  metadata: TacticMetadata;
  description?: string;
}

export interface UtilityMetadata {
  author?: string;
}

export interface Utility {
  id: string;
  mapId: MapId;
  side: Side;
  site: Site; 
  title: string;
  type: 'smoke' | 'flash' | 'molotov' | 'grenade';
  content: string;
  image?: string;
  metadata?: UtilityMetadata;
}

export interface FilterState {
  searchQuery: string;
  site: Site | 'All';
  selectedTags: string[]; 
  timePhase?: 'early' | 'mid' | 'late';
  specificRole?: string;
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
