
import { InventoryTracker } from "./InventoryTracker";
import { WIN_PROB_MATRIX } from "./constants";

interface PlayerRatingState {
    steamid: string;
    wpa_accum: number; // Win Probability Added
    impact_points: number; // Multikills, Opening kills, Clutches
    economy_impact: number; // Value destroyed vs used
    trade_kills: number;
    rounds_played: number;
}

export class RatingEngine {
    private inventory: InventoryTracker;
    private states: Map<string, PlayerRatingState> = new Map();
    
    // Round State
    private aliveT: Set<string> = new Set();
    private aliveCT: Set<string> = new Set();
    private recentDeaths: { sid: string, tick: number, side: 'T'|'CT', killer: string }[] = [];
    
    constructor() {
        this.inventory = new InventoryTracker();
    }

    public getOrInitState(sid: string): PlayerRatingState {
        const s = String(sid);
        if (!this.states.has(s)) {
            this.states.set(s, {
                steamid: s,
                wpa_accum: 0,
                impact_points: 0,
                economy_impact: 0,
                trade_kills: 0,
                rounds_played: 0
            });
        }
        return this.states.get(s)!;
    }

    public handleEvent(e: any, round: number, rosterSteamIds: Set<string>) {
        // 1. Inventory Tracking
        if (e.event_name.startsWith('item_')) {
            this.inventory.handleItemEvent(e);
        }

        // 2. Round Start / End Logic
        if (e.event_name === 'round_start' || e.event_name === 'round_freeze_end') {
            // Re-populate alive lists
            // Note: We need a way to know who is T or CT. 
            // In the main parser loop, we don't easily have 'side' for everyone at round start 
            // without iterating all players. We will maintain alive sets via spawn/death.
            // But since 'player_spawn' isn't always reliable in JSON, we reset on death events primarily.
            // For WPA, we really need the count.
            
            // Heuristic: Reset trade queue
            this.recentDeaths = [];
        }
        
        // Match Start Reset
        if (e.event_name === 'round_announce_match_start') {
            this.states.clear();
            this.inventory.reset();
            this.aliveT.clear();
            this.aliveCT.clear();
        }

        // 3. Tracking Alive Players (Crucial for WPA)
        // We rely on the parser telling us who is alive, or we track it.
        // Since we are "hooked" in, we'll try to infer side from the event or roster.
        
        if (e.event_name === 'player_death') {
            const vic = String(e.user_steamid);
            const att = String(e.attacker_steamid);
            const ast = String(e.assister_steamid);
            
            // Determine Sides (Attacker side vs Victim side)
            // We can check the alive sets if we maintained them perfectly, 
            // but for safety, let's use the roster set passed in.
            // This is a limitation: if we don't know the sides, WPA is hard.
            // However, the main parser loop usually calculates `aliveTs` and `aliveCTs`. 
            // We will ask the main parser to pass the alive counts if possible, 
            // OR we infer it here. 
            
            // Let's implement the logic assuming `this.aliveT` and `this.aliveCT` are maintained externally
            // or we accept we might be slightly off on 5v5 vs 4v5 if we miss a spawn.
            // actually, let's allow the main parser to `setAliveCounts` for us.
        }
    }

