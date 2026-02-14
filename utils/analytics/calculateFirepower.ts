
/**
 * Calculates Firepower Score (0-100).
 * 
 * Target: Professional Average ~ 45 Points.
 * 
 * Components:
 * 1. Rating (30%): Target 2.10 (Avg ~1.05 -> ~50pts)
 * 2. Kills per Round Win (20%): Target 1.80 (Avg ~0.8 -> ~44pts)
 * 3. Damage per Round Win (15%): Target 160 (Avg ~85 -> ~53pts)
 * 4. Kills per Round (15%): Target 1.40 (Avg ~0.70 -> ~50pts)
 * 5. Multi-Kill Rate (10%): Target 35% (Avg ~15% -> ~42pts)
 * 6. Consistency (10%): Target 90% (Avg ~55% -> ~61pts)
 */
export const calculateFirepower = (
    adr: number, 
    kpr: number, 
    rating: number,          
    roundsWithKillPct: number, 
    kprWin: number,          
    damageInWins: number,
    multiKillRate: number    
): number => {
    
    // Strict Baselines for "Avg = 45"
    const T_RATING = 2.10; 
    const T_KPR_WIN = 1.80; 
    const T_DPR_WIN = 160;
    const T_KPR = 1.40;
    const T_MULTI = 35;
    const T_K_PCT = 90;

    const sRating = (rating / T_RATING) * 30;
    const sKprWin = (kprWin / T_KPR_WIN) * 20;
    const sDprWin = (damageInWins / T_DPR_WIN) * 15;
    const sKpr = (kpr / T_KPR) * 15;
    const sMulti = (multiKillRate / T_MULTI) * 10;
    const sKwk = (roundsWithKillPct / T_K_PCT) * 10;

    const totalScore = sRating + sKprWin + sDprWin + sKpr + sMulti + sKwk;

    return Math.round(Math.max(0, Math.min(100, totalScore)));
};
