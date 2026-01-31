import { Tag } from '../types';

export const TAGS: Record<string, Tag> = {
  PISTOL: { label: '手枪局', category: 'economy' },
  BUY: { label: '长枪局', category: 'economy' },
  ECO: { label: 'ECO局', category: 'economy' },
  FORCE: { label: '强起局', category: 'economy' },
  
  RUSH: { label: '快攻', category: 'playstyle' },
  DEFAULT: { label: '默认', category: 'playstyle' },
  MAP_CONTROL: { label: '控图', category: 'playstyle' },
  SLOW: { label: '慢打', category: 'playstyle' },
  GAMBLE: { label: '赌点', category: 'playstyle' },
  STANDARD: { label: '标准', category: 'playstyle' },
  
  EXEC: { label: '爆弹', category: 'utility' },
};

export const ALL_TAGS = Object.values(TAGS);