
export class HealthTracker {
    private healths: Map<string, number> = new Map();

    /**
     * Resets all player healths to 100 (e.g. at round start).
     */
    public reset() {
        this.healths.clear();
    }

    /**
     * Gets current health of a player. Defaults to 100 if not tracked yet.
     */
    public getHealth(sid: string): number {
        return this.healths.has(sid) ? this.healths.get(sid)! : 100;
    }

    /**
     * Records damage dealt to a player and returns the actual damage applied (capped at current HP).
     * @param vicSid Victim SteamID
     * @param rawDmg Raw damage from event (dmg_health)
     */
    public recordDamage(vicSid: string, rawDmg: number): number {
        const currentHp = this.getHealth(vicSid);
        const actualDmg = Math.min(currentHp, rawDmg);
        // Ensure HP doesn't go below 0 (though math handles it, setter logic keeps it clean)
        this.healths.set(vicSid, Math.max(0, currentHp - actualDmg));
        return actualDmg;
    }
}
