
import { Side } from "../../types";
import type { WPAUpdate } from "./ratingTypes"; // Changed from ./types
import { MATRIX_PRE, MATRIX_POST, COEFF } from "./wpa/constants";
import { getExpectedWinRate, getEquipmentIndex } from "./economy";

export type { WPAUpdate }; 

export class WPAEngine {
    // State
    private tAlive: number = 5;
    private ctAlive: number = 5;
    
    private isPlanted: boolean = false;
    private plantTime: number = 0; 
    private roundTime: number = 115; 
    private currentWinProb: number = 0.5;
    
    private tEquip: number = 0;
    private ctEquip: number = 0;
    private ctKits: number = 0; // Track defuse kits for Post-Plant calc
    
    // NEW: Retrospective Result
    private roundResult: { winner: 'T' | 'CT', reason: number, endTick: number, defuserSid?: string, defuseTick?: number } | null = null;
    
    // NEW: Terminal State Flags
    private isDefusedState: boolean = false;
    private isExplodedState: boolean = false;

    // Accumulators
    private playerRoundWPA = new Map<string, number>();

    constructor() {
        this.reset();
    }

    public setRoundResult(result: { winner: 'T' | 'CT', reason: number, endTick: number, defuserSid?: string, defuseTick?: number }) {
        // console.log('[WPAEngine] setRoundResult:', result);
        this.roundResult = result;
    }

    public reset() {
        this.tAlive = 5;
        this.ctAlive = 5;
        this.isPlanted = false;
        this.isDefusedState = false;
        this.isExplodedState = false;
        this.plantTime = 0;
        this.roundTime = 115;
        this.currentWinProb = 0.5;
        this.tEquip = 0;
        this.ctEquip = 0;
        this.ctKits = 0;
        this.roundResult = null;
        this.playerRoundWPA.clear();
    }

    public startNewRound() {
        this.reset();
    }

    public initializeRound(tEquip: number, ctEquip: number) {
        this.tEquip = tEquip;
        this.ctEquip = ctEquip;
        this.currentWinProb = this.calculateWinProb();
    }

    private updateRoundTime(timeElapsed: number) {
        if (this.isPlanted) {
            // C4 Time = 40 - (Current - PlantTime)
            const timeSincePlant = timeElapsed - this.plantTime;
            this.roundTime = Math.max(0, COEFF.C4_TIME - timeSincePlant);
        } else {
            // Round Time = 115 - Current
            this.roundTime = Math.max(0, COEFF.ROUND_TIME - timeElapsed);
        }
    }

    // --- Core Probability Calculation ---
    
    public getCurrentWinProb(): number {
        return this.currentWinProb;
    }

    private interpolateMatrix(matrix: number[][], rowVal: number, colVal: number): number {
        const r = Math.max(0, Math.min(5, rowVal));
        const c = Math.max(0, Math.min(5, colVal));
        
        const r0 = Math.floor(r);
        const r1 = Math.min(5, r0 + 1);
        const c0 = Math.floor(c);
        const c1 = Math.min(5, c0 + 1);
        
        const rFrac = r - r0;
        const cFrac = c - c0;
        
        const v00 = matrix[r0][c0];
        const v01 = matrix[r0][c1];
        const v10 = matrix[r1][c0];
        const v11 = matrix[r1][c1];
        
        const top = v00 * (1 - cFrac) + v01 * cFrac;
        const bottom = v10 * (1 - cFrac) + v11 * cFrac;
        
        return top * (1 - rFrac) + bottom * rFrac;
    }

