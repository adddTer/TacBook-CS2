
import { PlayerMatchStats } from "../../types";
import { InventoryTracker } from "./InventoryTracker";
import { HealthTracker } from "./HealthTracker";
import { WPAEngine, type WPAUpdate } from "./WPAEngine";
import { normalizeSteamId } from "../demo/helpers";
import type { RoundContext } from "./ratingTypes"; // Changed from ./types
import { getExpectedWinRate } from "./economy";
import { calculateRoundRating } from "./rating/formula";

export type { RoundContext }; 

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
                botKills: 0 // Init
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

    public handleDefuseStart(sid: string, hasKit: boolean) {
        // Delegate to WPA Engine
        this.wpaEngine.handleDefuseStart(sid, hasKit);
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
    ): { timeUpdates: any[], eventUpdates: any[], timeProbDelta: number, eventProbDelta: number, ratingUpdates: { steamid: string, ratingDelta: number }[] } | void {
        const type = event.event_name;
        const tick = event.tick || 0;
        const TICK_RATE = 64; 
        
        let eventUpdates: any[] = [];
        let timeUpdates: any[] = [];

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

        if (['item_pickup', 'item_drop', 'item_purchase'].includes(type)) {
            this.inventory.handleItemEvent(event);
        }

        if (type === 'round_announce_match_start') {
            this.playerRatings.clear();
            this.roundStats.clear();
            this.wpaEngine.startNewRound();
            this.inventory.reset(); 
            this.roundStartTick = 0; // Reset timer anchor
            return { timeUpdates, eventUpdates, timeProbDelta: 0, eventProbDelta: 0 };
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
            this.wpaEngine.commitUpdates(timeUpdates);
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
                vMap.set(vic, (vMap.get(vic) || 0) + actualDmg);
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
                        this.wpaEngine.commitUpdates(wpaUpdates);
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
                        this.wpaEngine.commitUpdates(wpaUpdates);
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
            this.wpaEngine.commitUpdates(wpaUpdates);
        }

        if (type === 'bomb_exploded') {
            const wpaUpdates = this.wpaEngine.handleExplosion(
                timeElapsed, tPlayers, ctPlayers
            );
            eventUpdates.push(...wpaUpdates);
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
                        damageContributors.set(attackerSid, victimMap.get(vic)!);
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
                    this.wpaEngine.commitUpdates(updates);
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
                    const pExpKiller = getExpectedWinRate(attValue, vicValue, attackerSide || 'CT', !!isFriendlyKill, isWorldOrSuicide);
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
                    let totalWeight = 0;
                    const contributors: { sid: string, weight: number, isFlash: boolean, side?: 'T' | 'CT' }[] = [];

                    // 1. Damage Contributors
                    this.damageGraph.forEach((victimMap, attackerSid) => {
                        if (victimMap.has(vic)) {
                            const contributorSide = this.knownRoundTs.has(attackerSid) ? 'T' : (this.knownRoundCTs.has(attackerSid) ? 'CT' : undefined);
                            const dmg = victimMap.get(vic)!;
                            contributors.push({ sid: attackerSid, weight: dmg, isFlash: false, side: contributorSide });
                            totalWeight += dmg;
                        }
                    });

                    // 2. Flash Assist (if any)
                    if (ast && ast !== "BOT" && ast !== "0" && event.assistedflash) {
                        const astSide = this.knownRoundTs.has(ast) ? 'T' : (this.knownRoundCTs.has(ast) ? 'CT' : undefined);
                        const FLASH_WEIGHT = 30;
                        contributors.push({ sid: ast, weight: FLASH_WEIGHT, isFlash: true, side: astSide });
                        totalWeight += FLASH_WEIGHT;
                    }

                    let totalPenalty = 0;

                    // Distribute Shares
                    if (totalWeight > 0) {
                        // Fixed Share to Killer
                        const attStats = this.getRoundStats(att);
                        const killerShare = (V_rem * FIXED_SHARE * E);
                        attStats.killShareRating += killerShare * multiplier;
                        if (isFriendlyKill) totalPenalty += killerShare;

                        // Damage/Flash Share to Contributors
                        const assistPool = V_rem * DAMAGE_SHARE;
                        contributors.forEach(c => {
                            const shareRatio = c.weight / totalWeight;
                            const pStats = this.getRoundStats(c.sid);
                            let share = 0;
                            if (c.isFlash) {
                                share = (shareRatio * assistPool * 1.0); // Flash doesn't use E
                            } else {
                                share = (shareRatio * assistPool * E); // Damage uses E
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
                        const fallbackShare = (V_rem * E);
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
            ratingUpdates
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
