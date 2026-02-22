
import { ROSTER } from "../../constants/roster";

export const normalizeSteamId = (id: string | number | null | undefined): string => {
    if (id === null || id === undefined || id === 0 || id === "0" || id === "BOT") return "BOT";
    return String(id).trim();
};

export const NAME_ALIASES: Record<string, string> = {
    'forsakenN': 'F1oyd',
    '冥医': 'Sanatio',
    'addd_233': 'addd',
    '𝐚𝐝𝐝𝐝': 'addd',
    'Ser1EN': 'Ser1EN',
    'ClayDEN': 'Ser1EN', 
    'FuNct1on': 'FuNct1on',
    'R\u2061\u2061\u2061ain\u2061\u2061\u2061\u2061\u2061': 'Rain' 
};

export const WEAPON_SIDE_MAP: Record<string, 'T' | 'CT'> = {
    'glock': 'T', 'ak47': 'T', 'galilar': 'T', 'sg553': 'T', 'tec9': 'T', 'mac10': 'T', 'molotov': 'T', 'g3sg1': 'T',
    'usp_silencer': 'CT', 'hkp2000': 'CT', 'm4a1': 'CT', 'm4a1_silencer': 'CT', 'm4a4': 'CT', 'famas': 'CT', 'aug': 'CT', 'fiveseven': 'CT', 'mp9': 'CT', 'incendiary': 'CT', 'scar20': 'CT'
};

export const resolveName = (rawName: string | null | undefined): string => {
    if (!rawName) return "Unknown";
    if (typeof rawName !== 'string') return String(rawName);
    const clean = rawName.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    if (NAME_ALIASES[clean]) return NAME_ALIASES[clean];
    const rosterMatch = ROSTER.find(r => r.id.toLowerCase() === clean.toLowerCase() || r.name.toLowerCase() === clean.toLowerCase());
    if (rosterMatch) return rosterMatch.id;
    return clean;
};