    private calculateWinProb(): number {
        // --- TERMINAL STATE OVERRIDES ---
        if (this.isDefusedState) return 0.0; // CT Win (T Prob 0.0)
        if (this.isExplodedState) return 1.0; // T Win (T Prob 1.0)
        
        // Standard Elimination Checks
        if (this.ctAlive === 0) return 1.0; // CT all dead -> T Win (regardless of plant status)
        if (!this.isPlanted && this.tAlive === 0) return 0.0; // T eliminated before plant -> CT Win
        
        // FAILSAFE: If C4 time runs out and not defused, T Wins.
        if (this.isPlanted && this.roundTime <= 0.1 && !this.isDefusedState) {
            return 1.0;
        }

        // --- EFFECTIVE COMBAT POWER (ECONOMY MODIFIER) ---
        // Calculate average equipment value
        const tAvg = this.tAlive > 0 ? this.tEquip / this.tAlive : 0;
        const ctAvg = this.ctAlive > 0 ? this.ctEquip / this.ctAlive : 0;
        
        // Get economy index (0 = Full Buy, 5 = Full Eco)
        const tIdxEcon = getEquipmentIndex(tAvg);
        const ctIdxEcon = getEquipmentIndex(ctAvg);
        
        // Calculate strength factor (1.0 for Full Buy, ~0.72 for Full Eco)
        // This naturally scales the player's value based on their loadout
        const tStrength = 1.0 - 0.056 * tIdxEcon;
        const ctStrength = 1.0 - 0.056 * ctIdxEcon;
        
        // Calculate effective alive players
        const effT = this.tAlive * tStrength;
        const effCT = this.ctAlive * ctStrength;

        // --- PROBABILITY CALCULATION ---
        if (this.isPlanted) {
            // Post-Plant Logic: Use MATRIX_POST with effective players
            let p = this.interpolateMatrix(MATRIX_POST, effT, effCT);

            // --- Retrospective Retake Correction (v4.0) ---
            // Determine Scenario
            let isScenario1 = false; // Defused (CT Win)
            if (this.roundResult && this.roundResult.winner === 'CT') {
                isScenario1 = true;
            }

            const timePassed = Math.max(0, COEFF.C4_TIME - this.roundTime);
            
            const interpolate = (t: number, points: number[][]) => {
                if (t <= points[0][0]) return points[0][1];
                if (t >= points[points.length-1][0]) return points[points.length-1][1];
                for (let i = 0; i < points.length - 1; i++) {
                    const [t1, x1] = points[i];
                    const [t2, x2] = points[i+1];
                    if (t >= t1 && t <= t2) {
                        const ratio = (t - t1) / (t2 - t1);
                        return x1 + ratio * (x2 - x1);
                    }
                }
                return points[points.length-1][1];
            };

            const ctProbBase = 1.0 - p;

            if (isScenario1) {
                // Scenario 1: Defuse Success (CT Win)
                if (this.tAlive === 0) {
                     return 0.0; // T Prob = 0.0 -> CT Prob = 1.0
                }

                // CT win prob decays slowly
                const points = [
                    [0, 1.0],
                    [10, 0.95],
                    [20, 0.82],
                    [28, 0.68],
                    [35, 0.40],
                    [40, 0.20]
                ];
                const x = interpolate(timePassed, points);
                const ctProb = ctProbBase * x;
                p = 1.0 - ctProb; // T prob rises
                
            } else {
                // Scenario 2: Bomb Exploded / T Win / Unknown
                // CT win prob decays to 0 rapidly
                const points = [
                    [0, 1.0],
                    [10, 0.95],
                    [20, 0.82],
                    [28, 0.68],
                    [32, 0.35],
                    [35, 0.08],
                    [37, 0.0],
                    [40, 0.0]
                ];
                const x = interpolate(timePassed, points);
                const ctProb = ctProbBase * x;
                p = 1.0 - ctProb; // T prob rises
            }
            
            return Math.max(0.0, Math.min(1.0, p));
        } else {
            // Pre-Plant Logic: Use MATRIX_PRE with effective players
            let p = this.interpolateMatrix(MATRIX_PRE, effT, effCT);
            
            // Time Decay (Pre-Plant Only)
            if (this.roundTime < COEFF.TIME_PANIC) {
                const panicFactor = Math.pow((COEFF.TIME_PANIC - Math.max(0, this.roundTime)) / COEFF.TIME_PANIC, 3);
                p = p * (1.0 - panicFactor);
            }
            
            return Math.max(0.0, Math.min(1.0, p));
        }
    }

