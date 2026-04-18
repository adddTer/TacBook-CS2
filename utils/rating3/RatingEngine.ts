
import { PlayerMatchStats } from "../../types";
import { InventoryTracker } from "./InventoryTracker";
import { HealthTracker } from "./HealthTracker";
import { WPAEngine, type WPAUpdate } from "./WPAEngine";
import { normalizeSteamId } from "../demo/helpers";
import type { RoundContext } from "./ratingTypes"; // Changed from ./types
import { getExpectedWinRate } from "./economy";
import { calculateRoundRating } from "./rating/formula";
import { DISPLAY_NAME_TO_ID } from "./constants";

export type { RoundContext }; 

export class RatingEngine {
    private inventory = new InventoryTracker();
    private health = new HealthTracker();
    private wpaEngine = new WPAEngine();
    
    private roundStats = new Map<string, RoundContext>();
    private recentDeaths: { victim: string, killer: string, tick: number }[] = [];
    
    // AttackerID -> VictimID -> { raw: number, weighted: number }
    private damageGraph = new Map<string, Map<string, { raw: number, weighted: number }>>();
    private firstKillHappened = false;
    private roundStartTick = 0;
    
    // Accumulators: SteamID -> { sumRating, rounds, impactSum, sumWPA }
    private playerRatings = new Map<string, { sumRating: number, rounds: number, impactSum: number, sumWPA: number }>();

    // Drop Pool for tracking weapon trades
    private dropPool: { item: string, dropperSid: string, team: 'T' | 'CT', tick: number }[] = [];

    // FIX: Accumulative Roster Cache to handle empty Round 1 inputs
    private knownRoundTs = new Set<string>();
    private knownRoundCTs = new Set<string>();
    
    private lastRoundProcessed = 0; // Track round transitions for inventory resets

    public setRoundResult(result: { winner: 'T' | 'CT', reason: number, endTick: number }) {
        this.wpaEngine.setRoundResult(result);
    }

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
                wpa: 0,
                killShareRating: 0, // Init
                survivalScore: 0.538, // Init to survived
                botKills: 0, // Init
                wpaDetails: []
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

    private handleEquipmentChange(event: any, type: string, tick: number, aliveTs: Set<string>, aliveCTs: Set<string>, allRoundPlayers: Set<string>): WPAUpdate[] {
        let rawSid = event.user_steamid;
        if (!rawSid || rawSid === "0") rawSid = event.steamid;
        const sid = this.resolvePlayerId(rawSid, allRoundPlayers);
        if (sid === "BOT") return [];

        let rawItem = event.item;
        if ((!rawItem || rawItem === null) && event.item_name) {
            rawItem = DISPLAY_NAME_TO_ID[event.item_name];
        }
        if (!rawItem || typeof rawItem !== 'string') return [];
        const item = rawItem.replace("weapon_", "").replace("item_", "");

        const team = this.knownRoundTs.has(sid) ? 'T' : (this.knownRoundCTs.has(sid) ? 'CT' : undefined);
        if (!team) return [];

        // 1. Calculate new equipment values
        let tEquip = 0;
        let ctEquip = 0;
        aliveTs.forEach(id => tEquip += this.inventory.getCurrentValue(id));
        aliveCTs.forEach(id => ctEquip += this.inventory.getCurrentValue(id));

        // 2. Update WPA Engine
        const updates = this.wpaEngine.updateEquipment(tEquip, ctEquip, Array.from(this.knownRoundTs), Array.from(this.knownRoundCTs));
        
        if (updates.length === 0) return [];

        // 3. Process the update
        const update = updates[0]; // Should be TEAM_DELTA
        const totalPoints = update.delta;

        let rewardSid = sid;
        let finalUpdates: WPAUpdate[] = [];

        if (type === 'item_drop') {
            this.dropPool.push({ item, dropperSid: sid, team, tick });
            const wpaChange = team === 'T' ? totalPoints : -totalPoints; 
            finalUpdates.push({ sid, delta: wpaChange, reason: 'item_drop' });
        } else if (type === 'item_pickup') {
            let dropIdx = -1;
            for (let i = this.dropPool.length - 1; i >= 0; i--) {
                if (this.dropPool[i].item === item && this.dropPool[i].team === team) {
                    dropIdx = i;
                    break;
                }
            }
            if (dropIdx !== -1) {
                rewardSid = this.dropPool[dropIdx].dropperSid;
                this.dropPool.splice(dropIdx, 1);
            }
            const wpaChange = team === 'T' ? totalPoints : -totalPoints; 
            finalUpdates.push({ sid: rewardSid, delta: wpaChange, reason: 'item_pickup' });
        } else if (type === 'item_purchase' || type === 'item_refund') {
            const wpaChange = team === 'T' ? totalPoints : -totalPoints;
            finalUpdates.push({ sid, delta: wpaChange, reason: type });
        }

        return finalUpdates;
    }

