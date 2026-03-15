
import { ROSTER } from "../../constants/roster";

export const normalizeSteamId = (id: string | number | null | undefined): string => {
    if (id === null || id === undefined || id === 0 || id === "0" || id === "BOT") return "BOT";
    const str = String(id).trim();
    
    // Handle SteamID3 format like [U:1:12345678]
    if (str.startsWith('[U:')) {
        const parts = str.split(':');
        if (parts.length >= 3) {
            const accountId = parseInt(parts[2].replace(']', ''), 10);
            const base = BigInt('76561197960265728');
            return (base + BigInt(accountId)).toString();
        }
    }
    
    // Handle 32-bit account IDs (usually less than 16 digits)
    if (/^\d+$/.test(str) && str.length < 16) {
        const accountId = parseInt(str, 10);
        const base = BigInt('76561197960265728');
        return (base + BigInt(accountId)).toString();
    }
    
    return str;
};

export const WEAPON_SIDE_MAP: Record<string, 'T' | 'CT'> = {
    'glock': 'T', 'ak47': 'T', 'galilar': 'T', 'sg553': 'T', 'tec9': 'T', 'mac10': 'T', 'molotov': 'T', 'g3sg1': 'T',
    'usp_silencer': 'CT', 'hkp2000': 'CT', 'm4a1': 'CT', 'm4a1_silencer': 'CT', 'm4a4': 'CT', 'famas': 'CT', 'aug': 'CT', 'fiveseven': 'CT', 'mp9': 'CT', 'incendiary': 'CT', 'scar20': 'CT'
};

export const resolveName = (rawName: string | null | undefined): string => {
    if (!rawName) return "Unknown";
    const clean = String(rawName).replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    
    const rosterMatch = ROSTER.find(r => {
        if (r.id === clean || r.name === clean) return true;
        
        let isMatch = r.steamids?.includes(clean) || 
            (clean.endsWith('00') && r.steamids?.some(id => id.startsWith(clean.slice(0, -2))));
            
        if (!isMatch && /^\d+$/.test(clean) && clean.length < 16) {
            const accountId = parseInt(clean, 10);
            const base = BigInt('76561197960265728');
            const convertedId = (base + BigInt(accountId)).toString();
            isMatch = r.steamids?.includes(convertedId);
        }
        
        return isMatch;
    });
    
    if (rosterMatch) return rosterMatch.id;
    return clean;
};