    public updateEquipment(tEquip: number, ctEquip: number, allTs: string[], allCTs: string[]): WPAUpdate[] {
        this.tEquip = tEquip;
        this.ctEquip = ctEquip;
        
        const prevProb = this.currentWinProb;
        const newProb = this.calculateWinProb();
        this.currentWinProb = newProb;
        
        const probDelta = newProb - prevProb;
        const totalPoints = probDelta * COEFF.SCALING;
        
        const updates: WPAUpdate[] = [];
        if (Math.abs(totalPoints) < 0.001) return updates;
        
        // Return a special update that RatingEngine will process
        return [{ sid: 'TEAM_DELTA', delta: totalPoints, reason: 'equipment' }];
    }

    // --- Event Handlers ---

    public handleDamage(
        attackerSid: string, victimSid: string, attackerSide: 'T' | 'CT', victimSide: 'T' | 'CT',
        damage: number, timeElapsed: number,
        allTs: string[], allCTs: string[]
    ): WPAUpdate[] {
        // Health modifier is removed, so damage does not directly affect WPA anymore.
        // We no longer process time decay here to allow it to accumulate for major events.
        return [];
    }

    public handleKill(
        killerSid: string, victimSid: string, victimSide: 'T' | 'CT', attackerSide: 'T' | 'CT',
        assisters: { sid: string, isFlash?: boolean }[], 
        timeElapsed: number,
        allTs: string[], allCTs: string[],
        kitsLost: boolean = false, 
        damageContributors: Map<string, number> = new Map(),
        currentTick: number = 0,
        isBot: boolean = false, // NEW
        contributorSides: Map<string, 'T' | 'CT'> = new Map(), // NEW
        survivingKillerTeam: string[] = [], // NEW
        tradeCompensation: { sid: string, weight: number }[] = [] // NEW
    ): WPAUpdate[] {
        // 1. Process time decay BEFORE the kill
        const timeUpdates = this.handleTimeUpdate(timeElapsed, allTs, allCTs);

        // 2. Now process the kill
        // Update Alive Counts BEFORE calculation to get new state probability
        if (victimSide === 'T') this.tAlive--;
        else {
            this.ctAlive--;
            if (kitsLost) this.ctKits = Math.max(0, this.ctKits - 1);
        }
        
        // If BOT, distribute WPA to the winning team (killer's team)
        if (isBot) {
             const prevProb = this.currentWinProb;
             const newProb = this.calculateWinProb();
             this.currentWinProb = newProb;

             const probDelta = newProb - prevProb; 
             const totalPoints = probDelta * COEFF.SCALING;
             
             const updates: WPAUpdate[] = [];
             
             // Determine winner team (gaining probability)
             const isTGaining = probDelta > 0;
             const winnerTeam = isTGaining ? allTs : allCTs;
             
             // Distribute gain to winner team
             this.distributeToSide(Math.abs(totalPoints), winnerTeam, updates);
             
             // Penalize BOT (victim) directly
             updates.push({ sid: victimSid, delta: -Math.abs(totalPoints), reason: 'bot_death' });
             
             return [...timeUpdates, ...updates];
        }
        
        const isFriendlyKill = attackerSide === victimSide;
        
        if (isFriendlyKill) {
            const prevProb = this.currentWinProb;
            const newProb = this.calculateWinProb();
            this.currentWinProb = newProb;
            
            const probDelta = newProb - prevProb;
            const totalPoints = probDelta * COEFF.SCALING;
            
            const updates: WPAUpdate[] = [];
            if (Math.abs(totalPoints) < 0.001) return timeUpdates;
            
            // If T kills T, T win prob decreases (probDelta < 0), totalPoints < 0.
            // If CT kills CT, T win prob increases (probDelta > 0), totalPoints > 0.
            const killerTeamLoss = attackerSide === 'T' ? totalPoints : -totalPoints; // Should be negative
            const opposingTeamGain = -killerTeamLoss; // Should be positive
            
            // Penalize the killer
            updates.push({ sid: killerSid, delta: killerTeamLoss, reason: 'friendly_kill' });
            
            // Reward the opposing team
            const opposingTeam = attackerSide === 'T' ? allCTs : allTs;
            this.distributeToSide(opposingTeamGain, opposingTeam, updates);
            
            return [...timeUpdates, ...updates];
        }

        const killUpdates = this.generateUpdates(
            [killerSid], 
            assisters.map(a => ({ sid: a.sid, weight: a.isFlash ? 0.35 : 0.25 })),
            victimSid,
            allTs, allCTs,
            'kill',
            { killerSid, attackerSide, damageContributors, assisters, contributorSides, survivingKillerTeam, tradeCompensation },
            currentTick
        );
        
        return [...timeUpdates, ...killUpdates];
    }

