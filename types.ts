export type Side = 'T' | 'CT';
export type Site = 'A' | 'Mid' | 'B' | 'All';
export type MapId = 'mirage' | 'inferno' | 'dust2' | 'ancient' | 'anubis' | 'overpass' | 'nuke';
export type Theme = 'light' | 'dark' | 'system';

export type TagCategory = 'economy' | 'playstyle' | 'utility' | 'difficulty' | 'type'; // Added 'type' for Utility filters

export interface Tag {
  label: string;
  category: TagCategory;
  value?: string; // Optional value for mapping back to internal types (e.g., label "烟雾" -> value "smoke")
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