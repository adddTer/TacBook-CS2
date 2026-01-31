import { Tactic } from '../types';
import { mirageMidTactics } from './tactics/mirage_pistol_mid';
import { mirageATactics } from './tactics/mirage_pistol_a';
import { mirageCustomTactics } from './tactics/mirage_custom';

let localTactics: Tactic[] = [];

try {
  // Check if import.meta.glob is defined before calling it.
  // In a proper Vite build, this is replaced by the file list.
  // In a native browser environment, this property is undefined.
  if ((import.meta as any).glob) {
    const localFiles = (import.meta as any).glob('./local/*.json', { eager: true });
    localTactics = Object.values(localFiles).map((mod: any) => {
      return mod.default || mod;
    });
  }
} catch (e) {
  console.warn("Auto-loading of local tactics skipped (feature requires Vite).");
}

// Export aggregated tactics
export const ALL_TACTICS: Tactic[] = [
  ...mirageMidTactics,
  ...mirageATactics,
  ...mirageCustomTactics,
  ...localTactics
];