    public handleDefuseStart(sid: string, hasKit: boolean) {
        // Deprecated: Logic moved to retrospective window
    }
    
    public handlePlayerDeath(sid: string) {
        // Deprecated
    }

    public handleTimeUpdate(timeElapsed: number, allTs: string[], allCTs: string[]): WPAUpdate[] {
        this.updateRoundTime(timeElapsed);
        
        const prevProb = this.currentWinProb;
        const newProb = this.calculateWinProb();
        
        this.currentWinProb = newProb;
        const probDelta = newProb - prevProb;
        const totalPoints = probDelta * COEFF.SCALING;
        
        const updates: WPAUpdate[] = [];
        
        if (Math.abs(totalPoints) < 0.001) return [];
        
        // Distribute time decay impact to teams
        // If T Win Prob increases (probDelta > 0), T gains, CT loses.
        // If T Win Prob decreases (probDelta < 0), T loses, CT gains.
        
        if (probDelta > 0) {
            this.distributeToSide(totalPoints, allTs, updates);
            this.distributeToSide(-totalPoints, allCTs, updates);
        } else {
            this.distributeToSide(totalPoints, allTs, updates);
            this.distributeToSide(-totalPoints, allCTs, updates);
        }
        
        // Mark these updates as 'time' reason
        updates.forEach(u => u.reason = 'time');
        
        return updates;
    }

    public handleObjective(
        playerSid: string, type: 'plant' | 'defuse', timeElapsed: number,
        allTs: string[], allCTs: string[],
        ctKitsCount?: number
    ): WPAUpdate[] {
        const timeUpdates = this.handleTimeUpdate(timeElapsed, allTs, allCTs);

        if (type === 'plant') {
            // FIX: Prevent double plant events (e.g. from bugs or weird demo data) from resetting state
            if (this.isPlanted) {
                return timeUpdates;
            }
            this.isPlanted = true;
            this.plantTime = timeElapsed; 
            this.roundTime = COEFF.C4_TIME; 
            if (ctKitsCount !== undefined) this.ctKits = ctKitsCount;
        } else {
            this.isDefusedState = true; // NEW
            this.tAlive = 0; // Defuse = Immediate Loss for T
        }

        const objUpdates = this.generateUpdates(
            [playerSid], [], null, allTs, allCTs, type
        );
        
        return [...timeUpdates, ...objUpdates];
    }

