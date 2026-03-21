
export interface WPAUpdate {
    sid: string;
    delta: number;
    debugProbBefore?: number;
    debugProbAfter?: number;
    reason?: string;
}

export interface RoundContext {
    kills: number;
    deaths: number;
    assists: number; 
    damage: number;
    survived: boolean;
    isEntryKill: boolean;
    isEntryDeath: boolean;
    traded: boolean;
    wasTraded: boolean;
    tradeBonus: number;
    tradePenalty: number;
    impactPoints: number;
    killValue: number; // For Econ Rating
    killShareRating: number; // New: Accumulated kill share rating
    survivalScore: number; // New: Dynamic survival score based on P_exp
    botKills: number; // New: Track kills against BOTs to exclude from rating
    rating: number; 
    wpa: number; // Accumulated WPA for this round
}
