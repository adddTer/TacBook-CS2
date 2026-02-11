
import { normalizeSteamId, WEAPON_SIDE_MAP } from "./helpers";

export const determineStartingSide = (events: any[], teammateSteamIds: Set<string>): 'T' | 'CT' => {
    let h1_t_weight = 0;
    let h1_ct_weight = 0;
    let h2_t_weight = 0;
    let h2_ct_weight = 0;
    
    let p1_matchStarted = false;
    let p1_round = 1;
    
    const hasMatchStart = events.some((e: any) => e.event_name === 'round_announce_match_start');
    if (!hasMatchStart) p1_matchStarted = true; 

    for (const e of events) {
        if (e.event_name === 'round_announce_match_start') {
            p1_matchStarted = true;
            p1_round = 1;
            h1_t_weight = 0; h1_ct_weight = 0; h2_t_weight = 0; h2_ct_weight = 0;
            continue;
        }
        if (!p1_matchStarted) continue;
        if (e.event_name === 'round_end') {
            p1_round++;
            continue;
        }
        let side: 'T' | 'CT' | null = null;
        let weight = 0;
        if (e.event_name === 'bomb_planted') {
            const sid = normalizeSteamId(e.user_steamid);
            if (teammateSteamIds.has(sid)) { side = 'T'; weight = 100; }
        }
        else if (e.event_name === 'bomb_defused') {
            const sid = normalizeSteamId(e.user_steamid);
            if (teammateSteamIds.has(sid)) { side = 'CT'; weight = 100; }
        }
        else if (e.event_name === 'player_death' || e.event_name === 'player_hurt') {
            const sid = normalizeSteamId(e.attacker_steamid);
            if (teammateSteamIds.has(sid) && e.weapon) {
                const w = e.weapon.replace("weapon_", "");
                if (WEAPON_SIDE_MAP[w]) { side = WEAPON_SIDE_MAP[w]; weight = 1; }
            }
        }
        if (side) {
            if (p1_round <= 12) {
                if (side === 'T') h1_t_weight += weight; else h1_ct_weight += weight;
            } else {
                if (side === 'T') h2_t_weight += weight; else h2_ct_weight += weight;
            }
        }
    }

    let initialRosterSide: 'T' | 'CT' = 'T';
    if (h1_ct_weight > h1_t_weight) initialRosterSide = 'CT';
    else if (h1_t_weight > h1_ct_weight) initialRosterSide = 'T';
    else {
        if (h2_ct_weight > h2_t_weight) initialRosterSide = 'T';
        else if (h2_t_weight > h2_ct_weight) initialRosterSide = 'CT';
    }
    
    return initialRosterSide;
};