    public handleExplosion(
        timeElapsed: number,
        allTs: string[], allCTs: string[]
    ): WPAUpdate[] {
        const timeUpdates = this.handleTimeUpdate(timeElapsed, allTs, allCTs);
        
        const prevProb = this.currentWinProb;
        this.isExplodedState = true; // Force 1.0
        const newProb = this.calculateWinProb(); // Should return 1.0
        this.currentWinProb = newProb;
        
        const probDelta = newProb - prevProb;
        const totalPoints = probDelta * COEFF.SCALING;
        
        const updates: WPAUpdate[] = [];
        
        if (Math.abs(totalPoints) < 0.001) return timeUpdates;
        
        // Distribute Gain to T Team
        this.distributeToSide(totalPoints, allTs, updates);
        
        // Distribute Loss to CT Team
        this.distributeToSide(-totalPoints, allCTs, updates);
        
        return [...timeUpdates, ...updates];
    }

    public finalizeRound(winnerSide: 'T' | 'CT', allTs: string[], allCTs: string[]): WPAUpdate[] {
        const target = winnerSide === 'T' ? 1.0 : 0.0;
        const gap = target - this.currentWinProb;
        
        const delta = gap * COEFF.SCALING;
        const updates: WPAUpdate[] = [];

        if (winnerSide === 'T') {
             this.distributeToSide(delta, allTs, updates);
             this.distributeToSide(-delta, allCTs, updates);
        } else {
             this.distributeToSide(delta, allTs, updates); 
             this.distributeToSide(-delta, allCTs, updates); 
        }

        this.currentWinProb = target;
        return updates;
    }

    // --- Core Logic: Zero-Sum Update Generation ---