    // Called by main parser when a kill happens, with full context
    public processKill(
        victimId: string, 
        attackerId: string, 
        assisterId: string,
        tick: number,
        tAliveCount: number, // Count BEFORE death
        ctAliveCount: number, // Count BEFORE death
        victimSide: 'T' | 'CT'
    ) {
        const vState = this.getOrInitState(victimId);
        const aState = this.getOrInitState(attackerId);
        
        // --- 1. WPA (Win Probability Added) ---
        let winProbBefore = 0;
        let winProbAfter = 0;
        
        // Clamp counts to 0-5
        const t = Math.max(0, Math.min(5, tAliveCount));
        const ct = Math.max(0, Math.min(5, ctAliveCount));
        
        winProbBefore = WIN_PROB_MATRIX[t][ct];
        
        // Calculate After
        let t_after = t;
        let ct_after = ct;
        if (victimSide === 'T') t_after--; else ct_after--;
        t_after = Math.max(0, t_after);
        ct_after = Math.max(0, ct_after);
        
        winProbAfter = WIN_PROB_MATRIX[t_after][ct_after];
        
        let wpa = 0;
        if (victimSide === 'CT') {
            // T killed CT: T win prob increases
            wpa = winProbAfter - winProbBefore;
        } else {
            // CT killed T: T win prob decreases (CT win prob increases)
            wpa = winProbBefore - winProbAfter;
        }

        // Attribute WPA
        if (attackerId && attackerId !== "BOT" && attackerId !== "0") {
            aState.wpa_accum += Math.max(0, wpa); // Only positive contribution
            
            // Opening Kill Bonus
            if (tAliveCount === 5 && ctAliveCount === 5) {
                aState.impact_points += 0.2; 
            }
        }
        if (assisterId && assisterId !== "BOT" && assisterId !== "0") {
            const astState = this.getOrInitState(assisterId);
            astState.wpa_accum += Math.max(0, wpa * 0.3); // Assist gets 30% credit
        }

        // --- 2. Trade Kill Logic ---
        const tradeWindowTicks = 64 * 4; // ~4 seconds
        const trade = this.recentDeaths.find(d => 
            d.side === (victimSide === 'T' ? 'CT' : 'T') && // Teammate of current killer died (Killer is opposite of Victim)
            (tick - d.tick) <= tradeWindowTicks
        );
        
        if (trade && attackerId && attackerId !== "BOT") {
            aState.trade_kills++;
            aState.impact_points += 0.15; // Trade bonus
        }
        
        // Log death for future trades
        if (victimSide) {
            this.recentDeaths.push({ sid: victimId, tick, side: victimSide, killer: attackerId });
        }

        // --- 3. Economy Impact ---
        // Value Destroyed / Value Used
        if (attackerId && attackerId !== "BOT") {
            const vVal = this.inventory.getLoadoutValue(victimId);
            const aVal = this.inventory.getLoadoutValue(attackerId);
            
            // Normalized ratio: Kill high value with low value = High score
            let ecoScore = (vVal / Math.max(1, aVal)); 
            // Cap it to avoid crazy pistols rounds skewing everything (e.g. 5000 / 200 = 25)
            ecoScore = Math.min(ecoScore, 3.0); 
            
            aState.economy_impact += ecoScore;
        }
    }

    public incrementRound(allPlayerIds: string[]) {
        allPlayerIds.forEach(id => {
            this.getOrInitState(id).rounds_played++;
        });
        
        // Identify survivors for inventory tracking
        // This requires the main parser to tell us who survived, or we assume logic elsewhere.
        // For simplicity, we handle inventory reset in handleRoundStart via external set.
    }
    
    // Inject calculated ratings into the main stats object
    public applyStats(statsMap: Map<string, any>) {
        statsMap.forEach((stats, sid) => {
            const rState = this.getOrInitState(sid);
            const rounds = Math.max(1, stats.r3_rounds_played || rState.rounds_played || 1); // Use parser's round count if available
            
            // Standard Rating 2.0 Components (Calculated in main parser usually, but we refine here)
            const kpr = stats.kills / rounds;
            const spr = (rounds - stats.deaths) / rounds;
            const apr = stats.assists / rounds;
            const adr = stats.adr || (stats.total_damage / rounds); // Ensure ADR exists

            // Rating 3.0 Components
            const wpaRating = (rState.wpa_accum / rounds) * 4.0; // Scale up
            const impactRating = (rState.impact_points / rounds) * 1.5;
            const ecoRating = (rState.economy_impact / Math.max(1, stats.kills)) * 0.2; // Avg efficiency per kill
            
            // Base 2.0 (Approx) + 3.0 Modifiers
            // 0.0073*ADR + 0.3591*KPR + -0.5329*DPR + 0.2372*Impact + 0.0032*KAST + 0.1587
            // We use a simplified weighted sum
            
            const raw = 
                (kpr * 1.0) + 
                (spr * 0.7) + 
                (wpaRating * 1.2) + 
                (impactRating * 1.0) + 
                (ecoRating * 0.5) +
                (adr * 0.005);

            // Normalize to ~1.0 average
            stats.rating = parseFloat((raw / 1.1).toFixed(2));
            stats.we = parseFloat((rState.wpa_accum * 10).toFixed(2)); // Display Win Effect
            
            // Store internal metrics for debugging if needed
            stats.r3_data = rState;
        });
    }
}
