
import { DemoData } from "../../types";
import { ROSTER } from "../../constants/roster";
import { normalizeSteamId, resolveName } from "./helpers";

interface TeamAnalysisResult {
    teammateSteamIds: Set<string>;
    steamIdToName: Map<string, string>;
    activeSteamIds: Set<string>;
    allSteamIds: Set<string>;
    steamIdToTeamId: Map<string, string | number>;
}

export const determineTeammates = (data: DemoData, events: any[]): TeamAnalysisResult => {
    const rosterSteamIds = new Set<string>();
    const allSteamIds = new Set<string>(); 
    const activeSteamIds = new Set<string>();
    
    const steamIdToName = new Map<string, string>();
    const steamIdToTeamId = new Map<string, string | number>(); 

    const collectPlayerInfo = (sid: string, name: string | null, teamIdentifier?: number | string) => {
        if (sid === "BOT") return;
        allSteamIds.add(sid);
        if (name) {
            if (!steamIdToName.has(sid) || steamIdToName.get(sid) === "Unknown") {
                steamIdToName.set(sid, name);
            }
        }
        if (teamIdentifier !== undefined && teamIdentifier !== null) {
            steamIdToTeamId.set(sid, teamIdentifier);
        }
    };

    if (!Array.isArray(data) && data.players) {
        data.players.forEach((p: any) => {
            const sid = normalizeSteamId(p.steamid);
            const teamId = p.team_name || p.team_number;
            collectPlayerInfo(sid, p.name, teamId);
        });
    }

    events.forEach((e: any) => {
        if (e.user_steamid) {
            const sid = normalizeSteamId(e.user_steamid);
            collectPlayerInfo(sid, e.user_name);
            activeSteamIds.add(sid);
        }
        if (e.attacker_steamid) {
            const sid = normalizeSteamId(e.attacker_steamid);
            collectPlayerInfo(sid, e.attacker_name);
            activeSteamIds.add(sid);
        }
    });

    // 1. Identify Roster Members (Anchors)
    allSteamIds.forEach(sid => {
        const rawName = steamIdToName.get(sid) || "Unknown";
        const resolved = resolveName(rawName);
        const isRoster = ROSTER.some(r => r.id === resolved);
        if (isRoster) rosterSteamIds.add(sid);
    });

    // 2. Identify "My Team" ID based on metadata
    const teamCounts = new Map<string | number, number>();
    rosterSteamIds.forEach(sid => {
        const tid = steamIdToTeamId.get(sid);
        if (tid !== undefined) {
            teamCounts.set(tid, (teamCounts.get(tid) || 0) + 1);
        }
    });

    let myTeamIdentifier: string | number | null = null;
    let maxCount = 0;
    
    teamCounts.forEach((count, tid) => {
        if (count > maxCount) {
            maxCount = count;
            myTeamIdentifier = tid;
        }
    });

    // 3. Build Initial Teammate Set
    const teammateSteamIds = new Set<string>(rosterSteamIds);
    
    if (myTeamIdentifier !== null) {
        allSteamIds.forEach(sid => {
            if (steamIdToTeamId.get(sid) === myTeamIdentifier) {
                teammateSteamIds.add(sid);
            }
        });
    }
    
    // Fallback: 5-man stack logic
    if (rosterSteamIds.size === 0 && activeSteamIds.size === 10) {
        const numTeamGroups = new Map<string, Set<string>>();
        const steamIdLooseEqual = (a?: string, b?: string) => {
            if (!a || !b) return false;
            if (a === b) return true;
            const safePrefixLen = 14; 
            if (a.length >= safePrefixLen && b.length >= safePrefixLen) {
                return a.slice(0, safePrefixLen) === b.slice(0, safePrefixLen);
            }
            return false;
        };

        const getNumericTeamForSid = (sid: string): string | undefined => {
            const raw = steamIdToTeamId.get(sid);
            if (raw !== undefined && raw !== null) {
                const t = String(raw).trim();
                if (/^\d+$/.test(t)) return t;
            }
            if (!Array.isArray(data) && Array.isArray((data as any).players)) {
                for (const p of (data as any).players) {
                    const psid = normalizeSteamId(p.steamid);
                    if (psid === sid || steamIdLooseEqual(psid, sid)) {
                        if (p.team_number !== undefined && p.team_number !== null) {
                            const tn = String(p.team_number).trim();
                            if (/^\d+$/.test(tn)) {
                                steamIdToTeamId.set(sid, tn);
                                return tn;
                            }
                        }
                        break;
                    }
                }
            }
            return undefined;
        };

        activeSteamIds.forEach(sid => {
            const tn = getNumericTeamForSid(sid);
            if (!tn) return;
            if (!numTeamGroups.has(tn)) numTeamGroups.set(tn, new Set());
            numTeamGroups.get(tn)!.add(sid);
        });

        let chosenGroup: Set<string> | null = null;
        const sortedTeamKeys = Array.from(numTeamGroups.keys()).sort((a, b) => Number(a) - Number(b));

        for (const key of sortedTeamKeys) {
            const grp = numTeamGroups.get(key)!;
            if (grp.size === 5) { 
                chosenGroup = grp; 
                break; 
            }
        }

        if (!chosenGroup && sortedTeamKeys.length > 0) {
            let maxSize = 0;
            let bestKey = sortedTeamKeys[0];
            
            for (const key of sortedTeamKeys) {
                const grp = numTeamGroups.get(key)!;
                if (grp.size > maxSize) {
                    maxSize = grp.size;
                    bestKey = key;
                }
            }
            if (maxSize > 0) {
                chosenGroup = numTeamGroups.get(bestKey)!;
            }
        }

        if (!chosenGroup) {
            const sids = Array.from(activeSteamIds).sort();
            chosenGroup = new Set(sids.slice(0, 5));
        }

        chosenGroup.forEach(sid => teammateSteamIds.add(sid));
    }

    // 4. Interaction Propagation
    const knownFriends = new Set<string>(teammateSteamIds);
    const knownEnemies = new Set<string>();
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 5) {
        changed = false;
        events.forEach((e: any) => {
            if (e.event_name === 'player_death') {
                const vic = normalizeSteamId(e.user_steamid);
                const att = normalizeSteamId(e.attacker_steamid);
                if (att && vic && att !== vic && att !== 'BOT' && vic !== 'BOT') {
                    if (knownFriends.has(att) && !knownEnemies.has(vic) && !knownFriends.has(vic)) {
                        knownEnemies.add(vic);
                        changed = true;
                    }
                    if (knownFriends.has(vic) && !knownEnemies.has(att) && !knownFriends.has(att)) {
                        knownEnemies.add(att);
                        changed = true;
                    }
                    if (knownEnemies.has(att) && !knownFriends.has(vic) && !knownEnemies.has(vic)) {
                        knownFriends.add(vic);
                        changed = true;
                    }
                    if (knownEnemies.has(vic) && !knownFriends.has(att) && !knownEnemies.has(att)) {
                        knownFriends.add(att);
                        changed = true;
                    }
                }
            }
        });
        iterations++;
    }
    knownFriends.forEach(sid => teammateSteamIds.add(sid));

    return {
        teammateSteamIds,
        steamIdToName,
        activeSteamIds,
        allSteamIds,
        steamIdToTeamId
    };
};
