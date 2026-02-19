
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
    rating: number; 
    wpa: number; // Accumulated WPA for this round
}
