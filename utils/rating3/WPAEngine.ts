
import { Side } from "../../types";
import type { WPAUpdate } from "./ratingTypes"; // Changed from ./types
import { MATRIX_PRE, MATRIX_POST, COEFF } from "./wpa/constants";

export type { WPAUpdate }; 

export class WPAEngine {
    // State
    private tAlive: number = 5;
    private ctAlive: number = 5;
    private tHealth: number = 500;
    private ctHealth: number = 500;
    
    private isPlanted: boolean = false;
    private plantTime: number = 0; 
    private roundTime: number = 115; 
    private currentWinProb: number = 0.5;
    
    private roundStartEconMod: number = 0;
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
        this.tHealth = 500;
        this.ctHealth = 500;
        this.isPlanted = false;
        this.isDefusedState = false;
        this.isExplodedState = false;
        this.plantTime = 0;
        this.roundTime = 115;
        this.currentWinProb = 0.5;
        this.roundStartEconMod = 0;
        this.ctKits = 0;
        this.roundResult = null;
        this.playerRoundWPA.clear();
    }

    public startNewRound() {
        this.reset();
    }

    public initializeRound(tEquip: number, ctEquip: number) {
        const diff = tEquip - ctEquip;
        const sign = Math.sign(diff);
        const magnitude = Math.log(1 + Math.abs(diff) / COEFF.ECON_NORM);
        
        this.roundStartEconMod = (sign * magnitude * COEFF.ECONOMY) || 0;
        // Recalculate initial prob with new econ mod
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

    private calculateWinProb(): number {
        const tIdx = Math.max(0, Math.min(5, this.tAlive));
        const ctIdx = Math.max(0, Math.min(5, this.ctAlive));
        
        // --- TERMINAL STATE OVERRIDES ---
        if (this.isDefusedState) return 0.0; // CT Win (T Prob 0.0)
        if (this.isExplodedState) return 1.0; // T Win (T Prob 1.0)
        
        // Standard Elimination Checks
        if (!this.isPlanted && this.tAlive === 0) return 0.0; // T eliminated before plant -> CT Win
        if (this.isPlanted && this.ctAlive === 0) return 1.0; // CT eliminated after plant -> T Win
        
        // FAILSAFE: If C4 time runs out and not defused, T Wins.
        if (this.isPlanted && this.roundTime <= 0.1 && !this.isDefusedState) {
            return 1.0;
        }

        let p = 0.5;

        if (this.isPlanted) {
            // Post-Plant Logic
            p = MATRIX_POST[tIdx][ctIdx];

            // [Bug Fix] Include dampened Economy Modifier in Post-Plant
            p += (this.roundStartEconMod * 0.3);

            // --- Retrospective Retake Correction (v4.0) ---
            // Determine Scenario
            let isScenario1 = false; // Defused (CT Win)
            // Default to Scenario 2 (Exploded / T Win / Unknown)
            // If we don't know the result, we assume standard time decay (Scenario 2).
            // This prevents probability from staying flat when time runs out.

            if (this.roundResult && this.roundResult.winner === 'CT') {
                // CT Win + Planted = Scenario 1 (Defuse)
                isScenario1 = true;
            }
            
            // Debug Log for Scene Logic
            if (this.isPlanted && Math.random() < 0.1) {
                 console.log(`[WPA_DEBUG] Post-Plant Calc:
                    RoundResult: ${this.roundResult ? JSON.stringify(this.roundResult) : 'NULL'}
                    Winner: ${this.roundResult?.winner}
                    Defuser: ${this.roundResult?.defuserSid}
                    Scenario1 (Defuse): ${isScenario1}
                    TimeRemaining: ${this.roundTime.toFixed(1)}
                    Alive: T=${this.tAlive}, CT=${this.ctAlive}
                    DefusedState: ${this.isDefusedState}
                    ExplodedState: ${this.isExplodedState}
                 `);
            }
            
            const ctProbBase = 1.0 - p;
            let x = 1.0;

            // Apply Time Decay based on Scenario
            const timePassed = Math.max(0, COEFF.C4_TIME - this.roundTime);
            
            // Helper for Piecewise Linear Interpolation
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

            if (isScenario1) {
                // Scenario 1: Defuse Success (CT Win)
                
                // SPECIAL CASE: If T are all dead, CT win is guaranteed (100%)
                // "无论何时，T方全部被消灭后，胜率升至100%，系数恢复为1.0。"
                // FIX: Only applies in Scenario 1 (CT Win). In Scenario 2 (T Win), T dead doesn't mean CT Win (bomb could explode).
                if (this.tAlive === 0) {
                     return 0.0; // T Prob = 0.0 -> CT Prob = 1.0
                }

                // Data Points: 0s:1.0, 10s:0.95, 20s:0.82, 28s:0.68, 35s:0.40
                // We extrapolate 40s to 0.20 to maintain the "slow decay" trend
                const points = [
                    [0, 1.0],
                    [10, 0.95],
                    [20, 0.82],
                    [28, 0.68],
                    [35, 0.40],
                    [40, 0.20]
                ];
                x = interpolate(timePassed, points);
                
            } else {
                // Scenario 2: Bomb Exploded / T Win / Unknown
                // Data Points: 0-28s same as above.
                // 32s:0.35, 35s:0.08, 37s:0.0
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
                x = interpolate(timePassed, points);
            }
            
            // Apply multiplier to CT Win Probability
            const ctProb = ctProbBase * x;
            p = 1.0 - ctProb;
        } else {
            // Pre-Plant Logic
            p = MATRIX_PRE[tIdx][ctIdx];
            p += this.roundStartEconMod;
            
            // Time Decay (Pre-Plant Only)
            if (this.roundTime < COEFF.TIME_PANIC) {
                const panicFactor = Math.pow((COEFF.TIME_PANIC - Math.max(0, this.roundTime)) / COEFF.TIME_PANIC, 3);
                p = p * (1.0 - panicFactor);
            }
        }

        // Health Modifier
        const hpDiff = this.tHealth - this.ctHealth;
        const hpMod = COEFF.HEALTH * (hpDiff / 500.0);
        p += hpMod;

        return Math.max(0.0, Math.min(1.0, p));
    }

    // --- Event Handlers ---

    public handleDamage(
        attackerSid: string, victimSid: string, attackerSide: 'T' | 'CT', 
        damage: number, timeElapsed: number,
        allTs: string[], allCTs: string[]
    ): WPAUpdate[] {
        this.updateRoundTime(timeElapsed); 
        // ... (Rest is same)
        if (attackerSide === 'T') this.ctHealth = Math.max(0, this.ctHealth - damage);
        else this.tHealth = Math.max(0, this.tHealth - damage);

        return this.generateUpdates(
            [attackerSid], [], victimSid, allTs, allCTs, 'damage'
        );
    }

    public handleKill(
        killerSid: string, victimSid: string, victimSide: 'T' | 'CT',
        assisters: { sid: string, isFlash?: boolean }[], 
        timeElapsed: number,
        allTs: string[], allCTs: string[],
        kitsLost: boolean = false, 
        damageContributors: Map<string, number> = new Map(),
        currentTick: number = 0 // NEW
    ): WPAUpdate[] {
        this.updateRoundTime(timeElapsed); 

        // Update Alive Counts BEFORE calculation to get new state probability
        if (victimSide === 'T') this.tAlive--;
        else {
            this.ctAlive--;
            if (kitsLost) this.ctKits = Math.max(0, this.ctKits - 1);
        }
        
        return this.generateUpdates(
            [killerSid], 
            assisters.map(a => ({ sid: a.sid, weight: a.isFlash ? 0.35 : 0.25 })),
            victimSid,
            allTs, allCTs,
            'kill',
            { killerSid, damageContributors, assisters },
            currentTick
        );
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
        
        // Optimization: Ignore small time decays to reduce noise
        if (Math.abs(newProb - prevProb) < 0.005) {
            // Even if small, we MUST update currentWinProb so the next event doesn't inherit the drift
            this.currentWinProb = newProb;
            return [];
        }
        
        this.currentWinProb = newProb;
        const probDelta = newProb - prevProb;
        const totalPoints = probDelta * COEFF.SCALING;
        
        const updates: WPAUpdate[] = [];
        
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
        this.updateRoundTime(timeElapsed);

        if (type === 'plant') {
            // FIX: Prevent double plant events (e.g. from bugs or weird demo data) from resetting state
            if (this.isPlanted) {
                return [];
            }
            this.isPlanted = true;
            this.plantTime = timeElapsed; 
            this.roundTime = COEFF.C4_TIME; 
            if (ctKitsCount !== undefined) this.ctKits = ctKitsCount;
        } else {
            this.isDefusedState = true; // NEW
            this.tAlive = 0; // Defuse = Immediate Loss for T
        }

        return this.generateUpdates(
            [playerSid], [], null, allTs, allCTs, type
        );
    }

    public handleExplosion(
        timeElapsed: number,
        allTs: string[], allCTs: string[]
    ): WPAUpdate[] {
        this.updateRoundTime(timeElapsed);
        
        const prevProb = this.currentWinProb;
        this.isExplodedState = true; // Force 1.0
        const newProb = this.calculateWinProb(); // Should return 1.0
        this.currentWinProb = newProb;
        
        const probDelta = newProb - prevProb;
        const totalPoints = probDelta * COEFF.SCALING;
        
        const updates: WPAUpdate[] = [];
        
        if (Math.abs(totalPoints) < 0.001) return [];
        
        // Distribute Gain to T Team
        this.distributeToSide(totalPoints, allTs, updates);
        
        // Distribute Loss to CT Team
        this.distributeToSide(-totalPoints, allCTs, updates);
        
        return updates;
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
            damageContributors: Map<string, number>,
            assisters: { sid: string, isFlash?: boolean }[]
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
             const penaltyTotal = -impactMagnitude;
             
             let killerFixedShare = impactMagnitude * 0.5;
             let weightedPool = impactMagnitude * 0.5;
             
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
                 const defuserBonus = impactMagnitude * 0.35;
                 
                 // If Killer IS Defuser, they get this bonus + their normal share
                 // If Killer is NOT Defuser, Defuser gets this bonus separate.
                 
                 updates.push({ sid: defuserSid, delta: defuserBonus, ...debugInfo });

                 // Reduce the pool for standard distribution
                 // Remaining: 65%
                 killerFixedShare = impactMagnitude * 0.325; // 0.65 * 0.5
                 weightedPool = impactMagnitude * 0.325;     // 0.65 * 0.5
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
             if (totalWeight > 0) {
                 weights.forEach((w, sid) => {
                     const share = (w / totalWeight) * weightedPool;
                     const existing = updates.find(u => u.sid === sid);
                     if (existing) existing.delta += share;
                     else updates.push({ sid, delta: share, ...debugInfo });
                 });
             } else {
                 // If no contributors, give weighted pool to killer
                 const existing = updates.find(u => u.sid === killContext.killerSid);
                 if (existing) existing.delta += weightedPool;
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
    
    public getTradeRestoration(victimSid: string): WPAUpdate {
        return { sid: victimSid, delta: 0, reason: 'trade_bonus' };
    }
}
