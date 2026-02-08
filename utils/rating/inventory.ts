
import { WEAPON_PRICES } from "./constants";

export class InventoryManager {
    // Map<SteamID, List of Item Strings>
    private inventories: Map<string, string[]>;

    constructor() {
        this.inventories = new Map();
    }

    public reset() {
        this.inventories.clear();
    }

    // Usually called at round start if we want to ensure clean slate, 
    // but in CS, items carry over. However, dead players lose items.
    // We will clear dead players externally.
    public clearPlayer(steamid: string) {
        this.inventories.set(steamid, []);
    }

    public addItem(steamid: string, item: string) {
        const rawItem = item.replace("weapon_", "").replace("item_", "");
        if (!this.inventories.has(steamid)) {
            this.inventories.set(steamid, []);
        }
        this.inventories.get(steamid)!.push(rawItem);
    }

    public removeItem(steamid: string, item: string) {
        const rawItem = item.replace("weapon_", "").replace("item_", "");
        if (!this.inventories.has(steamid)) return;
        
        const list = this.inventories.get(steamid)!;
        const index = list.indexOf(rawItem);
        if (index > -1) {
            list.splice(index, 1);
        }
    }

    public getPlayerLoadoutValue(steamid: string): number {
        if (!this.inventories.has(steamid)) return 0;
        
        const items = this.inventories.get(steamid)!;
        let value = 0;
        
        // Handle Armor Logic: Vest + Helm is one item in inventory usually?
        // JSON usually gives "item_kevlar" then "item_assaultsuit". 
        // We sum all.
        
        items.forEach(item => {
            if (WEAPON_PRICES[item]) {
                value += WEAPON_PRICES[item];
            } else {
                // Approximate fallback for grenades not in list or knife
                if (item.includes("grenade") || item.includes("flash") || item.includes("smoke") || item.includes("molotov")) {
                    value += 300; 
                }
            }
        });

        // Base value (Glock/USP is free but has value if we consider impact, 
        // but Economy rating focuses on *Investment*. Free items = 0 investment).
        // Rating 3.0 considers "Value destroyed". Destroying a Glock is 200.
        // But players spawn with them.
        // Simplified: Add default pistol value if no pistol present? 
        // No, rely on purchase/pickup events. If they didn't buy/pickup, it's default (0 cost).
        
        return value;
    }
}
