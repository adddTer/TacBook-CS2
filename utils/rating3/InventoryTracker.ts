import { WEAPON_VALUES, DISPLAY_NAME_TO_ID } from "./constants";

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
            // Prevent duplicate unique items
            // Primary/Secondary/Knife/Gear should be unique in inventory logic (mostly)
            // Grenades can stack (Flashbang x2)
            
            const isGrenade = ['flashbang', 'hegrenade', 'smokegrenade', 'molotov', 'incendiarygrenade', 'decoy'].includes(item);
            
            if (!isGrenade) {
                // For non-grenades, check if we already have it to avoid duplicates
                // (e.g. sometimes pickup fires multiple times or glitchy demo)
                if (!items.includes(item)) {
                    items.push(item);
                }
            } else {
                // Grenades stack, just push
                items.push(item);
            }
        } else if (event.event_name === "item_drop") {
            const idx = items.indexOf(item);
            if (idx > -1) items.splice(idx, 1);
        }
    }

    public calculateValue(sid: string): number {
        const items = this.inventory.get(String(sid));
        if (!items) return 0; // No items = 0 value (default pistol doesn't count)

        let value = 0;
        
        items.forEach(item => {
            // Exclude default pistols from value calculation as per user request
            if (['glock', 'hkp2000', 'usp_silencer'].includes(item)) {
                return;
            }

            if (WEAPON_VALUES[item]) {
                value += WEAPON_VALUES[item];
            }
        });

        // Removed the < 200 check to allow 0 value (eco rounds)
        
        return value;
    }
    
    public hasKit(sid: string): boolean {
        const items = this.inventory.get(String(sid));
        return items ? items.includes("defuser") : false;
    }

    public getTrackedIds(): string[] {
        return Array.from(this.inventory.keys());
    }
}