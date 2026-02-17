
import { PlayerMatchStats } from "../../types";
import { InventoryTracker } from "./InventoryTracker";
import { HealthTracker } from "./HealthTracker";
import { WPAEngine, WPAUpdate } from "./WPAEngine";
import { normalizeSteamId } from "../demo/helpers";
import { RoundContext } from "./types"; // Changed from ../types
import { calculateRoundRating } from "./rating/formula";

export { RoundContext }; 

export class RatingEngine {
    private inventory = new InventoryTracker();
    private health = new HealthTracker();
    private wpaEngine = new WPAEngine();
    
    private roundStats = new Map<string, RoundContext>();
    private recentDeaths: { victim: string, killer: string, tick: number }[] = [];
    
    // AttackerID -> VictimID -> DamageDealt
    private damageGraph = new Map<string, Map<string, number>>();
    private firstKillHappened = false;
    private roundStartTick = 0;
    
    // Accumulators: SteamID -> { sumRating, rounds, impactSum, sumWPA }
    private playerRatings = new Map<string, { sumRating: number, rounds: number, impactSum: number, sumWPA: number }>();

    // FIX: Accumulative Roster Cache to handle empty Round 1 inputs
    private knownRoundTs = new Set<string>();
    private knownRoundCTs = new Set<string>();

    public getOrInitState(sid: string) {
        if (!this.playerRatings.has(sid)) {
            this.playerRatings.set(sid, { sumRating: 0, rounds: 0, impactSum: 0, sumWPA: 0 });
        }
    }

    private getRoundStats(sid: string): RoundContext {
        if (!this.roundStats.has(sid)) {
            this.roundStats.set(sid, {
                kills: 0, deaths: 0, assists: 0, damage: 0, survived: true,
                isEntryKill: false, isEntryDeath: false,
                traded: false, wasTraded: false,
                tradeBonus: 0, tradePenalty: 0, 
                impactPoints: 0, killValue: 0, rating: 0,
                wpa: 0
            });
        }
        return this.roundStats.get(sid)!;
    }

    public getCurrentRoundContext(sid: string): RoundContext | undefined {
        return this.roundStats.get(sid);
    }
    
    public getInventoryValue(sid: string, type: 'start' | 'end'): number {
        return type === 'start' ? this.inventory.getStartValue(sid) : this.inventory.getEndValue(sid);
    }
    
    public getRoundWinProb(): number {
        // Expose current probability for debugging/UI
        return this.wpaEngine.getCurrentWinProb();
    }

    /**
     * Resolves a player ID, handling JavaScript number precision loss.
     * Raw IDs from events might be Numbers that have lost precision (e.g. 76561198012345680 instead of ...78).
     * This compares the Number() value of the candidate against the Number() value of the raw input.
     */
    private resolvePlayerId(rawId: any, candidates: Set<string>): string {
        const normalized = normalizeSteamId(rawId);
        // 1. Try exact match (String match)
        if (candidates.has(normalized)) return normalized;

        // 2. Fuzzy match for JS precision loss
        // Steam64 IDs are large integers. JS 'Number' loses precision beyond 2^53.
        // If the demo parser passes a raw Number, it might be slightly off.
        // We check if the imprecise Number versions match.
        const rawNum = Number(rawId);
        if (!isNaN(rawNum) && rawNum > 0) {
            for (const candidate of candidates) {
                if (Number(candidate) === rawNum) {
                    return candidate;
                }
            }
        }
        return normalized;
    }

