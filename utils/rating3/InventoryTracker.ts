import { WEAPON_VALUES, DISPLAY_NAME_TO_ID } from "./constants";

const SLOT_MAP: Record<string, string> = {
    // Pistols (Secondary)
    'glock': 'secondary', 'hkp2000': 'secondary', 'usp_silencer': 'secondary', 'p250': 'secondary',
    'cz75a': 'secondary', 'tec9': 'secondary', 'fiveseven': 'secondary', 'deagle': 'secondary', 
    'revolver': 'secondary', 'elite': 'secondary',
    
    // SMGs (Primary)
    'mac10': 'primary', 'mp9': 'primary', 'ump45': 'primary', 
    'mp7': 'primary', 'mp5sd': 'primary', 'bizon': 'primary', 'p90': 'primary',
    
    // Rifles (Primary)
    'galilar': 'primary', 'famas': 'primary', 'ak47': 'primary', 
    'm4a1': 'primary', 'm4a4': 'primary', 'm4a1_silencer': 'primary',
    'ssg08': 'primary', 'awp': 'primary', 'aug': 'primary', 'sg553': 'primary', 
    'scar20': 'primary', 'g3sg1': 'primary',
    
    // Heavy (Primary)
    'nova': 'primary', 'xm1014': 'primary', 'sawedoff': 'primary', 
    'mag7': 'primary', 'm249': 'primary', 'negev': 'primary',

    // Gear
    'vest': 'armor', 'vesthelm': 'armor',
    'defuser': 'kit', 'taser': 'taser'
};

export class InventoryTracker {
    // SteamID -> List of item names
    private inventory: Map<string, string[]> = new Map();
    
    // Snapshots for Rating 4.0
    // SteamID -> Value at round start (FreezeTime End)
    private startValues: Map<string, number> = new Map();
    // SteamID -> Value at round end (RoundEnd event)
    private endValues: Map<string, number> = new Map();

    private normalizeId(id: string | number | null | undefined): string {
        if (id === null || id === undefined || id === 0 || id === "0" || id === "BOT") return "BOT";
        return String(id).trim();
    }

    public reset() {
        this.inventory.clear();
        this.startValues.clear();
        this.endValues.clear();
    }

    // Called at round_freeze_end
    public snapshotRoundStart(activeSteamIds: string[]) {
        this.startValues.clear();
        activeSteamIds.forEach(sid => {
            this.startValues.set(sid, this.calculateValue(sid));
        });
    }

    // Called at round_end
    public snapshotRoundEnd(activeSteamIds: string[]) {
        this.endValues.clear();
        activeSteamIds.forEach(sid => {
            this.endValues.set(sid, this.calculateValue(sid));
        });
    }

    public getStartValue(sid: string): number {
        return this.startValues.get(sid) || 0;
    }
    
    public getEndValue(sid: string): number {
        return this.endValues.get(sid) || 0;
    }

    public getCurrentValue(sid: string): number {
        return this.calculateValue(sid);
    }

    public handlePlayerDeath(sid: string) {
        // When a player dies, they lose their inventory.
        // We clear it so subsequent snapshots (if death happens after round end) are accurate (0 value).
        this.inventory.set(sid, []);
    }

    // Called at round start (cleaning dead players logic moved here for safety)
    public handleRoundStartReset(survivingSteamIds: Set<string>, isSideSwitch: boolean) {
        if (isSideSwitch) {
            this.inventory.clear();
            this.startValues.clear();
            this.endValues.clear();
            return;
        }

        const allIds = Array.from(this.inventory.keys());
        allIds.forEach(sid => {
            if (!survivingSteamIds.has(sid)) {
                this.inventory.set(sid, []); // Clear dead player
            }
        });
    }

