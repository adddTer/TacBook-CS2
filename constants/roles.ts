export const ROLES_T = [
  "突破手",
  "补枪辅助",
  "道具辅助",
  "狙击手",
  "自由人"
];

export const ROLES_CT_MIRAGE = [
  "主A",
  "主B",
  "拱门",
  "VIP",
  "B小"
];

export const ROLES_CT_GENERAL = [
  "主A",
  "主B",
  "辅助A",
  "辅助B",
  "中路"
];

// Helper to get roles based on map and side
export const getRoles = (side: 'T' | 'CT', mapId: string) => {
  if (side === 'T') return ROLES_T;
  if (side === 'CT') {
    if (mapId === 'mirage') return ROLES_CT_MIRAGE;
    return ROLES_CT_GENERAL;
  }
  return [];
};
