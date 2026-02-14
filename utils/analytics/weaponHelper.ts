
/**
 * Helper utility to categorize weapons.
 * Handles cleaning of weapon names to account for skins or extra prefixes.
 */

const SNIPER_WEAPONS = ['awp', 'ssg08', 'scar20', 'g3sg1'];
const UTILITY_DAMAGE_SOURCES = ['hegrenade', 'molotov', 'incendiary', 'inferno'];

export const isSniperWeapon = (weaponName?: string): boolean => {
    if (!weaponName) return false;
    const cleanName = weaponName.toLowerCase().replace(/^weapon_/, '');
    return SNIPER_WEAPONS.some(w => cleanName.includes(w));
};

export const isUtilityDamageWeapon = (weaponName?: string): boolean => {
    if (!weaponName) return false;
    const cleanName = weaponName.toLowerCase().replace(/^weapon_/, '');
    // 'inferno' is often the weapon name for molotov damage in demo parsers
    return UTILITY_DAMAGE_SOURCES.some(w => cleanName.includes(w));
};