    public handleDefuseStart(sid: string, hasKit: boolean) {
        // Delegate to WPA Engine
        this.wpaEngine.handleDefuseStart(sid, hasKit);
    }

    private commitWPAUpdates(updates: WPAUpdate[], tick: number) {
        this.wpaEngine.commitUpdates(updates);
        updates.forEach(u => {
            if (u.sid !== 'TEAM_DELTA' && u.sid !== 'BOT' && u.sid !== '0') {
                const stats = this.getRoundStats(u.sid);
                if (!stats.wpaDetails) stats.wpaDetails = [];
                stats.wpaDetails.push({ reason: u.reason || 'unknown', delta: u.delta, tick });
            }
        });
    }

    public getCurrentRatings(): Map<string, number> {
        const ratings = new Map<string, number>();
        this.roundStats.forEach((stats, sid) => {
            const tempWpa = this.wpaEngine.getPlayerRoundWPA(sid);
            const tempStats = { ...stats, wpa: tempWpa };
            const startValue = this.inventory.getStartValue(sid);
            const calcResult = calculateRoundRating(tempStats, startValue);
            ratings.set(sid, calcResult.rating);
        });
        return ratings;
    }

    public resetRoundState() {
        this.roundStats.clear();
        this.recentDeaths = [];
        this.damageGraph.clear();
        this.health.reset();
        this.firstKillHappened = false;
        this.knownRoundTs.clear();
        this.knownRoundCTs.clear();
        this.dropPool = [];
        
        // FIX: Ensure WPA Engine is reset even if round_start is missing
        this.wpaEngine.startNewRound();
        // Initialize with default economy. If round_start occurs, it will be overwritten with actual values.
        this.wpaEngine.initializeRound(4000, 4000); 
    }

