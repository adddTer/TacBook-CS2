
import { PlayerMatchStats } from "../../types";
import { WIN_PROB_MATRIX, WEAPON_VALUES } from "./constants";
import { InventoryTracker } from "./InventoryTracker";
import { HealthTracker } from "./HealthTracker";

// Helper for normalizing IDs
const normalizeId = (id: string | number | null | undefined): string => {
    if (id === null || id === undefined || id === 0 || id === "0" || id === "BOT") return "BOT";
    return String(id).trim();
};

export interface RoundContext {
    kills: number;
    deaths: number;
    assists: number; // Added assists
    damage: number;
    survived: boolean;
    isEntryKill: boolean;
    isEntryDeath: boolean;
    traded: boolean;
    wasTraded: boolean;
    tradeBonus: number;
    tradePenalty: number;
    impactPoints: number;
    killValue: number; // For Econ Rating
    rating: number; // Calculated at end of round
}

export class RatingEngine {
    private inventory = new InventoryTracker();
    private health = new HealthTracker();
    private roundStats = new Map<string, RoundContext>();
    private recentDeaths: { victim: string, killer: string, tick: number }[] = [];
    
    // AttackerID -> VictimID -> DamageDealt
    private damageGraph = new Map<string, Map<string, number>>();
    private firstKillHappened = false;
    
    // Accumulators: SteamID -> { sumRating, rounds, impactSum }
    private playerRatings = new Map<string, { sumRating: number, rounds: number, impactSum: number }>();

    public getOrInitState(sid: string) {
        if (!this.playerRatings.has(sid)) {
            this.playerRatings.set(sid, { sumRating: 0, rounds: 0, impactSum: 0 });
        }
    }

    private getRoundStats(sid: string): RoundContext {
        if (!this.roundStats.has(sid)) {
            this.roundStats.set(sid, {
                kills: 0, deaths: 0, assists: 0, damage: 0, survived: true,
                isEntryKill: false, isEntryDeath: false,
                traded: false, wasTraded: false,
                tradeBonus: 0, tradePenalty: 0, 
                impactPoints: 0, killValue: 0, rating: 0
            });
        }
        return this.roundStats.get(sid)!;
    }

    // Accessor for the parser to retrieve calculated stats before reset
    public getCurrentRoundContext(sid: string): RoundContext | undefined {
        return this.roundStats.get(sid);
    }
    
    public getInventoryValue(sid: string, type: 'start' | 'end'): number {
        return type === 'start' ? this.inventory.getStartValue(sid) : this.inventory.getEndValue(sid);
    }

    public handleEvent(event: any, currentRound: number, teammateSteamIds: Set<string>) {
        const type = event.event_name;
        const tick = event.tick || 0;

        if (['item_pickup', 'item_drop', 'item_purchase'].includes(type)) {
            this.inventory.handleItemEvent(event);
        }

        if (type === 'round_start' || type === 'round_freeze_end' || type === 'round_announce_match_start') {
            if (type === 'round_announce_match_start') {
                this.playerRatings.clear();
            }
            // Reset Round State
            this.roundStats.clear();
            this.recentDeaths = [];
            this.damageGraph.clear();
            this.health.reset();
            this.firstKillHappened = false;
            
            // Snapshot Economy at start
            const activeIds = Array.from(this.playerRatings.keys());
            this.inventory.snapshotRoundStart(activeIds);
            return;
        }

        if (type === 'player_hurt') {
            const att = normalizeId(event.attacker_steamid);
            const vic = normalizeId(event.user_steamid);
            const rawDmg = parseInt(event.dmg_health || 0);
            
            // Track actual damage (capped at HP)
            const actualDmg = this.health.recordDamage(vic, rawDmg);

            if (att !== "BOT" && vic !== "BOT" && att !== vic && att !== "0") {
                // Record Damage for Stats
                const stats = this.getRoundStats(att);
                stats.damage += actualDmg;

                // Record Damage for Trade Logic
                if (!this.damageGraph.has(att)) this.damageGraph.set(att, new Map());
                const vMap = this.damageGraph.get(att)!;
                vMap.set(vic, (vMap.get(vic) || 0) + actualDmg);
            }
        }

        if (type === 'player_death') {
            const att = normalizeId(event.attacker_steamid);
            const vic = normalizeId(event.user_steamid);
            const ast = normalizeId(event.assister_steamid);
            
            this.inventory.handlePlayerDeath(vic);
            const vicStats = this.getRoundStats(vic);
            vicStats.deaths++;
            vicStats.survived = false;
            
            if (!this.firstKillHappened) {
                vicStats.isEntryDeath = true;
            }

            if (att !== "BOT" && att !== vic && att !== "0") {
                const attStats = this.getRoundStats(att);
                attStats.kills++;
                // Track economy value killed
                attStats.killValue += this.inventory.getStartValue(vic);

                if (!this.firstKillHappened) {
                    attStats.isEntryKill = true;
                    this.firstKillHappened = true;
                }

                // --- Dynamic Trade Logic ---
                const TRADE_WINDOW_TICKS = 256; // ~4s (64 tick)
                
                // Find if the current victim killed a teammate of the attacker recently
                const avengedDeath = this.recentDeaths.find(d => 
                    d.killer === vic && (tick - d.tick) <= TRADE_WINDOW_TICKS
                );

                if (avengedDeath) {
                    const teammateId = avengedDeath.victim;
                    const tickDiff = tick - avengedDeath.tick;
                    
                    // Mark flags
                    attStats.traded = true;
                    const mateStats = this.getRoundStats(teammateId);
                    mateStats.wasTraded = true;

                    // Calculate Trade Factor
                    const damageToEnemy = this.damageGraph.get(teammateId)?.get(vic) || 0;
                    const cappedDmg = Math.min(damageToEnemy, 100);

                    // 1. Bonus for Entry/Victim
                    const timeFactor = Math.max(0, 1.0 - (tickDiff / TRADE_WINDOW_TICKS));
                    const entryBonus = (cappedDmg / 100.0) * 0.20 * timeFactor;
                    mateStats.tradeBonus += entryBonus;

                    // 2. Penalty for Trader (Attacker)
                    const tradePenalty = (cappedDmg / 100.0) * 0.15;
                    attStats.tradePenalty += tradePenalty;
                }
            }
            
            // Handle Assists
            if (ast !== "BOT" && ast !== vic && ast !== att && ast !== "0") {
                const astStats = this.getRoundStats(ast);
                astStats.assists++;
            }
            
            this.recentDeaths.push({ victim: vic, killer: att, tick });
        }
    }

