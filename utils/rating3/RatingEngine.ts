
import { InventoryTracker } from "./InventoryTracker";
import { LossBonusTracker } from "./LossBonusTracker";
import { WEAPON_VALUES } from "./constants";

// Temporary stats for a single round
interface RoundStats {
    kills: number;
    deaths: number;
    assists: number;
    damage: number;
    traded_death: boolean;
    trade_kill: boolean;
    flash_assists: number;
    utility_damage: number;
    is_entry_kill: boolean;
    is_clutch_win: boolean;
    
    // Econ 4.0 Tracking
    investment_kills_value: number; // Value of enemies killed (equipment value)
    survived: boolean;
}

interface PlayerRatingState {
    steamid: string;
    
    // Match Accumulators (Legacy support & Aggregate view)
    total_kills: number;
    total_deaths: number;
    total_assists: number;
    total_damage: number;
    total_rounds: number;
    
    // Rating 4.0 Components
    round_ratings: number[]; // Store every round's calculated rating
    
    // Helpers
    flash_assists: number;
    utility_count: number;
    total_impact_score: number; // For aggregate impact

    // New Counters
    total_entry_kills: number;
    kast_rounds: number;
    multikills: { 2: number, 3: number, 4: number, 5: number };
}

export class RatingEngine {
    private inventory: InventoryTracker;
    private lossBonus: LossBonusTracker;
    private states: Map<string, PlayerRatingState> = new Map();
    
    // Current Round State
    private roundData: Map<string, RoundStats> = new Map();
    // Track deaths: { victimSid, killerSid, tick }
    private recentDeaths: { victim: string, killer: string, tick: number }[] = [];
    private firstKillHappened: boolean = false;
    
    // Round State Flags
    private isPostRound: boolean = false;
    private currentWinner: 'T' | 'CT' | null = null;

    constructor() {
        this.inventory = new InventoryTracker();
        this.lossBonus = new LossBonusTracker();
    }

    private getRoundStats(sid: string): RoundStats {
        if (!this.roundData.has(sid)) {
            this.roundData.set(sid, {
                kills: 0, deaths: 0, assists: 0, damage: 0,
                traded_death: false, trade_kill: false,
                flash_assists: 0, utility_damage: 0,
                is_entry_kill: false, is_clutch_win: false,
                investment_kills_value: 0, survived: true
            });
        }
        return this.roundData.get(sid)!;
    }

    public getOrInitState(sid: string): PlayerRatingState {
        const s = String(sid);
        if (!this.states.has(s)) {
            this.states.set(s, {
                steamid: s,
                total_kills: 0, total_deaths: 0, total_assists: 0, total_damage: 0,
                total_rounds: 0, round_ratings: [],
                flash_assists: 0, utility_count: 0, total_impact_score: 0,
                total_entry_kills: 0, kast_rounds: 0, multikills: { 2:0, 3:0, 4:0, 5:0 }
            });
        }
        return this.states.get(s)!;
    }

    public handleEvent(e: any, round: number, rosterSteamIds: Set<string>) {
        const allIds = Array.from(this.states.keys());

        // 1. Inventory & Econ Tracking
        if (e.event_name.startsWith('item_')) {
            this.inventory.handleItemEvent(e);
            if (e.event_name === 'item_pickup' || e.event_name === 'item_purchase') return; 
        }
        if (e.event_name.endsWith('_detonate') || e.event_name === 'player_blind') {
             const user = e.user_steamid || e.attacker_steamid;
             if (user) {
                 const state = this.getOrInitState(user);
                 state.utility_count++;
             }
        }

        // 2. Round Flow
        if (e.event_name === 'round_announce_match_start') {
            this.states.clear();
            this.inventory.reset();
            this.lossBonus.reset();
            this.roundData.clear();
            this.recentDeaths = [];
            this.isPostRound = false;
        }
        // IMPORTANT: Clear round data on BOTH start and freeze_end to prevent double accumulation
        else if (e.event_name === 'round_start' || e.event_name === 'round_freeze_end') {
            // Snapshot Start Values (only once, prefer freeze_end)
            if (e.event_name === 'round_freeze_end') {
                this.inventory.snapshotRoundStart(allIds);
            }
            
            // Safety clear to prevent "Rating=10" bug if stats accumulated
            if (this.isPostRound) {
                this.roundData.clear(); 
                this.recentDeaths = []; 
                this.firstKillHappened = false;
                this.isPostRound = false;
                this.currentWinner = null;
            }
        }
        
        else if (e.event_name === 'round_end') {
            // Snapshot End Values
            this.inventory.snapshotRoundEnd(allIds);
            
            // Determine Winner for Loss Bonus
            let winner: 'T' | 'CT' | null = null;
            if (e.winner == 2 || String(e.winner) === '2') winner = 'T';
            else if (e.winner == 3 || String(e.winner) === '3') winner = 'CT';
            this.currentWinner = winner;
            
            if (winner) {
                this.lossBonus.update(winner);
            }

            this.calculateRoundRatings(allIds, rosterSteamIds);
            this.isPostRound = true; // Mark round as done
        }
        
        else if (e.event_name === 'player_death') {
             this.handleDeath(e, allIds, rosterSteamIds);
        }

        else if (e.event_name === 'player_hurt') {
             const att = String(e.attacker_steamid);
             const vic = String(e.user_steamid);
             const dmg = parseInt(e.dmg_health || 0);
             if (att && att !== "BOT" && att !== "0" && att !== vic) {
                 const rStats = this.getRoundStats(att);
                 rStats.damage += dmg;
                 const weapon = e.weapon || "";
                 if (weapon.includes("grenade") || weapon.includes("molotov") || weapon.includes("incendiary")) {
                     rStats.utility_damage += dmg;
                 }
             }
        }
    }