    private generateUpdates(
        primaryContributors: string[], 
        secondaryContributors: { sid: string, weight: number }[],
        victimSid: string | null,
        allTs: string[], 
        allCTs: string[],
        reason: string,
        killContext?: {
            killerSid: string,
            attackerSide: 'T' | 'CT',
            damageContributors: Map<string, number>,
            assisters: { sid: string, isFlash?: boolean }[],
            contributorSides?: Map<string, 'T' | 'CT'>,
            survivingKillerTeam?: string[],
            tradeCompensation?: { sid: string, weight: number }[]
        },
        currentTick: number = 0
    ): WPAUpdate[] {
        const prevProb = this.currentWinProb;
        const newProb = this.calculateWinProb();
        this.currentWinProb = newProb;

        const probDelta = newProb - prevProb; 
        const totalPoints = probDelta * COEFF.SCALING;

        const updates: WPAUpdate[] = [];
        const debugInfo = { debugProbBefore: prevProb, debugProbAfter: newProb, reason };

        if (Math.abs(totalPoints) < 0.001) return [];

        // Identify Defuser (if any)
        const defuserSid = this.roundResult?.defuserSid;
        // const isPostPlantCTWin = this.isPlanted && this.roundResult?.winner === 'CT' && !!defuserSid;

        // --- Kill Logic ---
        if (killContext && reason === 'kill') {
             const impactMagnitude = Math.abs(totalPoints);
             
             // Determine if the killer's team actually gained probability.
             // If T kills CT, probDelta > 0 (T gains).
             // If CT kills T, probDelta < 0 (T loses, CT gains).
             // We assume the killer is on the team that gained probability, 
             // but to be safe, we check if the killer is T or CT and compare with probDelta.
             const isKillerT = killContext.attackerSide === 'T';
             const killerTeamGained = isKillerT ? probDelta > 0 : probDelta < 0;
             
             // If for some reason the killer's team LOST probability (e.g., weird edge case), 
             // we should penalize the killer. Otherwise, reward them.
             const killerMultiplier = killerTeamGained ? 1 : -1;
             
             const killerGainTotal = impactMagnitude * killerMultiplier;
             const penaltyTotal = -killerGainTotal;
             
             let poolMultiplier = 1.0;
             
             // DEFUSER BONUS (35%)
             // Rule: If Scenario 1 (Defuse Win) AND Kill is within 5s of Defuse, Defuser gets 35%.
             let applyDefuserBonus = false;
             
             if (this.isPlanted && this.roundResult?.winner === 'CT' && defuserSid) {
                 // Check 5s window
                 // We need endTick from roundResult and currentTick
                 // FIX: Use defuseTick if available, otherwise endTick
                 const targetTick = this.roundResult.defuseTick || this.roundResult.endTick;

                 if (targetTick > 0 && currentTick > 0) {
                     const ticksToDefuse = targetTick - currentTick;
                     const secondsToDefuse = ticksToDefuse / 64.0;
                     
                     // 5s window (allow slightly negative if tick alignment is off, but generally > -1)
                     if (secondsToDefuse <= 5.0 && secondsToDefuse >= -1.0) {
                         applyDefuserBonus = true;
                     }
                 }
             }

             if (applyDefuserBonus && defuserSid) {
                 const defuserBonus = killerGainTotal * 0.35;
                 
                 // If Killer IS Defuser, they get this bonus + their normal share
                 // If Killer is NOT Defuser, Defuser gets this bonus separate.
                 
                 updates.push({ sid: defuserSid, delta: defuserBonus, ...debugInfo });

                 // Reduce the pool for standard distribution
                 // Remaining: 65%
                 poolMultiplier = 0.65;
             }

             let c_t_total = 0;
             if (killContext.tradeCompensation) {
                 killContext.tradeCompensation.forEach(tc => c_t_total += tc.weight);
             }
             c_t_total = Math.min(c_t_total, 1.0);
             const v_rem = 1.0 - c_t_total;

             let killerFixedShare = killerGainTotal * poolMultiplier * v_rem * 0.6;
             let weightedPool = killerGainTotal * poolMultiplier * v_rem * 0.4;

             // Distribute trade compensation
             if (killContext.tradeCompensation) {
                 killContext.tradeCompensation.forEach(tc => {
                     const share = killerGainTotal * poolMultiplier * tc.weight;
                     const existing = updates.find(u => u.sid === tc.sid);
                     if (existing) existing.delta += share;
                     else updates.push({ sid: tc.sid, delta: share, ...debugInfo });
                 });
             }

             const weights = new Map<string, number>();
             let totalWeight = 0;
             killContext.damageContributors.forEach((dmg, sid) => {
                 weights.set(sid, dmg);
                 totalWeight += dmg;
             });
             killContext.assisters.forEach(a => {
                 if (a.isFlash) {
                     const current = weights.get(a.sid) || 0;
                     weights.set(a.sid, current + 30);
                     totalWeight += 30;
                 }
             });
             
             // Add Killer's Fixed Share
             const existingKiller = updates.find(u => u.sid === killContext.killerSid);
             if (existingKiller) existingKiller.delta += killerFixedShare;
             else updates.push({ sid: killContext.killerSid, delta: killerFixedShare, ...debugInfo });
             
             // Distribute Weighted Pool
             let totalPenaltyToRedistribute = 0;
             if (totalWeight > 0) {
                 weights.forEach((w, sid) => {
                     let share = (w / totalWeight) * weightedPool;
                     
                     // If contributor is on the victim's team (friendly fire), they get a penalty
                     const side = killContext.contributorSides?.get(sid);
                     if (side && side !== killContext.attackerSide) {
                         totalPenaltyToRedistribute += share; // Keep original sign
                         share = -share;
                     }
                     
                     const existing = updates.find(u => u.sid === sid);
                     if (existing) existing.delta += share;
                     else updates.push({ sid, delta: share, ...debugInfo });
                 });
             } else {
                 // If no contributors, give weighted pool to killer
                 const existing = updates.find(u => u.sid === killContext.killerSid);
                 if (existing) existing.delta += weightedPool;
             }
             
             // If there was friendly fire, the penalty is distributed as a reward to the killer's team
             if (Math.abs(totalPenaltyToRedistribute) > 0) {
                 // 1. Compensate the victim
                 if (victimSid) {
                     const existingVictim = updates.find(u => u.sid === victimSid);
                     if (existingVictim) existingVictim.delta += totalPenaltyToRedistribute;
                     else updates.push({ sid: victimSid, delta: totalPenaltyToRedistribute, ...debugInfo });
                 }

                 // 2. Reward the killer's team (surviving players)
                 const survivingKillerTeam = killContext.survivingKillerTeam;
                 if (survivingKillerTeam && survivingKillerTeam.length > 0) {
                     const rewardPerPlayer = totalPenaltyToRedistribute / survivingKillerTeam.length;
                     survivingKillerTeam.forEach(sid => {
                         const existing = updates.find(u => u.sid === sid);
                         if (existing) existing.delta += rewardPerPlayer;
                         else updates.push({ sid, delta: rewardPerPlayer, ...debugInfo });
                     });
                 }
             }
             
             // Victim Penalty
             if (victimSid) updates.push({ sid: victimSid, delta: penaltyTotal, ...debugInfo });
             
             return updates;
         }

        // --- Defuse Exception Logic ---
        if (reason === 'defuse') {
            // probDelta is negative (T Prob drops to 0)
            // CT gains = -probDelta
            const ctGain = -probDelta; 
            const totalGainPoints = ctGain * COEFF.SCALING;
            
            // User Request:
            // 1. If T alive > 0: Defuser gets remaining WPA (probDelta). T survivors share loss.
            // 2. If T alive == 0: Standard logic (likely 0 delta).
            
            if (this.tAlive > 0) {
                // Give 100% of the gain to the defuser
                primaryContributors.forEach(sid => {
                    updates.push({ sid, delta: totalGainPoints, ...debugInfo });
                });
                
                // Distribute loss to Ts
                // Note: totalGainPoints is positive (CT gain). We need to penalize Ts.
                // probDelta is negative. totalPoints is negative.
                // So we distribute totalPoints (negative) to Ts.
                this.distributeToSide(totalPoints, allTs, updates);
                
                return updates;
            }
            
            // If T alive == 0, fall through to standard logic (or handle here)
            // If T alive == 0, prob should be 0.0 or close to it.
            // If prob was not 0.0 (e.g. 0.01), then we have a small delta.
            // Standard logic below distributes to primaryContributors (defuser).
        }

        // --- Standard Logic for Plant/Defuse/Damage ---

        let totalAssistWeight = 0;
        secondaryContributors.forEach(c => totalAssistWeight += c.weight);
        const killerShare = 1.0 - Math.min(0.8, totalAssistWeight); 

        // 1. Contributors (Gain)
        primaryContributors.forEach(sid => {
            updates.push({ 
                sid, 
                delta: Math.abs(totalPoints) * killerShare / primaryContributors.length,
                ...debugInfo
            });
        });

        secondaryContributors.forEach(c => {
            updates.push({
                sid: c.sid,
                delta: Math.abs(totalPoints) * c.weight,
                ...debugInfo
            });
        });

        // 2. Victims (Loss)
        const impactMagnitude = Math.abs(totalPoints);
        const penaltyTotal = -impactMagnitude;

        if (victimSid) {
            updates.push({
                sid: victimSid,
                delta: penaltyTotal,
                ...debugInfo
            });
        } else {
            const isTGaining = probDelta > 0;
            const loserTeam = isTGaining ? allCTs : allTs;
            this.distributeToSide(penaltyTotal, loserTeam, updates);
        }

        return updates;
    }

    private distributeToSide(amount: number, players: string[], updates: WPAUpdate[]) {
        if (!players || players.length === 0) return;
        const share = amount / players.length;
        players.forEach(sid => {
            updates.push({ sid, delta: share });
        });
    }

    public commitUpdates(updates: WPAUpdate[]) {
        updates.forEach(u => {
            const current = this.playerRoundWPA.get(u.sid) || 0;
            this.playerRoundWPA.set(u.sid, current + u.delta);
        });
    }

    public getPlayerRoundWPA(sid: string): number {
        return this.playerRoundWPA.get(sid) || 0;
    }
}
