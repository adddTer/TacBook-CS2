
import { Tactic } from '../types';
import { mirageMidTactics } from './tactics/mirage_pistol_mid';
import { mirageATactics } from './tactics/mirage_pistol_a';

// Export aggregated tactics
export const ALL_TACTICS: Tactic[] = [
  ...mirageMidTactics,
  ...mirageATactics,
];