    public handleItemEvent(event: any) {
        // 1. Resolve SteamID securely
        let rawSid = event.user_steamid;
        if (!rawSid || rawSid === "0") {
             rawSid = event.steamid; 
        }
        
        const sid = this.normalizeId(rawSid);
        if (sid === "BOT") return;

        // 2. Resolve Item Name securely
        let rawItem = event.item;
        
        // FIX: If raw item is null/empty but we have a display name, try to map it
        if ((!rawItem || rawItem === null) && event.item_name) {
            rawItem = DISPLAY_NAME_TO_ID[event.item_name];
        }
        
        if (!rawItem || typeof rawItem !== 'string') return; 

        const item = rawItem.replace("weapon_", "").replace("item_", "");
        
        if (!this.inventory.has(sid)) this.inventory.set(sid, []);
        const items = this.inventory.get(sid)!;

        // FIX: Ignore item_purchase to prevent double counting with item_pickup
        // Only track actual inventory changes via pickup/drop
        if (event.event_name === "item_pickup") {
            const slot = SLOT_MAP[item];

            if (slot) {
                // Enforce Slot Limits
                if (slot === 'primary' || slot === 'secondary' || slot === 'armor' || slot === 'kit' || slot === 'taser') {
                    // Remove existing item in the same slot
                    for (let i = items.length - 1; i >= 0; i--) {
                        const existingItem = items[i];
                        const existingSlot = SLOT_MAP[existingItem];
                        if (existingSlot === slot) {
                            items.splice(i, 1);
                        }
                    }
                }
            }

            // Grenades can stack, but let's prevent duplicates of the EXACT same grenade type if it's a parser glitch
            // Actually, you can have 2 flashes. But you can't have 2 smokes (usually).
            // For simplicity, we allow grenade stacking but maybe limit count?
            // Let's just trust the parser for grenades, but enforce uniqueness for guns/gear.
            
            const isGrenade = ['flashbang', 'hegrenade', 'smokegrenade', 'molotov', 'incendiarygrenade', 'decoy'].includes(item);
            
            if (!isGrenade) {
                if (!items.includes(item)) {
                    items.push(item);
                }
            } else {
                items.push(item);
            }

        } else if (event.event_name === "item_drop") {
            const idx = items.indexOf(item);
            if (idx > -1) items.splice(idx, 1);
        }
    }

    public getMostExpensiveWeapon(sid: string): string | undefined {
        const items = this.inventory.get(String(sid));
        if (!items) return undefined;

        let maxWeaponValue = 0;
        let maxWeapon: string | undefined = undefined;

        items.forEach(item => {
            if (['kevlar', 'assaultsuit', 'vest', 'vesthelm', 'defuser', 'taser'].includes(item)) {
                return;
            }
            const itemValue = WEAPON_VALUES[item] || 0;
            if (itemValue > maxWeaponValue) {
                maxWeaponValue = itemValue;
                maxWeapon = item;
            }
        });

        return maxWeapon;
    }

    public calculateValue(sid: string): number {
        const items = this.inventory.get(String(sid));
        if (!items) return 0; // No items = 0 value (default pistol doesn't count)

        let armorValue = 0;
        let maxWeaponValue = 0;
        
        items.forEach(item => {
            // Exclude default pistols from value calculation as per user request
            if (['glock', 'hkp2000', 'usp_silencer'].includes(item)) {
                return;
            }

            const itemValue = WEAPON_VALUES[item] || 0;

            if (item === 'kevlar' || item === 'assaultsuit' || item === 'vest' || item === 'vesthelm') {
                armorValue = Math.max(armorValue, itemValue);
            } else {
                // Assume everything else is a weapon/utility. We only want the most expensive one.
                // Wait, the user said "最多计算一把". So we find the max value among non-armor items.
                maxWeaponValue = Math.max(maxWeaponValue, itemValue);
            }
        });

        return armorValue + maxWeaponValue;
    }
    
    public hasKit(sid: string): boolean {
        const items = this.inventory.get(String(sid));
        return items ? items.includes("defuser") : false;
    }

    // Force remove illegal items for pistol rounds (Anti-Bug)
    public sanitizePistolRound() {
        this.inventory.forEach((items, sid) => {
            // Filter out items that are strictly impossible in pistol rounds (Value > 800 or Primary Weapons)
            // Exception: We allow stacking grenades/armor within $800 limit, but here we just kill heavy guns.
            const validItems = items.filter(item => {
                const val = WEAPON_VALUES[item] || 0;
                // Allow pistols, grenades, gear. Disallow SMG, Rifle, Heavy.
                // Simple heuristic: Value > 800 is definitely illegal for R1 start (except maybe armor+helm=1000? No, max start is 800).
                // Wait, Armor+Helm is 1000. In casual it's possible, but in Comp start money is 800.
                // Let's be safe: Remove anything > 800.
                // Actually, just remove primaries.
                
                // Check if it's a primary weapon
                const isPrimary = [
                    'mac10', 'mp9', 'ump45', 'mp7', 'mp5sd', 'bizon', 'p90',
                    'galilar', 'famas', 'ak47', 'm4a1', 'm4a4', 'm4a1_silencer',
                    'ssg08', 'awp', 'aug', 'sg553', 'scar20', 'g3sg1',
                    'nova', 'xm1014', 'sawedoff', 'mag7', 'm249', 'negev'
                ].includes(item);

                if (isPrimary) return false;
                if (val > 800) return false; // Kevlar+Helm (1000) is impossible in pistol round
                return true;
            });
            this.inventory.set(sid, validItems);
        });
    }

    public getTrackedIds(): string[] {
        return Array.from(this.inventory.keys());
    }
}