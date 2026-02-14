import { Side } from "../../types";

export interface WPAUpdate {
    sid: string;
    delta: number;
    debugProbBefore?: number;
    debugProbAfter?: number;
    reason?: string;
}

// --- Configuration Constants ---

// Pre-Plant Matrix (Balanced)
// Rows: T Alive (0-5), Cols: CT Alive (0-5)
// T win probability
const MATRIX_PRE: number[][] = [
    // CT: 0     1     2     3     4     5
    [0.00, 0.00, 0.00, 0.00, 0.00, 0.00], // 0 T
    [1.00, 0.50, 0.20, 0.10, 0.05, 0.02], // 1 T
    [1.00, 0.80, 0.50, 0.30, 0.15, 0.08], // 2 T
    [1.00, 0.90, 0.70, 0.50, 0.35, 0.20], // 3 T
    [1.00, 0.95, 0.85, 0.65, 0.50, 0.35], // 4 T
    [1.00, 0.98, 0.92, 0.80, 0.65, 0.50]  // 5 T (5v5 = 0.50)
];

// Post-Plant Matrix (T Advantage)
const MATRIX_POST: number[][] = [
    // CT: 0     1     2     3     4     5
    [0.00, 0.00, 0.00, 0.00, 0.00, 0.00], // 0 T
    [1.00, 0.35, 0.15, 0.08, 0.05, 0.02], // 1 T
    [1.00, 0.70, 0.45, 0.25, 0.15, 0.08], // 2 T
    [1.00, 0.88, 0.75, 0.55, 0.35, 0.20], // 3 T
    [1.00, 0.95, 0.90, 0.80, 0.65, 0.45], // 4 T
    [1.00, 0.99, 0.98, 0.92, 0.85, 0.70]  // 5 T
];

const COEFF = {
    ECONOMY: 0.15,       
    ECON_NORM: 5000,     
    HEALTH: 0.05,        
    TIME_PANIC: 30,      
    SCALING: 100.0,
    ROUND_TIME: 115,     // 1:55
    C4_TIME: 40          // 40s
};

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

    // Accumulators
    private playerRoundWPA = new Map<string, number>();

    constructor() {
        this.reset();
    }

    public reset() {
        this.tAlive = 5;
        this.ctAlive = 5;
        this.tHealth = 500;
        this.ctHealth = 500;
        this.isPlanted = false;
        this.plantTime = 0;
        this.roundTime = 115;
        this.currentWinProb = 0.5;
        this.roundStartEconMod = 0;
        this.ctKits = 0;
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
        
        let p = 0.5;

        if (this.isPlanted) {
            // Post-Plant Logic
            p = MATRIX_POST[tIdx][ctIdx];

            // [Bug Fix] Include dampened Economy Modifier in Post-Plant
            // Guns still matter in retakes, but less than in open play.
            p += (this.roundStartEconMod * 0.3);

            const maxC4 = COEFF.C4_TIME;
            
            // [Bug Fix] No Kit Penalty
            // If CT has 0 kits and time < 10s, defuse is mathematically impossible (needs 10s).
            // T win probability becomes 100%.
            if (this.ctKits === 0 && this.roundTime < 10) {
                 p = 1.0;
            } else if (this.roundTime < maxC4) {
                // Standard Time Pressure
                const timeFactor = (maxC4 - this.roundTime) / maxC4;
                const boost = Math.pow(timeFactor, 2) * 0.5; 
                p = p + (1.0 - p) * boost;
            }

        } else {
            // Pre-Plant Logic
            p = MATRIX_PRE[tIdx][ctIdx] + this.roundStartEconMod;
            
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

        if (attackerSide === 'T') this.ctHealth = Math.max(0, this.ctHealth - damage);
        else this.tHealth = Math.max(0, this.tHealth - damage);

        return this.generateUpdates(
            [attackerSid], 
            [], 
            victimSid, 
            allTs, allCTs,
            'damage'
        );
    }

    public handleKill(
        killerSid: string, victimSid: string, victimSide: 'T' | 'CT',
        assisters: { sid: string, isFlash?: boolean }[], 
        timeElapsed: number,
        allTs: string[], allCTs: string[],
        kitsLost: boolean = false // [Bug Fix] Track kit loss
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
            'kill'
        );
    }

    public handleObjective(
        playerSid: string, type: 'plant' | 'defuse', timeElapsed: number,
        allTs: string[], allCTs: string[],
        ctKitsCount?: number // [Bug Fix] Initial kit count on plant
    ): WPAUpdate[] {
        this.updateRoundTime(timeElapsed);

        if (type === 'plant') {
            this.isPlanted = true;
            this.plantTime = timeElapsed; 
            this.roundTime = COEFF.C4_TIME; 
            if (ctKitsCount !== undefined) this.ctKits = ctKitsCount;
        } else {
            this.tAlive = 0; // Defuse = Immediate Loss for T
        }

        return this.generateUpdates(
            [playerSid], 
            [], 
            null, 
            allTs, allCTs, 
            type
        );
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
        reason: string
    ): WPAUpdate[] {
        const prevProb = this.currentWinProb;
        const newProb = this.calculateWinProb();
        this.currentWinProb = newProb;

        const probDelta = newProb - prevProb; 
        const totalPoints = probDelta * COEFF.SCALING;

        const updates: WPAUpdate[] = [];
        const debugInfo = { debugProbBefore: prevProb, debugProbAfter: newProb, reason };

        if (Math.abs(totalPoints) < 0.001) return [];

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

        // 2. Victims (Loss) - Opposite sign of probDelta for T view
        const impactMagnitude = Math.abs(totalPoints);
        const penaltyTotal = -impactMagnitude;

        if (victimSid) {
            updates.push({
                sid: victimSid,
                delta: penaltyTotal,
                ...debugInfo
            });
        } else {
            // If no specific victim (e.g. bomb plant), distribute penalty to opposing team
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
        return { sid: victimSid, delta: 5.0, reason: 'trade_bonus' };
    }
}