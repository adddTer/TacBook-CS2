
import { Tactic } from '../types';
import { mirageTactics } from './tactics_mirage';

// Only exporting Mirage tactics as requested to replace all existing ones
export const ALL_TACTICS: Tactic[] = [
  ...mirageTactics,
];
