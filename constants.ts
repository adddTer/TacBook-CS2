import { Tactic, MapInfo, Tag } from './types';

export const MAPS: MapInfo[] = [
  { id: 'mirage', name: '荒漠迷城', enName: 'Mirage' },
  { id: 'inferno', name: '炼狱小镇', enName: 'Inferno' },
  { id: 'dust2', name: '炙热沙城2', enName: 'Dust 2' },
  { id: 'ancient', name: '远古遗迹', enName: 'Ancient' },
  { id: 'anubis', name: '阿努比斯', enName: 'Anubis' },
  { id: 'overpass', name: '死亡游乐园', enName: 'Overpass' },
  { id: 'nuke', name: '核子危机', enName: 'Nuke' },
];

export const TACTICS: Tactic[] = []; // Base tactics array, populated by data files
