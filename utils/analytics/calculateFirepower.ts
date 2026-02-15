
/**
 * Calculates Firepower Score (0-100).
 * 
 * Target: Professional Average ~ 50 Points.
 * 
 * Components:
 * 1. Rating (30%): Target 1.70 (Easier)
 * 2. Kills per Round Win (20%): Target 1.40 (Easier)
 * 3. Damage per Round Win (15%): Target 135 (Easier)
 * 4. Kills per Round (15%): Target 1.05 (Easier)
 * 5. Multi-Kill Rate (10%): Target 25% (Easier)
 * 6. Consistency (10%): Target 80% (Easier)
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
    
    // Baselines for "Avg = 50" (Lowered significantly)
    const T_RATING = 1.70; 
    const T_KPR_WIN = 1.40; 
    const T_DPR_WIN = 135;
    const T_KPR = 1.05;
    const T_MULTI = 25;
    const T_K_PCT = 80;

    const sRating = (rating / T_RATING) * 30;
    const sKprWin = (kprWin / T_KPR_WIN) * 20;
    const sDprWin = (damageInWins / T_DPR_WIN) * 15;
    const sKpr = (kpr / T_KPR) * 15;
    const sMulti = (multiKillRate / T_MULTI) * 10;
    const sKwk = (roundsWithKillPct / T_K_PCT) * 10;

    const totalScore = sRating + sKprWin + sDprWin + sKpr + sMulti + sKwk;

    return Math.round(Math.max(0, totalScore));
};