    private handleDeath(e: any, allIds: string[], rosterSteamIds: Set<string>) {
        const vic = String(e.user_steamid);
        const att = String(e.attacker_steamid);
        const ast = String(e.assister_steamid);
        const tick = e.tick;

        const vStats = this.getRoundStats(vic);
        vStats.deaths++;
        vStats.survived = false;
        
        this.inventory.handlePlayerDeath(vic);

        // --- Tragedy Check (Post Round Death) ---
        if (this.isPostRound && this.currentWinner) {
            this.checkTragedy(vic);
        }

        // --- Trade & Kill Logic ---
        const TRADE_WINDOW = 256; // ~4s
        const avengedDeath = this.recentDeaths.find(d => 
            d.killer === vic && (tick - d.tick) <= TRADE_WINDOW
        );

        if (att && att !== "BOT" && att !== "0" && att !== vic) {
            const aStats = this.getRoundStats(att);
            aStats.kills++;
            
            // Investment Efficiency Data
            const victimValue = this.inventory.getStartValue(vic); 
            aStats.investment_kills_value += victimValue;

            if (!this.firstKillHappened) {
                aStats.is_entry_kill = true;
                this.firstKillHappened = true;
            }

            if (avengedDeath) {
                aStats.trade_kill = true;
                const teammateStats = this.getRoundStats(avengedDeath.victim);
                teammateStats.traded_death = true;
            }
        }

        // Assist Logic
        if (ast && ast !== "BOT" && ast !== "0" && ast !== vic && ast !== att) {
            const astStats = this.getRoundStats(ast);
            astStats.assists++;
            if (e.assistedflash) {
                astStats.flash_assists++;
            }
        }
        
        if (att) this.recentDeaths.push({ victim: vic, killer: att, tick });
    }

