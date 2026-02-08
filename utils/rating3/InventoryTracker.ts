
import { WEAPON_VALUES } from "./constants";

export class InventoryTracker {
    // SteamID -> List of item names
    private inventory: Map<string, string[]> = new Map();

    public reset() {
        this.inventory.clear();
    }

    // Called at round start
    public handleRoundStart(survivingSteamIds: Set<string>, isSideSwitch: boolean) {
        if (isSideSwitch) {
            this.inventory.clear();
            return;
        }

        // Survivors keep gear, dead players reset to default pistol ($200 value implicitly assumed base)
        const allIds = Array.from(this.inventory.keys());
        allIds.forEach(sid => {
            if (!survivingSteamIds.has(sid)) {
                this.inventory.set(sid, []); // Clear dead player
            }
            // Survivors: do nothing, they keep items
        });
    }

    public handleItemEvent(event: any) {
        // 1. Resolve SteamID securely
        let rawSid = event.user_steamid;
        if (!rawSid || rawSid === "0") {
             // Fallback: item_purchase often uses 'steamid' instead of 'user_steamid'
             rawSid = event.steamid; 
        }
        
        // If still invalid or BOT, ignore
        if (!rawSid || rawSid === "0" || rawSid === "BOT") return;
        const sid = String(rawSid);

        // 2. Resolve Item Name securely
        // Fix: item_purchase can have null 'item'. We skip it if null, 
        // relying on the subsequent 'item_pickup' event to track the inventory.
        let rawItem = event.item;
        
        if (!rawItem || typeof rawItem !== 'string') return; 

        const item = rawItem.replace("weapon_", "").replace("item_", "");
        
        if (!this.inventory.has(sid)) this.inventory.set(sid, []);
        const items = this.inventory.get(sid)!;

        if (event.event_name === "item_pickup" || event.event_name === "item_purchase") {
            // Simple push. CS inventory logic is complex (slots etc), but approximate value tracking is enough for Rating 3.0
            items.push(item);
        } else if (event.event_name === "item_drop") {
            const idx = items.indexOf(item);
            if (idx > -1) items.splice(idx, 1);
        }
    }

    public getLoadoutValue(sid: string): number {
        const items = this.inventory.get(String(sid));
        if (!items) return 200; // Default pistol value

        let value = 0;
        let hasPistol = false;
        
        items.forEach(item => {
            if (WEAPON_VALUES[item]) {
                value += WEAPON_VALUES[item];
            }
            // Heuristic for pistol check
            if (['glock','hkp2000','usp_silencer','p250','deagle','cz75a','tec9','fiveseven'].includes(item)) {
                hasPistol = true;
            }
        });

        // Add base pistol value if they likely spawned with one and didn't drop it (simplified)
        if (value < 200) value = 200;
        
        return value;
    }
}
