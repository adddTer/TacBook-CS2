
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
    private roundResult: { winner: 'T' | 'CT', reason: number, endTick: number, defuserSid?: string } | null = null;
    
    // NEW: Terminal State Flags
    private isDefusedState: boolean = false;
    private isExplodedState: boolean = false;

    // Accumulators
    private playerRoundWPA = new Map<string, number>();

    constructor() {
        this.reset();
    }

    public setRoundResult(result: { winner: 'T' | 'CT', reason: number, endTick: number, defuserSid?: string }) {
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
            if (this.roundResult) {
                // Determine Scenario
                let isScenario1 = false; // Defused (CT Win)
                let isScenario2 = false; // Exploded / T Win

                if (this.roundResult.winner === 'CT') {
                    // CT Win + Planted = Scenario 1 (Defuse)
                    isScenario1 = true;
                } else {
                    // T Win + Planted = Scenario 2 (Explosion or CT Eliminated)
                    isScenario2 = true;
                }
                
                const ctProbBase = 1.0 - p;
                let x = 1.0;

                if (isScenario1) {
                    // Scenario 1: Defuse Success
                    if (this.tAlive === 0) {
                        return 0.0; // Lock to CT Win (T Prob = 0) if all T are dead
                    }
                    
                    // "Time decay effect on WP should be weakened."
                    // "Always keep slow decay, never accelerate."
                    // Use linear slow decay: 1.0 -> 0.5 over 40s.
                    const timePassed = Math.max(0, COEFF.C4_TIME - this.roundTime);
                    const decayRate = 0.5 / 40.0;
                    x = Math.max(0.5, 1.0 - (decayRate * timePassed));
                    
                } else {
                    // Scenario 2: Bomb Exploded / T Win
                    // Multiplier x(t) applied to CT win probability
                    // Front 24s: Slow decay. Back 16s: Fast decay.
                    // t=0 (Plant): x=1
                    // t=24 (24s elapsed, 16s remaining): Breakpoint
                    // t=40 (40s elapsed, 0s remaining): x=0
                    
                    const timePassed = Math.max(0, COEFF.C4_TIME - this.roundTime);
                    
                    if (timePassed <= 24) {
                        // Slow decay phase (0 to 24s)
                        // Starts at 1.0. Ends at 0.6 (assumption for "slow").
                        const progress = timePassed / 24.0;
                        x = 1.0 - (0.4 * progress); // 1.0 -> 0.6
                    } else {
                        // Fast decay phase (24 to 40s)
                        // Starts at 0.6. Ends at 0.0.
                        // Target: 0.0 at 1s remaining (timePassed = 39)
                        // Duration: 39 - 24 = 15s
                        
                        const progress = (timePassed - 24) / 15.0;
                        // Linear: 0.6 * (1 - p)
                        // Square: 0.6 * (1 - p)^2
                        const factor = Math.max(0, 1.0 - progress);
                        x = 0.6 * (factor * factor); 
                    }
                }
                
                // Apply multiplier to CT Win Probability
                const ctProb = ctProbBase * x;
                p = 1.0 - ctProb;
            }
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
        damageContributors: Map<string, number> = new Map()
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
            { killerSid, damageContributors, assisters }
        );
    }

    public handleDefuseStart(sid: string, hasKit: boolean) {
        // Deprecated: Logic moved to retrospective window
    }
    
    public handlePlayerDeath(sid: string) {
        // Deprecated
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
        }
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
        const isPostPlantCTWin = this.isPlanted && this.roundResult?.winner === 'CT' && !!defuserSid;

        // --- Kill Logic ---
        if (killContext && reason === 'kill') {
             const impactMagnitude = Math.abs(totalPoints);
             const penaltyTotal = -impactMagnitude;
             
             let killerFixedShare = impactMagnitude * 0.5;
             let weightedPool = impactMagnitude * 0.5;
             
             // DEFUSER BONUS (35%)
             // If we are in a CT Win Post-Plant scenario, the defuser gets 35% of the credit for kills.
             if (isPostPlantCTWin && defuserSid && allCTs.includes(defuserSid)) {
                 const defuserBonus = impactMagnitude * 0.35;
                 
                 // If Killer IS Defuser, they get this bonus + their normal share (calculated from reduced pool)
                 // If Killer is NOT Defuser, Defuser gets this bonus separate.
                 
                 if (killContext.killerSid !== defuserSid) {
                     updates.push({ sid: defuserSid, delta: defuserBonus, ...debugInfo });
                 } else {
                     // Killer is Defuser. We will add this bonus to their killerFixedShare later?
                     // Or just treat it as "Killer gets 35% off the top, then 50% of remainder?"
                     // Let's keep it simple: Defuser gets 35% off the top.
                     // Remaining 65% is distributed normally (50/50 split of the 65%).
                     // So Killer (Defuser) gets 35% + (65% * 0.5) = 67.5%.
                     updates.push({ sid: defuserSid, delta: defuserBonus, ...debugInfo });
                 }

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

        // --- Defuse Exception Logic (Ninja Defuse) ---
        if (reason === 'defuse') {
            // probDelta is negative (T Prob drops to 0)
            // CT gains = -probDelta
            const ctGain = -probDelta; // e.g. 0.8
            const totalGainPoints = ctGain * COEFF.SCALING;
            
            // Check if defuse started when outcome was uncertain
            // Use captured defuseStartProb if available, otherwise fallback to prevProb
            const checkProb = (this.defuseStartProb !== null) ? this.defuseStartProb : prevProb;
            
            // If T Win Prob at start was > 1% (meaning CT Win Prob < 99%)
            if (checkProb > 0.01) {
                // Calculate Total Gain from Start of Defuse
                // Gain = (1.0 - StartProb) - (1.0 - EndProb) ?? No.
                // Gain = (CT Win Prob End) - (CT Win Prob Start)
                //      = (1.0) - (1.0 - checkProb) = checkProb.
                
                // But we only have `totalGainPoints` which is based on `prevProb`.
                // If `prevProb` is 0 (because T died), `totalGainPoints` is 0.
                // But `checkProb` might be 0.8.
                // We want to award points based on `checkProb`.
                
                const effectiveGain = checkProb * COEFF.SCALING;
                
                // Determine Share based on Scenario
                // If T is still alive (Ninja Defuse / Clutch Defuse), defuser gets 100% of the gain.
                // If T is dead (Cleanup Defuse), defuser gets 35% (standard bonus).
                let shareRatio = 0.35;
                if (this.tAlive > 0) {
                    shareRatio = 1.0;
                }

                const defuserShare = effectiveGain * shareRatio;
                
                // Award to Defuser
                primaryContributors.forEach(sid => {
                    updates.push({ sid, delta: defuserShare, ...debugInfo });
                });
                
                // "Kill contributors obtain WPA correspondingly reduced".
                // We deduct this share from the REST of the team.
                // This simulates that the defuser "stole" the glory of the round win.
                const teamToPenalize = allCTs.filter(id => !primaryContributors.includes(id));
                
                if (teamToPenalize.length > 0) {
                    // Only penalize team if it's NOT a Ninja Defuse (or if user wants penalty regardless)
                    // User said: "Jame is Ninja... he should enjoy these WPA exclusively".
                    // This implies we shouldn't penalize teammates who did nothing?
                    // But if we don't penalize, we create points out of thin air.
                    // However, if teammates did nothing (0 kills), they have 0 WPA to lose?
                    // No, WPA is delta. They start at 0.
                    // If we give Jame +0.94, and teammates 0.
                    // Total CT change = +0.94.
                    // T change = -0.94 (from distributeToSide below, if prevProb was high).
                    // Wait, `totalGainPoints` is based on `prevProb`.
                    // If `prevProb` (at end) is close to `checkProb` (at start), then T loses 0.94.
                    // So Sum = +0.94 - 0.94 = 0. Balanced.
                    // So we DON'T need to penalize teammates in the Ninja case (where teammates contributed nothing).
                    
                    // But what if teammates contributed kills?
                    // If shareRatio is 1.0, we are giving the ENTIRE pot to defuser.
                    // If teammates also got points from kills earlier, the total CT gain > 1.0.
                    // So we MUST penalize teammates to balance it back.
                    // So yes, always penalize/redistribute.
                    
                    this.distributeToSide(-defuserShare, teamToPenalize, updates);
                }
                
                // Also apply the standard T Penalty (if any remaining delta exists from the actual event)
                // This ensures Ts lose points for losing the round.
                // Note: totalGainPoints is based on prevProb (last tick).
                // If prevProb was 0 (CT 100%), totalGainPoints is 0. Ts don't lose more points (they already lost them when they died).
                // If prevProb was > 0, Ts lose the remaining probability.
                if (Math.abs(totalGainPoints) > 0.001) {
                     this.distributeToSide(-totalGainPoints, allTs, updates);
                }
                
                return updates;
            }
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