    public handleEvent(
        event: any, 
        currentRound: number, 
        teammateSteamIds: Set<string>,
        aliveTs: Set<string>,
        aliveCTs: Set<string>,
        roundTs: Set<string>, // Incoming T players (might be empty in R1)
        roundCTs: Set<string> // Incoming CT players (might be empty in R1)
    ): { timeUpdates: any[], eventUpdates: any[], timeProbDelta: number, eventProbDelta: number, ratingUpdates: { steamid: string, ratingDelta: number }[], duelStats?: any } | void {
        const type = event.event_name;
        const tick = event.tick || 0;
        const TICK_RATE = 64; 
        
        let eventUpdates: any[] = [];
        let timeUpdates: any[] = [];
        let duelStats: any = undefined;

        const ratingsBefore = this.getCurrentRatings();

        // --- NEW: Detect Round Transition for Hard Inventory Reset (Fixes R13 Economy Inflation) ---
        if (currentRound > this.lastRoundProcessed) {
            const isGameStart = currentRound === 1;
            const isHalftime = currentRound === 13; // MR12 Halftime
            const isOtSwitch = currentRound > 24 && (currentRound - 25) % 3 === 0; // MR3 OT Switch (R25, R28, R31...)

            if (isGameStart || isHalftime || isOtSwitch) {
                // console.log(`[RatingEngine] Hard Reset Inventory for Round ${currentRound} (Side Switch/Start)`);
                this.inventory.reset();
            }
            this.lastRoundProcessed = currentRound;
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

        if (['item_pickup', 'item_drop', 'item_purchase', 'item_refund'].includes(type)) {
            this.inventory.handleItemEvent(event);
            const equipUpdates = this.handleEquipmentChange(event, type, tick, aliveTs, aliveCTs, allRoundPlayers);
            eventUpdates.push(...equipUpdates);
            this.commitWPAUpdates(equipUpdates, tick);
        }

        if (type === 'round_announce_match_start') {
            this.playerRatings.clear();
            this.roundStats.clear();
            this.wpaEngine.startNewRound();
            this.inventory.reset(); 
            this.roundStartTick = 0; // Reset timer anchor
            return { timeUpdates, eventUpdates, timeProbDelta: 0, eventProbDelta: 0, ratingUpdates: [] };
        }

        // Logic for round start / freeze end
        if (type === 'round_start' || type === 'round_freeze_end') {
            if (type === 'round_start') {
                 // FIX: Initialize with current tick to avoid 0-based time panic if freeze_end is missing
                 this.roundStartTick = tick;
            }

            if (type === 'round_freeze_end') {
                this.roundStartTick = tick;

                // --- Sanitize Pistol Rounds (R1, R13, OT Start) ---
                // Ensure no illegal items (like primary weapons) exist in pistol rounds
                // This fixes bugs where high-value items persist incorrectly
                const isGameStart = currentRound === 1;
                const isHalftime = currentRound === 13;
                const isOtSwitch = currentRound > 24 && (currentRound - 25) % 3 === 0;

                if (isGameStart || isHalftime || isOtSwitch) {
                    this.inventory.sanitizePistolRound();
                }

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

                // Removed Fallback for empty sets (tVal=4000) to allow true 0 value (Eco)
                // Removed Pistol Round Force Equal (tVal=4000) to allow accurate tracking of armor/utility purchases

                // 3. Initialize WPA Engine with Economy Context
                this.wpaEngine.startNewRound(); // Ensure clean slate
                this.wpaEngine.initializeRound(tVal, ctVal); 
            }
            
            this.roundStats.clear();
            this.recentDeaths = [];
            this.damageGraph.clear();
            this.health.reset();
            this.firstKillHappened = false;
            return { timeUpdates, eventUpdates, timeProbDelta: 0, eventProbDelta: 0, ratingUpdates: [] };
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
        const currentAliveTs = new Set(this.knownRoundTs);
        const currentAliveCTs = new Set(this.knownRoundCTs);
        this.recentDeaths.forEach(d => {
            currentAliveTs.delete(d.victim);
            currentAliveCTs.delete(d.victim);
        });

        const tPlayers = Array.from(currentAliveTs);
        const ctPlayers = Array.from(currentAliveCTs);

        const probBeforeTime = this.wpaEngine.getCurrentWinProb();

        // --- WPA Time Update ---
        // Isolate time decay from event impact
        // ONLY process time decay for major events to avoid "eating" the time decay in player_hurt
        const isMajorEvent = ['player_death', 'bomb_planted', 'bomb_defused', 'bomb_exploded'].includes(type);
        
        if (isMajorEvent) {
            timeUpdates = this.wpaEngine.handleTimeUpdate(
                timeElapsed,
                tPlayers,
                ctPlayers
            );
            this.commitWPAUpdates(timeUpdates, tick);
        }

        const probAfterTime = this.wpaEngine.getCurrentWinProb();

        if (type === 'player_hurt') {
            // Fix ID: attacker_steamid / attacker / userid
            const rawAtt = event.attacker_steamid || event.attacker;
            const rawVic = event.user_steamid || event.userid;

            const att = this.resolvePlayerId(rawAtt, allRoundPlayers);
            const vic = this.resolvePlayerId(rawVic, allRoundPlayers);
            
            const rawDmg = parseInt(event.dmg_health || 0);

            // Determine Sides for Friendly Fire Check
            let attSide: 'T' | 'CT' | undefined;
            if (this.knownRoundTs.has(att)) attSide = 'T';
            else if (this.knownRoundCTs.has(att)) attSide = 'CT';
            
            let vicSide: 'T' | 'CT' | undefined;
            if (this.knownRoundTs.has(vic)) vicSide = 'T';
            else if (this.knownRoundCTs.has(vic)) vicSide = 'CT';

            const isFriendlyFire = attSide && vicSide && attSide === vicSide;
            
            // ALWAYS record damage for health tracking (to keep health state accurate)
            const actualDmg = this.health.recordDamage(vic, rawDmg);

            // ALWAYS record damage in damageGraph (including friendly fire)
            if (att !== "BOT" && vic !== "BOT" && att !== vic && att !== "0") {
                if (!this.damageGraph.has(att)) this.damageGraph.set(att, new Map());
                const vMap = this.damageGraph.get(att)!;
                
                // Calculate E_damage at the time of damage
                const vicValue = this.inventory.getCurrentValue(vic);
                const attValue = this.inventory.getCurrentValue(att);
                const pExpAttacker = getExpectedWinRate(attValue, vicValue, attSide || 'T', !!isFriendlyFire, false);
                const E_damage = 0.5 / pExpAttacker;
                
                const existing = vMap.get(vic) || { raw: 0, weighted: 0 };
                existing.raw += actualDmg;
                // Friendly fire does not apply economic multiplier (E=1.0)
                existing.weighted += actualDmg * (isFriendlyFire ? 1.0 : E_damage);
                vMap.set(vic, existing);
            }

            if (!isFriendlyFire) {
                // Only count non-friendly fire damage for ADR/Stats
                if (att !== "BOT" && vic !== "BOT" && att !== vic && att !== "0") {
                    const stats = this.getRoundStats(att);
                    stats.damage += actualDmg;

                    // WPA for Damage
                    if (attSide) {
                        const wpaUpdates = this.wpaEngine.handleDamage(
                            att, vic, attSide, vicSide || 'T', actualDmg, timeElapsed,
                            tPlayers, ctPlayers
                        );
                        eventUpdates.push(...wpaUpdates);
                        this.commitWPAUpdates(wpaUpdates, tick);
                    }
                }
            } else {
                // If friendly fire, we still need to handle WPA penalty
                if (att !== "BOT" && vic !== "BOT" && att !== vic && att !== "0") {
                    if (attSide && vicSide) {
                        const wpaUpdates = this.wpaEngine.handleDamage(
                            att, vic, attSide, vicSide, actualDmg, timeElapsed,
                            tPlayers, ctPlayers
                        );
                        eventUpdates.push(...wpaUpdates);
                        this.commitWPAUpdates(wpaUpdates, tick);
                    }
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
                tPlayers, 
                ctPlayers,
                isPlant ? activeKits : undefined
            );
            eventUpdates.push(...wpaUpdates);
            this.commitWPAUpdates(wpaUpdates, tick);
        }

        if (type === 'bomb_exploded') {
            const wpaUpdates = this.wpaEngine.handleExplosion(
                timeElapsed, tPlayers, ctPlayers
            );
            eventUpdates.push(...wpaUpdates);
            this.commitWPAUpdates(wpaUpdates, tick);
        }

        if (type === 'player_death') {
            const rawAtt = event.attacker_steamid || event.attacker;
            const rawVic = event.user_steamid || event.userid;
            const rawAst = event.assister_steamid || event.assister;

            const att = this.resolvePlayerId(rawAtt, allRoundPlayers);
            const vic = this.resolvePlayerId(rawVic, allRoundPlayers);
            const ast = this.resolvePlayerId(rawAst, allRoundPlayers);
            
            // Remove death drops from dropPool (to prevent them from being counted as voluntary teammate trades)
            this.dropPool = this.dropPool.filter(d => !(d.dropperSid === vic && d.tick === tick));

            // [Bug Fix] Check if victim had kit BEFORE clearing inventory
            const hasKit = this.inventory.hasKit(vic);

            // --- Robust Side Detection ---
            let victimSide: 'T' | 'CT' | undefined;
            if (aliveTs.has(vic)) victimSide = 'T';
            else if (aliveCTs.has(vic)) victimSide = 'CT';
            else if (this.knownRoundTs.has(vic)) victimSide = 'T';
            else if (this.knownRoundCTs.has(vic)) victimSide = 'CT';
            if (!victimSide) {
                const teamNum = event.user_team_num || event.team_num || event.team;
                if (teamNum == 2) victimSide = 'T';
                if (teamNum == 3) victimSide = 'CT';
            }
            if (!victimSide) {
                let ourSide: 'T' | 'CT' | undefined;
                for (const id of this.knownRoundTs) { if (teammateSteamIds.has(id)) { ourSide = 'T'; break; } }
                if (!ourSide) for (const id of this.knownRoundCTs) { if (teammateSteamIds.has(id)) { ourSide = 'CT'; break; } }
                if (ourSide) {
                    const isTeammate = teammateSteamIds.has(vic);
                    victimSide = isTeammate ? ourSide : (ourSide === 'T' ? 'CT' : 'T');
                }
            }

            let attackerSide: 'T' | 'CT' | undefined;
            if (aliveTs.has(att)) attackerSide = 'T';
            else if (aliveCTs.has(att)) attackerSide = 'CT';
            else if (this.knownRoundTs.has(att)) attackerSide = 'T';
            else if (this.knownRoundCTs.has(att)) attackerSide = 'CT';
            
            const isFriendlyKill = attackerSide && victimSide && attackerSide === victimSide;
            const isWorldOrSuicide = att === vic || att === "World" || att === "0" || !att;

            // --- Survival Score Calculation ---
            const vicValue = this.inventory.getCurrentValue(vic);
            const attValue = this.inventory.getCurrentValue(att);
            const pExpVictim = getExpectedWinRate(vicValue, attValue, victimSide || 'T', !!isFriendlyKill, isWorldOrSuicide);
            const pExpKiller = getExpectedWinRate(attValue, vicValue, attackerSide || 'CT', !!isFriendlyKill, isWorldOrSuicide);

            duelStats = {
                attackerWeapon: this.inventory.getMostExpensiveWeapon(att),
                victimWeapon: this.inventory.getMostExpensiveWeapon(vic),
                attackerWinProb: pExpKiller,
                victimWinProb: pExpVictim
            };

            this.inventory.handlePlayerDeath(vic);
            const vicStats = this.getRoundStats(vic);
            vicStats.deaths++;
            vicStats.survived = false;
            vicStats.survivalScore = -0.10 * pExpVictim;
            
            if (!this.firstKillHappened) {
                vicStats.isEntryDeath = true;
            }

            // --- WPA Calculation ---
            const isBot = vic === 'BOT' || vic === '0' || vic.startsWith('BOT');
            const MAX_TRADE_TICKS = 512; // 8 seconds at 64 tick

            // --- Trade Compensation Calculation ---
            let C_t_total = 0;
            const tradeCompensation: { sid: string, weight: number }[] = [];
            
            // Trade compensation only applies to normal kills and non-bot victims
            if (!isFriendlyKill && !isBot) {
                // Find all teammates killed by this victim
                const victimKills = [];
                for (let i = this.recentDeaths.length - 1; i >= 0; i--) {
                    const d = this.recentDeaths[i];
                    if (d.killer === vic) {
                        victimKills.push(d);
                    }
                }

                if (victimKills.length > 0) {
                    const vLast = victimKills[0];
                    const t0Ticks = tick - vLast.tick;
                    
                    if (t0Ticks <= MAX_TRADE_TICKS) {
                        const t0Seconds = t0Ticks / 64.0;
                        // C(t) = 0.40 * e^(-0.47 * t)
                        C_t_total = 0.40 * Math.exp(-0.47 * t0Seconds);
                        
                        const validVictims: { sid: string, weight: number }[] = [];
                        validVictims.push({ sid: vLast.victim, weight: C_t_total }); // V_last weight
                        
                        let prevTick = vLast.tick;
                        for (let i = 1; i < victimKills.length; i++) {
                            const vPrev = victimKills[i];
                            const tDiffTicks = prevTick - vPrev.tick;
                            if (tDiffTicks > MAX_TRADE_TICKS) {
                                break; // Chain broken
                            }
                            const tDiffSeconds = tDiffTicks / 64.0;
                            const weight = 0.40 * Math.exp(-0.47 * tDiffSeconds);
                            validVictims.push({ sid: vPrev.victim, weight: weight });
                            prevTick = vPrev.tick;
                        }
                        
                        const sumWeights = validVictims.reduce((sum, v) => sum + v.weight, 0);
                        if (sumWeights > 0) {
                            validVictims.forEach(v => {
                                const finalWeight = C_t_total * (v.weight / sumWeights);
                                tradeCompensation.push({ sid: v.sid, weight: finalWeight });
                            });
                        }
                    }
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
                const contributorSides = new Map<string, 'T' | 'CT'>();
                this.damageGraph.forEach((victimMap, attackerSid) => {
                    if (victimMap.has(vic)) {
                        damageContributors.set(attackerSid, victimMap.get(vic)!.raw);
                        const side = this.knownRoundTs.has(attackerSid) ? 'T' : (this.knownRoundCTs.has(attackerSid) ? 'CT' : undefined);
                        if (side) contributorSides.set(attackerSid, side);
                    }
                });
                
                if (ast && ast !== "BOT" && ast !== "0") {
                    const astSide = this.knownRoundTs.has(ast) ? 'T' : (this.knownRoundCTs.has(ast) ? 'CT' : undefined);
                    if (astSide) contributorSides.set(ast, astSide);
                }
                
                // Identify surviving players of the killer's team
                const killerTeam = attackerSide === 'T' ? tPlayers : ctPlayers;
                const survivingKillerTeam: string[] = [];
                if (killerTeam) {
                    killerTeam.forEach(sid => {
                        if (this.getRoundStats(sid).survived) {
                            survivingKillerTeam.push(sid);
                        }
                    });
                }
                
                if (attackerSide) {
                    const updates = this.wpaEngine.handleKill(
                        att, vic, victimSide, attackerSide, assisters, timeElapsed,
                        tPlayers, ctPlayers,
                        hasKit, // Pass kit loss info to WPA
                        damageContributors, // NEW Argument
                        tick, // Pass current tick for 5s window check
                        isBot, // NEW
                        contributorSides, // NEW
                        survivingKillerTeam, // NEW
                        tradeCompensation // NEW
                    );
                    eventUpdates.push(...updates);
                    this.commitWPAUpdates(updates, tick);
                }
            } else {
                // Warn only if we really couldn't figure it out
                // console.warn("[RatingEngine] Could not determine victim side for WPA:", vic);
            }

            if (att !== "BOT" && att !== vic && att !== "0") {
                if (!isFriendlyKill) {
                    const attStats = this.getRoundStats(att);
                    attStats.kills++;

                    if (isBot) {
                        attStats.botKills++;
                    } else {
                        attStats.killValue += this.inventory.getStartValue(vic);

                        if (!this.firstKillHappened) {
                            attStats.isEntryKill = true;
                            this.firstKillHappened = true;
                        }
                    }
                }

                // --- Kill Share Distribution (RTG v5.0) ---
                if (!isBot) {
                    const FIXED_SHARE = 0.6;
                    const DAMAGE_SHARE = 0.4;

                    // --- Economy Modifier (Expected Win Rate) ---
                    let E = 0.5 / pExpKiller;

                    // NEW: Friendly Fire Penalty Multiplier
                    const multiplier = isFriendlyKill ? -1.0 : 1.0;

                    if (tradeCompensation.length > 0) {
                        tradeCompensation.forEach(tc => {
                            const baitStats = this.getRoundStats(tc.sid);
                            baitStats.killShareRating += tc.weight;
                            baitStats.wasTraded = true;
                        });
                        
                        const attStats = this.getRoundStats(att);
                        attStats.traded = true;
                    }

                    // Remaining Pool
                    const V_rem = 1.0 - C_t_total;

                    // Calculate Total Damage Weight
                    let totalRawDamage = 0;
                    const contributors: { sid: string, rawDamage: number, weightedDamage: number, isFlash: boolean, side?: 'T' | 'CT' }[] = [];

                    // 1. Damage Contributors
                    this.damageGraph.forEach((victimMap, attackerSid) => {
                        if (victimMap.has(vic)) {
                            const contributorSide = this.knownRoundTs.has(attackerSid) ? 'T' : (this.knownRoundCTs.has(attackerSid) ? 'CT' : undefined);
                            const dmgData = victimMap.get(vic)!;
                            contributors.push({ sid: attackerSid, rawDamage: dmgData.raw, weightedDamage: dmgData.weighted, isFlash: false, side: contributorSide });
                            totalRawDamage += dmgData.raw;
                        }
                    });

                    // 2. Flash Assist (if any)
                    if (ast && ast !== "BOT" && ast !== "0" && event.assistedflash) {
                        const astSide = this.knownRoundTs.has(ast) ? 'T' : (this.knownRoundCTs.has(ast) ? 'CT' : undefined);
                        const FLASH_WEIGHT = 30;
                        contributors.push({ sid: ast, rawDamage: FLASH_WEIGHT, weightedDamage: FLASH_WEIGHT, isFlash: true, side: astSide });
                        totalRawDamage += FLASH_WEIGHT;
                    }

                    let totalPenalty = 0;

                    // Distribute Shares
                    if (totalRawDamage > 0) {
                        // Fixed Share to Killer
                        const attStats = this.getRoundStats(att);
                        const killerE = isFriendlyKill ? 1.0 : E;
                        const killerShare = (V_rem * FIXED_SHARE * killerE);
                        attStats.killShareRating += killerShare * multiplier;
                        if (isFriendlyKill) totalPenalty += killerShare;

                        // Damage/Flash Share to Contributors
                        const assistPool = V_rem * DAMAGE_SHARE;
                        contributors.forEach(c => {
                            // 权重始终基于原始伤害
                            const shareRatio = c.rawDamage / totalRawDamage; 
                            // 基础奖励
                            const baseShare = shareRatio * assistPool; 
                            
                            const pStats = this.getRoundStats(c.sid);
                            let share = 0;
                            
                            if (c.isFlash) {
                                share = baseShare * 1.0; // 闪光助攻不适用经济修正
                            } else {
                                // 提取该玩家造成伤害时的平均经济系数
                                const E_avg = c.rawDamage > 0 ? c.weightedDamage / c.rawDamage : 1.0; 
                                // 最终奖励乘上经济系数
                                share = baseShare * E_avg; 
                            }
                            
                            // If contributor is on the victim's team, they get a penalty (negative share)
                            const cMultiplier = (c.side === victimSide) ? -1.0 : 1.0;
                            pStats.killShareRating += share * cMultiplier;
                            
                            // Accumulate penalty to distribute to opposing team
                            if (cMultiplier < 0) {
                                totalPenalty += share;
                            }
                        });
                    } else {
                        // Fallback: If no damage recorded, killer takes all
                        const attStats = this.getRoundStats(att);
                        const killerE = isFriendlyKill ? 1.0 : E;
                        const fallbackShare = (V_rem * killerE);
                        attStats.killShareRating += fallbackShare * multiplier;
                        if (isFriendlyKill) totalPenalty += fallbackShare;
                    }

                    // NEW: Reward the victim and opposing team for the friendly kill
                    if (isFriendlyKill) {
                        // 1. Give the exact penalty amount to the victim
                        const vicStats = this.getRoundStats(vic);
                        vicStats.killShareRating += totalPenalty;

                        // 2. Distribute the exact penalty amount to surviving opposing players
                        const opposingTeam = attackerSide === 'T' ? ctPlayers : tPlayers;
                        const survivingOpponents: string[] = [];
                        if (opposingTeam) {
                            opposingTeam.forEach(oppSid => {
                                const oppStats = this.getRoundStats(oppSid);
                                if (oppStats.survived) {
                                    survivingOpponents.push(oppSid);
                                }
                            });
                        }

                        if (survivingOpponents.length > 0) {
                            const rewardPerPlayer = totalPenalty / survivingOpponents.length;
                            survivingOpponents.forEach(oppSid => {
                                const oppStats = this.getRoundStats(oppSid);
                                oppStats.killShareRating += rewardPerPlayer;
                            });
                        }
                    } else if (totalPenalty > 0) {
                        // If it's a normal kill, but there were friendly fire contributors,
                        // give their penalty amount to the killer's team (surviving players)
                        const killerTeam = attackerSide === 'T' ? tPlayers : ctPlayers;
                        const survivingKillerTeam: string[] = [];
                        if (killerTeam) {
                            killerTeam.forEach(sid => {
                                if (this.getRoundStats(sid).survived) {
                                    survivingKillerTeam.push(sid);
                                }
                            });
                        }
                        
                        if (survivingKillerTeam.length > 0) {
                            const rewardPerPlayer = totalPenalty / survivingKillerTeam.length;
                            survivingKillerTeam.forEach(sid => {
                                this.getRoundStats(sid).killShareRating += rewardPerPlayer;
                            });
                        }
                    }
                }
            }
            
            if (ast !== "BOT" && ast !== vic && ast !== att && ast !== "0" && !isFriendlyKill) {
                const astStats = this.getRoundStats(ast);
                astStats.assists++;
            }
            
            this.recentDeaths.push({ victim: vic, killer: att, tick });
        }

        const probAfterEvent = this.wpaEngine.getCurrentWinProb();

        const ratingsAfter = this.getCurrentRatings();
        const ratingUpdates: { steamid: string, ratingDelta: number }[] = [];
        ratingsAfter.forEach((ratingAfter, sid) => {
            const ratingBefore = ratingsBefore.get(sid) || 0;
            const delta = ratingAfter - ratingBefore;
            if (Math.abs(delta) > 0.001) {
                ratingUpdates.push({ steamid: sid, ratingDelta: delta });
            }
        });

        return { 
            timeUpdates, 
            eventUpdates,
            timeProbDelta: probAfterTime - probBeforeTime,
            eventProbDelta: probAfterEvent - probAfterTime,
            ratingUpdates,
            duelStats
        };
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
        this.commitWPAUpdates(closureUpdates, 0); // Use 0 for end of round tick

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
                // Mapping is now applied per-round in calculateRoundRating
                // So avgRating is already the mapped average.
                const finalRating = avgRating; 
                
                playerStats.rating = parseFloat(finalRating.toFixed(2));
                
                // New WPA Field (Per-round average)
                const avgWPA = ratingData.sumWPA / ratingData.rounds;
                playerStats.wpa = parseFloat(avgWPA.toFixed(2));
                playerStats.we = playerStats.wpa;
                
                // Accumulators for Tournament Aggregation
                playerStats.r3_wpa_accum = ratingData.sumWPA;
                playerStats.r3_rounds_played = ratingData.rounds;
                
            } else {
                playerStats.rating = 0.00;
                playerStats.wpa = 0.00;
                playerStats.r3_wpa_accum = 0;
            }
        });
    }
}
