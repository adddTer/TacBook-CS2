
import { DemoData } from "../../types";
import { getAllPlayers } from '../teamLoader';
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

    let matchStarted = false;
    const hasMatchStartEvent = events.some(e => e.event_name === 'round_announce_match_start');
    if (!hasMatchStartEvent) {
        matchStarted = true; // Fallback if no start event
    }

    const validEvents = events.filter(e => {
        if (e.event_name === 'round_announce_match_start') {
            matchStarted = true;
        }
        return matchStarted;
    });

    validEvents.forEach((e: any) => {
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
        const isRoster = getAllPlayers().some(r => r.id === resolved);
        if (isRoster) rosterSteamIds.add(sid);
    });

    // Helper to get explicit team ID
    const steamIdLooseEqual = (a?: string, b?: string) => {
        if (!a || !b) return false;
        if (a === b) return true;
        const safePrefixLen = 14; 
        if (a.length >= safePrefixLen && b.length >= safePrefixLen) {
            return a.slice(0, safePrefixLen) === b.slice(0, safePrefixLen);
        }
        return false;
    };

    const getExplicitTeamForSid = (sid: string): string | undefined => {
        const raw = steamIdToTeamId.get(sid);
        if (raw !== undefined && raw !== null) {
            return String(raw).trim();
        }
        if (!Array.isArray(data) && Array.isArray((data as any).players)) {
            for (const p of (data as any).players) {
                const psid = normalizeSteamId(p.steamid);
                if (psid === sid || steamIdLooseEqual(psid, sid)) {
                    if (p.team_name) {
                        steamIdToTeamId.set(sid, String(p.team_name));
                        return String(p.team_name);
                    }
                    if (p.team_number !== undefined && p.team_number !== null) {
                        const tn = String(p.team_number).trim();
                        steamIdToTeamId.set(sid, tn);
                        return tn;
                    }
                    break;
                }
            }
        }
        return undefined;
    };

    // 2. Map all known teams
    const sidToResolvedTeam = new Map<string, string>();
    activeSteamIds.forEach(sid => {
        const t = getExplicitTeamForSid(sid);
        if (t) sidToResolvedTeam.set(sid, t);
    });
    allSteamIds.forEach(sid => {
        if (!sidToResolvedTeam.has(sid)) {
            const t = getExplicitTeamForSid(sid);
            if (t) sidToResolvedTeam.set(sid, t);
        }
    });

    // 3. Identify "My Team" ID based on metadata
    const teamCounts = new Map<string, number>();
    rosterSteamIds.forEach(sid => {
        const tid = sidToResolvedTeam.get(sid);
        if (tid !== undefined) {
            teamCounts.set(tid, (teamCounts.get(tid) || 0) + 1);
        }
    });

    let myTeamIdentifier: string | null = null;
    let maxCount = 0;
    
    teamCounts.forEach((count, tid) => {
        if (count > maxCount) {
            maxCount = count;
            myTeamIdentifier = tid;
        }
    });

    // 4. Build Initial Teammate Set
    const teammateSteamIds = new Set<string>();
    
    if (myTeamIdentifier !== null) {
        allSteamIds.forEach(sid => {
            if (sidToResolvedTeam.get(sid) === myTeamIdentifier) {
                teammateSteamIds.add(sid);
            }
        });
    } else if (rosterSteamIds.size > 0) {
        // If we have roster players but NO team numbers in the demo somehow
        const firstRoster = Array.from(rosterSteamIds)[0];
        teammateSteamIds.add(firstRoster);
    } else {
        // Fallback: 5-man stack logic
        const numTeamGroups = new Map<string, Set<string>>();

        activeSteamIds.forEach(sid => {
            const tn = sidToResolvedTeam.get(sid);
            if (!tn) return;
            if (!numTeamGroups.has(tn)) numTeamGroups.set(tn, new Set());
            numTeamGroups.get(tn)!.add(sid);
        });

        let chosenGroup: Set<string> | null = null;
        let maxSize = 0;

        for (const [key, grp] of numTeamGroups.entries()) {
            if (grp.size === 5) {
                chosenGroup = grp;
                break;
            }
            if (grp.size > maxSize) {
                maxSize = grp.size;
                chosenGroup = grp;
            }
        }

        if (!chosenGroup) {
            const sids = Array.from(activeSteamIds).sort();
            chosenGroup = new Set(sids.slice(0, 5));
        }

        chosenGroup.forEach(sid => teammateSteamIds.add(sid));
    }

    // 5. Interaction Propagation ONLY for unknown players
    // If a player ALREADY has an explicit team identifier, DO NOT overwrite it.
    const knownFriends = new Set<string>(teammateSteamIds);
    const knownEnemies = new Set<string>();
    
    // Anyone explicitly on another team is a known enemy
    if (myTeamIdentifier !== null) {
        allSteamIds.forEach(sid => {
            const t = sidToResolvedTeam.get(sid);
            if (t !== undefined && t !== myTeamIdentifier) {
                knownEnemies.add(sid);
            }
        });
    }

    let changed = true;
    let iterations = 0;
    while (changed && iterations < 5) {
        changed = false;
        validEvents.forEach((e: any) => {
            if (e.event_name === 'player_death') {
                const vic = normalizeSteamId(e.user_steamid);
                const att = normalizeSteamId(e.attacker_steamid);
                if (att && vic && att !== vic && att !== 'BOT' && vic !== 'BOT') {
                    // Only propagate if we don't have explicit teams for both. If we trust explicit teams, we skip.
                    // Actually, if we have explicit teams, we shouldn't guess.
                    if (!sidToResolvedTeam.has(att) || !sidToResolvedTeam.has(vic)) {
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