    /**
     * Must be called explicitly by the parser when the round is fully over (post-garbage time).
     * @param activeSteamIds List of all players currently in the match
     */
    public finalizeRound(activeSteamIds: string[]) {
        // 1. Snapshot Economy (End of Round / Post-Garbage Time)
        this.inventory.snapshotRoundEnd(activeSteamIds);

        // 2. Fix Ghost Players: Ensure everyone has a context
        activeSteamIds.forEach(sid => {
            if (!this.roundStats.has(sid)) {
                // This initializes a default context (0 kills, 0 deaths, survived=true)
                this.getRoundStats(sid); 
            }
        });

        // 3. Calculate Ratings
        this.roundStats.forEach((stats, sid) => {
            // Only rate players we are tracking
            if (!this.playerRatings.has(sid)) return;

            // 1. Kill Rating (Weight 0.25, Baseline ~0.75 KPR)
            const scoreKill = (stats.kills / 0.75) * 0.25;

            // 2. Survival Rating (Fixed reward)
            const scoreSurv = stats.survived ? 0.30 : 0.0;

            // 3. Damage Rating (Weight 0.15, Baseline ~80 ADR)
            const scoreDmg = (stats.damage / 80.0) * 0.15;

            // 4. Impact Rating (Weight 0.25)
            let impactVal = 0;
            if (stats.kills === 1) impactVal = 1.0;
            else if (stats.kills === 2) impactVal = 2.2;
            else if (stats.kills >= 3) impactVal = 3.5;
            
            if (stats.isEntryKill) impactVal += 0.5;
            
            const scoreImpact = (impactVal / 1.3) * 0.25;
            
            // Save impact for display
            stats.impactPoints = scoreImpact;

            // 5. KAST-like (Fixed reward)
            // KAST includes Kills, Assists, Survived, Traded
            const isKast = stats.kills > 0 || stats.assists > 0 || stats.survived || stats.traded || stats.wasTraded;
            const scoreKast = isKast ? 0.20 : 0.0;

            // 6. Econ Rating (Dynamic)
            const startValue = this.inventory.getStartValue(sid) + 500; 
            const valueGenerated = stats.killValue; 
            let scoreEcon = 0;
            if (valueGenerated > 0) {
                 scoreEcon = Math.log2(1 + (valueGenerated / startValue)) * 0.10;
            }

            // 7. Trade Adjustments
            const tradeScore = stats.tradeBonus - stats.tradePenalty;

            // Final Sum
            let roundRating = scoreKill + scoreSurv + scoreDmg + scoreImpact + scoreKast + scoreEcon + tradeScore;
            
            stats.rating = parseFloat(roundRating.toFixed(3));

            const p = this.playerRatings.get(sid)!;
            p.sumRating += roundRating;
            p.rounds++;
        });
    }

    public applyStats(statsMap: Map<string, PlayerMatchStats>) {
        statsMap.forEach((playerStats, sid) => {
            const ratingData = this.playerRatings.get(sid);
            if (ratingData && ratingData.rounds > 0) {
                const avgRating = ratingData.sumRating / ratingData.rounds;
                
                // Final Scale Calibration
                const finalRating = avgRating * 1.30; 
                
                playerStats.rating = parseFloat(finalRating.toFixed(2));
                
                playerStats.we = parseFloat(((playerStats.rating * 0.9) + 0.1).toFixed(2));
            } else {
                playerStats.rating = 0.00;
            }
        });
    }
}