    public handleEvent(
        event: any, 
        currentRound: number, 
        teammateSteamIds: Set<string>,
        aliveTs: Set<string>,
        aliveCTs: Set<string>,
        roundTs: Set<string>, // Incoming T players (might be empty in R1)
        roundCTs: Set<string> // Incoming CT players (might be empty in R1)
    ) {
        const type = event.event_name;
        const tick = event.tick || 0;
        const TICK_RATE = 64; 

        // --- FIX: Sync internal roster cache ---
        if (type === 'round_announce_match_start' || type === 'round_start') {
            this.knownRoundTs.clear();
            this.knownRoundCTs.clear();
        }

        // Accumulate players into known sets
        roundTs.forEach(id => this.knownRoundTs.add(id));
        roundCTs.forEach(id => this.knownRoundCTs.add(id));
        // Also capture alive players as they are definitely in the round (fixes R1 empty roster)
        aliveTs.forEach(id => this.knownRoundTs.add(id));
        aliveCTs.forEach(id => this.knownRoundCTs.add(id));

        // Build candidate set for ID resolution (Fuzzy Match Target)
        const allRoundPlayers = new Set<string>();
        this.knownRoundTs.forEach(id => allRoundPlayers.add(id));
        this.knownRoundCTs.forEach(id => allRoundPlayers.add(id));
        teammateSteamIds.forEach(id => allRoundPlayers.add(id)); 

        if (['item_pickup', 'item_drop', 'item_purchase'].includes(type)) {
            this.inventory.handleItemEvent(event);
        }

        if (type === 'round_announce_match_start') {
            this.playerRatings.clear();
            this.roundStats.clear();
            this.wpaEngine.startNewRound();
            this.inventory.reset(); 
            this.roundStartTick = 0; // Reset timer anchor
            return;
        }

        // Logic for round start / freeze end
        if (type === 'round_start' || type === 'round_freeze_end') {
            if (type === 'round_start') {
                 // FIX: Initialize with current tick to avoid 0-based time panic if freeze_end is missing
                 this.roundStartTick = tick;
            }

            if (type === 'round_freeze_end') {
                this.roundStartTick = tick;

                // --- Fallback: Force Populate Roster if Empty (Round 1 Fix) ---
                if (this.knownRoundTs.size === 0 && this.knownRoundCTs.size === 0) {
                     // Try to recover side from active players
                     // Since we don't know who is T/CT without events, we rely on parser passing them.
                     // If parser fixed, we are good.
                     // But if parser failed to pass (e.g. empty roundTs), we check aliveTs.
                     // aliveTs is already added to knownRoundTs above.
                     
                     // If STILL empty, check all active ratings keys (fallback for total failure)
                     const activeIds = Array.from(this.playerRatings.keys());
                     if (activeIds.length > 0) {
                        // Guess side: Teammates to T, others to CT (or vice versa, assuming R1)
                        // This is a last resort guess.
                        // Assuming Pistol Round (R1), usually T side starts attacking?
                        // Without explicit info, this is risky, but better than crash.
                        // However, demoParser fix should prevent this.
                        // We will skip explicit random assignment to avoid wrong side.
                     }
                }
                
                // 1. Inventory Snapshot
                const activeIds = Array.from(this.playerRatings.keys());
                this.inventory.snapshotRoundStart(activeIds);

                // 2. Calculate Team Equip Values for WPA v3.3
                let tVal = 0;
                let ctVal = 0;
                
                // Use the accumulated roster sets (Fixes R1)
                this.knownRoundTs.forEach(sid => tVal += this.inventory.getStartValue(sid));
                this.knownRoundCTs.forEach(sid => ctVal += this.inventory.getStartValue(sid));

                // Fallback for empty sets (e.g. pistol round or parsing error)
                if (tVal === 0 && ctVal === 0) {
                    tVal = 4000; ctVal = 4000;
                }

                // [Bug Fix] Pistol Round Force Equal
                // Demo parsing often misses initial purchases before freeze_end due to tick timing.
                // Assuming MR12 for CS2 (Pistols at 1 and 13).
                const isPistol = (currentRound === 1 || currentRound === 13);
                if (isPistol) {
                    tVal = 4000; ctVal = 4000;
                }

                // 3. Initialize WPA Engine with Economy Context
                this.wpaEngine.startNewRound(); // Ensure clean slate
                this.wpaEngine.initializeRound(tVal, ctVal); 
            }
            
            this.roundStats.clear();
            this.recentDeaths = [];
            this.damageGraph.clear();
            this.health.reset();
            this.firstKillHappened = false;
            return;
        }

        // FIX: Time Safety Valve
        // If timeElapsed is excessively large (e.g. > 300s), it means roundStartTick is 0 or invalid (Time Panic).
        // We forcibly snap the start time to now to prevent WPA flatlining at 0.0%.
        let timeElapsed = Math.max(0, (tick - this.roundStartTick) / TICK_RATE);
        if (timeElapsed > 300) {
            this.roundStartTick = tick;
            timeElapsed = 0;
            // Optionally attempt late init if it looks like round 1
            if (currentRound === 1 && this.wpaEngine.getCurrentWinProb() === 0.5) {
                this.wpaEngine.initializeRound(4000, 4000);
            }
        }
        
        // Arrays for WPA Engine (Symmetric Distribution to ALL team members)
        // Use accumulative cache instead of passed args
        const tPlayers = Array.from(this.knownRoundTs);
        const ctPlayers = Array.from(this.knownRoundCTs);

        if (type === 'player_hurt') {
            // Fix ID: attacker_steamid / attacker / userid
            const rawAtt = event.attacker_steamid || event.attacker;
            const rawVic = event.user_steamid || event.userid;

            const att = this.resolvePlayerId(rawAtt, allRoundPlayers);
            const vic = this.resolvePlayerId(rawVic, allRoundPlayers);
            
            const rawDmg = parseInt(event.dmg_health || 0);
            
            const actualDmg = this.health.recordDamage(vic, rawDmg);

            if (att !== "BOT" && vic !== "BOT" && att !== vic && att !== "0") {
                const stats = this.getRoundStats(att);
                stats.damage += actualDmg;

                if (!this.damageGraph.has(att)) this.damageGraph.set(att, new Map());
                const vMap = this.damageGraph.get(att)!;
                vMap.set(vic, (vMap.get(vic) || 0) + actualDmg);
                
                // WPA for Damage
                // Robust Side Detection
                let attSide: 'T' | 'CT' | undefined;
                if (this.knownRoundTs.has(att)) attSide = 'T';
                else if (this.knownRoundCTs.has(att)) attSide = 'CT';
                // Fallback to event data
                if (!attSide && event.attacker_team_num == 2) attSide = 'T';
                if (!attSide && event.attacker_team_num == 3) attSide = 'CT';

                if (attSide) {
                    const wpaUpdates = this.wpaEngine.handleDamage(
                        att, vic, attSide, actualDmg, timeElapsed,
                        tPlayers, ctPlayers
                    );
                    this.wpaEngine.commitUpdates(wpaUpdates);
                }
            }
        }

        if (type === 'bomb_planted' || type === 'bomb_defused') {
            const rawSid = event.user_steamid || event.userid;
            const sid = this.resolvePlayerId(rawSid, allRoundPlayers);
            const isPlant = type === 'bomb_planted';
            
            // [Bug Fix] Calculate Active Kits for Post-Plant WPA
            let activeKits = 0;
            if (isPlant) {
                // Count kits for all currently alive CTs
                this.knownRoundCTs.forEach(ctId => {
                    if (aliveCTs.has(ctId) && this.inventory.hasKit(ctId)) activeKits++;
                });
            }
            
            const wpaUpdates = this.wpaEngine.handleObjective(
                sid, isPlant ? 'plant' : 'defuse', timeElapsed, 
                tPlayers, ctPlayers,
                isPlant ? activeKits : undefined
            );
            this.wpaEngine.commitUpdates(wpaUpdates);
        }

        if (type === 'player_death') {
            const rawAtt = event.attacker_steamid || event.attacker;
            const rawVic = event.user_steamid || event.userid;
            const rawAst = event.assister_steamid || event.assister;

            const att = this.resolvePlayerId(rawAtt, allRoundPlayers);
            const vic = this.resolvePlayerId(rawVic, allRoundPlayers);
            const ast = this.resolvePlayerId(rawAst, allRoundPlayers);
            
            // [Bug Fix] Check if victim had kit BEFORE clearing inventory
            const hasKit = this.inventory.hasKit(vic);

            this.inventory.handlePlayerDeath(vic);
            const vicStats = this.getRoundStats(vic);
            vicStats.deaths++;
            vicStats.survived = false;
            
            if (!this.firstKillHappened) {
                vicStats.isEntryDeath = true;
            }

            // --- WPA Calculation ---
            // Robust Side Detection for Victim
            let victimSide: 'T' | 'CT' | undefined;
            
            // 1. Check alive sets first (most accurate for current state tracking)
            if (aliveTs.has(vic)) victimSide = 'T';
            else if (aliveCTs.has(vic)) victimSide = 'CT';
            
            // 2. Then round roster (accumulated cache)
            else if (this.knownRoundTs.has(vic)) victimSide = 'T';
            else if (this.knownRoundCTs.has(vic)) victimSide = 'CT';
            
            // 3. Fallback to event properties (least reliable but necessary for incomplete data)
            if (!victimSide) {
                const teamNum = event.user_team_num || event.team_num || event.team;
                if (teamNum == 2) victimSide = 'T';
                if (teamNum == 3) victimSide = 'CT';
            }

            // 4. Ultimate Fallback: Deduce from teammates (User Request Step 3)
            if (!victimSide) {
                // Try to determine 'Our Side' from known players
                let ourSide: 'T' | 'CT' | undefined;
                // Check known T's for a teammate
                for (const id of this.knownRoundTs) { if (teammateSteamIds.has(id)) { ourSide = 'T'; break; } }
                // Check known CT's
                if (!ourSide) for (const id of this.knownRoundCTs) { if (teammateSteamIds.has(id)) { ourSide = 'CT'; break; } }
                
                if (ourSide) {
                    const isTeammate = teammateSteamIds.has(vic);
                    victimSide = isTeammate ? ourSide : (ourSide === 'T' ? 'CT' : 'T');
                }
            }
            
            if (victimSide) {
                const assisters = [];
                if (ast && ast !== "BOT" && ast !== "0") {
                    const isFlash = event.assistedflash;
                    assisters.push({ sid: ast, isFlash });
                }

                // NEW: Collect damage contributors to the victim for weighted WPA
                const damageContributors = new Map<string, number>();
                this.damageGraph.forEach((victimMap, attackerSid) => {
                    if (victimMap.has(vic)) {
                        damageContributors.set(attackerSid, victimMap.get(vic)!);
                    }
                });
                
                const updates = this.wpaEngine.handleKill(
                    att, vic, victimSide, assisters, timeElapsed,
                    tPlayers, ctPlayers,
                    hasKit, // Pass kit loss info to WPA
                    damageContributors // NEW Argument
                );
                this.wpaEngine.commitUpdates(updates);
            } else {
                // Warn only if we really couldn't figure it out
                // console.warn("[RatingEngine] Could not determine victim side for WPA:", vic);
            }

            if (att !== "BOT" && att !== vic && att !== "0") {
                const attStats = this.getRoundStats(att);
                attStats.kills++;
                attStats.killValue += this.inventory.getStartValue(vic);

                if (!this.firstKillHappened) {
                    attStats.isEntryKill = true;
                    this.firstKillHappened = true;
                }

                // --- Trade Logic ---
                const TRADE_WINDOW_TICKS = 256; 
                
                const avengedDeath = this.recentDeaths.find(d => 
                    d.killer === vic && (tick - d.tick) <= TRADE_WINDOW_TICKS
                );

                if (avengedDeath) {
                    const teammateId = avengedDeath.victim;
                    const tickDiff = tick - avengedDeath.tick;
                    
                    attStats.traded = true;
                    const mateStats = this.getRoundStats(teammateId);
                    mateStats.wasTraded = true;

                    // WPA Trade Restoration
                    const tradeRestore = this.wpaEngine.getTradeRestoration(teammateId);
                    this.wpaEngine.commitUpdates([tradeRestore]);

                    // Old Rating 3.0 Logic
                    const damageToEnemy = this.damageGraph.get(teammateId)?.get(vic) || 0;
                    const cappedDmg = Math.min(damageToEnemy, 100);
                    const timeFactor = Math.max(0, 1.0 - (tickDiff / TRADE_WINDOW_TICKS));
                    const entryBonus = (cappedDmg / 100.0) * 0.20 * timeFactor;
                    mateStats.tradeBonus += entryBonus;
                    const tradePenalty = (cappedDmg / 100.0) * 0.15;
                    attStats.tradePenalty += tradePenalty;
                }
            }
            
            if (ast !== "BOT" && ast !== vic && ast !== att && ast !== "0") {
                const astStats = this.getRoundStats(ast);
                astStats.assists++;
            }
            
            this.recentDeaths.push({ victim: vic, killer: att, tick });
        }
    }

