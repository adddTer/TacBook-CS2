
import { Utility } from '../types';

// Existing utilities cleared for new grouping system.
// Initial data will be managed via the "Local" group or imports.

const LOCAL_UTILITIES: Utility[] = [];

export const loadAllUtilities = async (): Promise<Utility[]> => {
  return [...LOCAL_UTILITIES];
};

export const UTILITIES: Utility[] = [...LOCAL_UTILITIES];
