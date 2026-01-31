
import { Tactic } from '../types';
import { mirageTactics } from './tactics/mirage';

// Export aggregated tactics
export const ALL_TACTICS: Tactic[] = [
  ...mirageTactics,
];