    public finalizeRound(
        activeSteamIds: string[], 
        allTs: string[], 
        allCTs: string[], 
        winnerSide: 'T' | 'CT'
    ) {
        // Use cached rosters if passed ones are empty (R1 fix)
        const finalTs = (allTs && allTs.length > 0) ? allTs : Array.from(this.knownRoundTs);
        const finalCTs = (allCTs && allCTs.length > 0) ? allCTs : Array.from(this.knownRoundCTs);

        // 1. WPA Round Closure (Distribute remaining probability symmetrically to ALL players)
        const closureUpdates = this.wpaEngine.finalizeRound(winnerSide, finalTs, finalCTs);
        this.wpaEngine.commitUpdates(closureUpdates);

        // 2. Inventory Snapshots
        this.inventory.snapshotRoundEnd(activeSteamIds);

        activeSteamIds.forEach(sid => {
            if (!this.roundStats.has(sid)) {
                this.getRoundStats(sid); 
            }
        });

        this.roundStats.forEach((stats, sid) => {
            // FIX: Populate WPA from Engine Accumulator
            stats.wpa = this.wpaEngine.getPlayerRoundWPA(sid);
            
            if (!this.playerRatings.has(sid)) return;

            // Rating 4.0 Calculation (Delegated to helper)
            const startValue = this.inventory.getStartValue(sid);
            const calcResult = calculateRoundRating(stats, startValue);
            
            stats.rating = calcResult.rating;
            stats.impactPoints = calcResult.impact;

            const p = this.playerRatings.get(sid)!;
            p.sumRating += stats.rating;
            p.sumWPA += stats.wpa; // Accumulate WPA
            p.rounds++;
        });
    }

    public applyStats(statsMap: Map<string, PlayerMatchStats>) {
        statsMap.forEach((playerStats, sid) => {
            const ratingData = this.playerRatings.get(sid);
            if (ratingData && ratingData.rounds > 0) {
                const avgRating = ratingData.sumRating / ratingData.rounds;
                const finalRating = avgRating * 1.30; 
                
                playerStats.rating = parseFloat(finalRating.toFixed(2));
                
                // New WPA Field
                playerStats.wpa = parseFloat(ratingData.sumWPA.toFixed(2));
                playerStats.we = playerStats.wpa;
                
            } else {
                playerStats.rating = 0.00;
                playerStats.wpa = 0.00;
            }
        });
    }
}
