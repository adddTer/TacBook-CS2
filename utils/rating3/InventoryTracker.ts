
import { WEAPON_VALUES } from "./constants";

export class InventoryTracker {
    // SteamID -> List of item names
    private inventory: Map<string, string[]> = new Map();
    
    // Snapshots for Rating 4.0
    // SteamID -> Value at round start (FreezeTime End)
    private startValues: Map<string, number> = new Map();
    // SteamID -> Value at round end (RoundEnd event)
    private endValues: Map<string, number> = new Map();

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
        
        if (!rawSid || rawSid === "0" || rawSid === "BOT") return;
        const sid = String(rawSid);

        // 2. Resolve Item Name securely
        let rawItem = event.item;
        
        if (!rawItem || typeof rawItem !== 'string') return; 

        const item = rawItem.replace("weapon_", "").replace("item_", "");
        
        if (!this.inventory.has(sid)) this.inventory.set(sid, []);
        const items = this.inventory.get(sid)!;

        if (event.event_name === "item_pickup" || event.event_name === "item_purchase") {
            // Avoid duplicate primary weapons if logic isn't perfect, but CS inventory is limited anyway
            // Simple push for now.
            items.push(item);
        } else if (event.event_name === "item_drop") {
            const idx = items.indexOf(item);
            if (idx > -1) items.splice(idx, 1);
        }
    }

    public calculateValue(sid: string): number {
        const items = this.inventory.get(String(sid));
        if (!items) return 200; // Default glock/usp value assumption

        let value = 0;
        let hasPistol = false;
        
        items.forEach(item => {
            if (WEAPON_VALUES[item]) {
                value += WEAPON_VALUES[item];
                // Check if it's a pistol to avoid double counting default pistol if purchased one
                if (['glock', 'hkp2000', 'usp_silencer'].includes(item)) hasPistol = true;
            }
        });

        // Basic correction: If value is 0, they probably have a default pistol that wasn't picked up explicitly
        // (spawned with). But to be safe, we assume min 200 if alive.
        if (value < 200) value = 200;
        
        return value;
    }

    public getTrackedIds(): string[] {
        return Array.from(this.inventory.keys());
    }
}