    private calculateRoundRatings(allIds: string[], rosterSteamIds: Set<string>) {
        allIds.forEach(sid => {
            const pState = this.states.get(sid)!;
            const rStats = this.getRoundStats(sid);
            
            // Stats Tracking
            if (rStats.is_entry_kill) pState.total_entry_kills++;
            
            // KAST: Kill, Assist, Survive, Traded
            const isKast = rStats.kills > 0 || rStats.assists > 0 || rStats.survived || rStats.traded_death;
            if (isKast) pState.kast_rounds++;

            // MultiKills
            const k = rStats.kills;
            if (k >= 2) {
                if (k >= 5) pState.multikills[5]++;
                else pState.multikills[k as 2|3|4]++;
            }

            // === RATING 4.0 BALANCED CALCULATION ===
            
            // 1. Kill Rating (Weight 0.25, Threshold 0.80)
            const scoreKill = (rStats.kills / 0.80) * 0.25;

            // 2. Survival Rating (Weight 0.15, Fixed 0.30)
            const scoreSurv = (rStats.survived ? 0.30 : 0.0);

            // 3. Damage Rating (Weight 0.15, Threshold 85.0)
            const scoreDmg = (rStats.damage / 85.0) * 0.15;

            // 4. KAST Rating (Weight 0.10, Fixed 0.20)
            const scoreKast = (isKast ? 0.20 : 0.0);

            // 5. Impact Rating (Weight 0.25, Divisor 1.3)
            let impactVal = 0;
            if (rStats.kills === 1) impactVal = 1.0;
            else if (rStats.kills === 2) impactVal = 2.2;
            else if (rStats.kills >= 3) impactVal = 3.5;
            
            if (rStats.is_entry_kill) impactVal += 0.5;
            if (rStats.is_clutch_win) impactVal += 1.0;
            impactVal += (rStats.flash_assists * 0.5); 
            
            const scoreImpact = (impactVal / 1.3) * 0.25;

            let roundRating = scoreKill + scoreSurv + scoreDmg + scoreKast + scoreImpact;

            // === ECONOMIC MODIFIERS (LOGARITHMIC & TIGHTENED) ===
            
            // A. Investment Efficiency (Log Scale)
            const startValue = this.inventory.getStartValue(sid);
            const investBase = startValue + 500; 
            
            // Coefficient lowered to 0.10 to reduce econ inflation
            if (rStats.investment_kills_value > 0) {
                const roi = rStats.investment_kills_value / investBase;
                const efficiency = Math.log2(1 + roi) * 0.10;
                roundRating += efficiency;
            }

            // B. Scavenger (Saving)
            // Cap lowered to 0.20
            if (rStats.survived) {
                const endValue = this.inventory.getEndValue(sid);
                const saveBonus = Math.min(endValue / 15000, 0.20);
                roundRating += saveBonus;
            }

            // Push to history (Min 0)
            pState.round_ratings.push(Math.max(0, parseFloat(roundRating.toFixed(2))));

            // Update Accumulators
            pState.total_rounds++;
            pState.total_kills += rStats.kills;
            pState.total_deaths += rStats.deaths;
            pState.total_assists += rStats.assists;
            pState.total_damage += rStats.damage;
            pState.flash_assists += rStats.flash_assists;
            pState.total_impact_score += impactVal;
        });
    }

    private checkTragedy(sid: string) {
        const pState = this.states.get(sid);
        if (!pState) return;

        const lastIdx = pState.round_ratings.length - 1;
        if (lastIdx < 0) return;

        // "Tragedy" Logic: Died AFTER round end + Had valuable equipment + Team Lost + T Side
        // Only trigger if CT won (implies T lost and gets $0 if they don't plant, but simple heuristic is CT win = T save fail)
        if (this.currentWinner !== 'CT') return;

        const savedValue = this.inventory.getEndValue(sid);
        
        if (savedValue > 2000) {
             // Dynamic Penalty based on Loss Bonus
             // High loss bonus ($3400) = Higher penalty
             // Low loss bonus ($1400) = Lower penalty
             const lossBonusAmt = this.lossBonus.getLossBonusValue('T');
             
             const penalty = lossBonusAmt / 7000;
             
             let newRating = pState.round_ratings[lastIdx] - penalty;
             pState.round_ratings[lastIdx] = Math.max(0, parseFloat(newRating.toFixed(2)));
        }
    }

    public applyStats(statsMap: Map<string, any>) {
        statsMap.forEach((stats, sid) => {
            const state = this.states.get(sid);
            if (!state || state.round_ratings.length === 0) {
                stats.rating = 0;
                return;
            }

            const sum = state.round_ratings.reduce((a, b) => a + b, 0);
            const rawAvg = sum / state.round_ratings.length;
            
            // Final Scaling Formula: 1.552 * Raw - 0.232
            // This adjusts the internal calculated average to match the desired distribution curve
            const adjustedRating = (1.55 * rawAvg) - 0.23;
            
            stats.rating = parseFloat(adjustedRating.toFixed(2));
            
            stats.flash_assists = state.flash_assists;
            stats.utility_count = state.utility_count || 0; 
            stats.ratingHistory = state.round_ratings;
            
            stats.we = parseFloat((state.total_impact_score / state.total_rounds).toFixed(2)); 
            
            // New Fields
            stats.entry_kills = state.total_entry_kills;
            stats.kast = state.total_rounds > 0 ? parseFloat(((state.kast_rounds / state.total_rounds) * 100).toFixed(1)) : 0;
            stats.multikills = {
                k2: state.multikills[2],
                k3: state.multikills[3],
                k4: state.multikills[4],
                k5: state.multikills[5]
            };
        });
    }
}
