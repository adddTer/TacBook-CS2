
import { DemoData, Match, PlayerMatchStats, ClutchAttempt, MatchRound, MatchTimelineEvent, PlayerRoundStats, UtilityStats, Side } from "../types";
import { generateId } from "./idGenerator";
import { ROSTER } from "../constants/roster";
import { RatingEngine } from "./rating3/RatingEngine";
import { HealthTracker } from "./rating3/HealthTracker";

// --- Helpers ---

const normalizeSteamId = (id: string | number | null | undefined): string => {
    if (id === null || id === undefined || id === 0 || id === "0" || id === "BOT") return "BOT";
    return String(id).trim();
};

const NAME_ALIASES: Record<string, string> = {
    'forsakenN': 'F1oyd',
    '冥医': 'Sanatio',
    'addd_233': 'addd',
    'Ser1EN': 'Ser1EN',
    'ClayDEN': 'Ser1EN', 
    'FuNct1on': 'FuNct1on',
    'R\u2061\u2061\u2061ain\u2061\u2061\u2061\u2061\u2061': 'Rain' 
};

const WEAPON_SIDE_MAP: Record<string, 'T' | 'CT'> = {
    'glock': 'T', 'ak47': 'T', 'galilar': 'T', 'sg553': 'T', 'tec9': 'T', 'mac10': 'T', 'molotov': 'T', 'g3sg1': 'T',
    'usp_silencer': 'CT', 'hkp2000': 'CT', 'm4a1': 'CT', 'm4a1_silencer': 'CT', 'm4a4': 'CT', 'famas': 'CT', 'aug': 'CT', 'fiveseven': 'CT', 'mp9': 'CT', 'incendiary': 'CT', 'scar20': 'CT'
};

const resolveName = (rawName: string | null): string => {
    if (!rawName) return "Unknown";
    const clean = rawName.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    if (NAME_ALIASES[clean]) return NAME_ALIASES[clean];
    const rosterMatch = ROSTER.find(r => r.id.toLowerCase() === clean.toLowerCase() || r.name.toLowerCase() === clean.toLowerCase());
    if (rosterMatch) return rosterMatch.id;
    return clean;
};

// --- Main Logic ---

export const parseDemoJson = (data: DemoData): Match => {
    const events = Array.isArray(data) ? data : (data.events || []);
    const meta = (!Array.isArray(data) && data.meta) ? data.meta : { map_name: 'Unknown', server_name: '' };
    
    events.sort((a: any, b: any) => (a.tick || 0) - (b.tick || 0));

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

    // PASS 1: DETERMINE SIDE
    let h1_t_weight = 0;
    let h1_ct_weight = 0;
    let h2_t_weight = 0;
    let h2_ct_weight = 0;
    let p1_matchStarted = false;
    let p1_round = 1;
    const hasMatchStart = events.some(e => e.event_name === 'round_announce_match_start');
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

    // PASS 2: CALCULATE STATS
    const statsMap = new Map<string, PlayerMatchStats>();
    const ratingEngine = new RatingEngine();
    const healthTracker = new HealthTracker();
    
    const matchRounds: MatchRound[] = [];
    
    // Per-Round temporary stores
    let currentRoundPlayerStats = new Map<string, Partial<PlayerRoundStats>>();
    let currentRoundEvents: MatchTimelineEvent[] = [];
    
    // Time tracking anchors for the current round
    let currentRoundStartTick = 0;
    let currentFreezeEndTick: number | null = null;
    
    // State for Post-Round (Garbage Time) logic
    let pendingRoundEnd: { 
        winner: 'T' | 'CT', 
        reason: number, 
        endTick: number
    } | null = null;
    
    const getOrInitStats = (sid: string, fallbackName: string | null) => {
        if (sid === "BOT") return null;
        const mapName = steamIdToName.get(sid);
        const nameToUse = mapName || fallbackName || "Unknown";
        
        if (!statsMap.has(sid)) {
            const resolvedName = resolveName(nameToUse);
            statsMap.set(sid, {
                playerId: resolvedName,
                steamid: sid,
                rank: '-', 
                kills: 0, deaths: 0, assists: 0,
                adr: 0, hsRate: 0, rating: 0, we: 0,
                total_damage: 0,
                utility_count: 0,
                flash_assists: 0,
                headshots: 0, 
                entry_kills: 0,
                kast: 0,
                multikills: { k2: 0, k3: 0, k4: 0, k5: 0 },
                duels: {}, 
                utility: { smokesThrown: 0, flashesThrown: 0, enemiesBlinded: 0, blindDuration: 0, heThrown: 0, heDamage: 0, molotovsThrown: 0, molotovDamage: 0 },
                clutches: { '1v1': { won: 0, lost: 0 }, '1v2': { won: 0, lost: 0 }, '1v3': { won: 0, lost: 0 }, '1v4': { won: 0, lost: 0 }, '1v5': { won: 0, lost: 0 } },
                clutchHistory: [],
                r3_rounds_played: 0
            } as any);
            ratingEngine.getOrInitState(sid);
        }
        return statsMap.get(sid);
    };

    const getRoundPlayerStats = (sid: string) => {
        if (!currentRoundPlayerStats.has(sid)) {
            currentRoundPlayerStats.set(sid, {
                kills: 0, deaths: 0, assists: 0, damage: 0, headshots: 0, utilityDamage: 0,
                headshot: false, planted: false, defused: false,
                utility: { smokesThrown: 0, flashesThrown: 0, enemiesBlinded: 0, blindDuration: 0, heThrown: 0, heDamage: 0, molotovsThrown: 0, molotovDamage: 0 }
            });
        }
        return currentRoundPlayerStats.get(sid)!;
    };

    activeSteamIds.forEach(sid => getOrInitStats(sid, null));

    let currentRound = 1;
    let scores = { T: 0, CT: 0 };
    let s1 = 0, s2 = 0, s3 = 0, s4 = 0;

    let aliveTs = new Set<string>();
    let aliveCTs = new Set<string>();
    let roundClutchAttempts = new Map<string, { opponents: number, kills: number }>();
    let matchStarted = !hasMatchStart;

    const tickRate = 64; 

    const resetRoundState = () => {
        aliveTs.clear();
        aliveCTs.clear();
        roundClutchAttempts.clear();
        healthTracker.reset(); 
        currentRoundPlayerStats.clear();
        currentRoundEvents = [];
        
        currentRoundStartTick = 0;
        currentFreezeEndTick = null;

        const currentRosterSide = (currentRound <= 12) ? initialRosterSide : (initialRosterSide === 'T' ? 'CT' : 'T');
        activeSteamIds.forEach(sid => {
            const isTeammate = teammateSteamIds.has(sid);
            const side = isTeammate ? currentRosterSide : (currentRosterSide === 'T' ? 'CT' : 'T');
            if (side === 'T') aliveTs.add(sid);
            else aliveCTs.add(sid);
        });
    };

    // Helper: Finalize the PREVIOUS round (including post-round events)
    const processRoundEnd = () => {
        if (!pendingRoundEnd) return;
        
        const { winner, reason, endTick } = pendingRoundEnd;
        const currentRosterSide = (currentRound <= 12) ? initialRosterSide : (initialRosterSide === 'T' ? 'CT' : 'T');

        // 1. Finalize Rating Engine (Calculates ratings + Econ Snapshot)
        ratingEngine.finalizeRound(Array.from(activeSteamIds));
        
        // 2. Compile Detailed Stats
        const roundPlayerStatsRecord: Record<string, PlayerRoundStats> = {};
        
        activeSteamIds.forEach(sid => {
            const ratingCtx = ratingEngine.getCurrentRoundContext(sid);
            const tempStats = getRoundPlayerStats(sid);
            
            const isTeammate = teammateSteamIds.has(sid);
            const pSide = isTeammate ? currentRosterSide : (currentRosterSide === 'T' ? 'CT' : 'T');

            if (ratingCtx) {
                roundPlayerStatsRecord[sid] = {
                    kills: ratingCtx.kills,
                    deaths: ratingCtx.deaths,
                    assists: tempStats.assists || 0,
                    damage: ratingCtx.damage,
                    headshot: tempStats.headshot || false, 
                    headshots: tempStats.headshots || 0,
                    rating: ratingCtx.rating,
                    impact: ratingCtx.impactPoints,
                    isEntryKill: ratingCtx.isEntryKill,
                    isEntryDeath: ratingCtx.isEntryDeath,
                    traded: ratingCtx.traded,
                    wasTraded: ratingCtx.wasTraded,
                    equipmentValue: ratingEngine.getInventoryValue(sid, 'start'),
                    planted: tempStats.planted || false,
                    defused: tempStats.defused || false,
                    utility: tempStats.utility!,
                    utilityDamage: tempStats.utilityDamage || 0,
                    side: pSide,
                    survived: ratingCtx.survived
                };
            }
        });

        // Correct Relative Times for Timeline
        // Anchor is FreezeEnd (Live start). If missing, fallback to RoundStart.
        const anchorTick = currentFreezeEndTick ?? currentRoundStartTick;
        const roundDuration = Math.max(0, (endTick - anchorTick) / tickRate);

        currentRoundEvents.forEach(ev => {
            // Recalculate relative seconds based on final anchor
            ev.seconds = (ev.tick - anchorTick) / tickRate;
        });

        matchRounds.push({
            roundNumber: currentRound,
            winnerSide: winner,
            winReason: reason || 0,
            duration: roundDuration,
            endTick: endTick,
            playerStats: roundPlayerStatsRecord,
            timeline: [...currentRoundEvents]
        });

        // 3. Update Aggregates
        scores[winner]++;
        statsMap.forEach(p => p.r3_rounds_played = (p.r3_rounds_played || 0) + 1);

        const isFirstHalf = currentRound <= 12;
        if (winner === currentRosterSide) { if (isFirstHalf) s1++; else s3++; } 
        else { if (isFirstHalf) s2++; else s4++; }

        // Clutch Logic
        roundClutchAttempts.forEach((data, sid) => {
            const isTeammate = teammateSteamIds.has(sid);
            const playerSide = isTeammate ? currentRosterSide : (currentRosterSide === 'T' ? 'CT' : 'T');
            const won = (playerSide === winner);
            
            // Check alive status at FINALIZATION (correctly accounts for post-round deaths)
            let isSave = false;
            if (!won) {
                // aliveTs/aliveCTs are updated by player_death events even in garbage time
                const isAlive = (playerSide === 'T' && aliveTs.has(sid)) || (playerSide === 'CT' && aliveCTs.has(sid));
                if (isAlive) isSave = true;
            }
            
            const p = statsMap.get(sid);
            if (p) {
                 const key = `1v${Math.min(data.opponents, 5)}` as keyof typeof p.clutches;
                 if (p.clutches[key]) { if (won) p.clutches[key].won++; else p.clutches[key].lost++; }
                 p.clutchHistory.push({ round: currentRound, opponentCount: data.opponents, result: won ? 'won' : (isSave ? 'saved' : 'lost'), kills: data.kills, side: playerSide });
            }
        });

        currentRound++;
    };

    for (const e of events) {
        const type = e.event_name;
        const tick = e.tick || 0;

        if (type === 'round_announce_match_start') {
            matchStarted = true;
            currentRound = 1;
            scores = { T: 0, CT: 0 };
            s1 = 0; s2 = 0; s3 = 0; s4 = 0;
            statsMap.forEach(p => {
                p.kills = 0; p.deaths = 0; p.assists = 0;
                p.total_damage = 0; (p as any).headshots = 0;
                p.entry_kills = 0; p.kast = 0;
                p.multikills = { k2: 0, k3: 0, k4: 0, k5: 0 };
                p.utility = { smokesThrown: 0, flashesThrown: 0, enemiesBlinded: 0, blindDuration: 0, heThrown: 0, heDamage: 0, molotovsThrown: 0, molotovDamage: 0 };
                p.duels = {};
                p.clutches = { '1v1': { won: 0, lost: 0 }, '1v2': { won: 0, lost: 0 }, '1v3': { won: 0, lost: 0 }, '1v4': { won: 0, lost: 0 }, '1v5': { won: 0, lost: 0 } };
                p.clutchHistory = [];
                p.r3_rounds_played = 0;
            });
            matchRounds.length = 0;
            pendingRoundEnd = null;
            resetRoundState();
        }

        if (!matchStarted) continue;

        // Check if we need to finalize previous round BEFORE passing new round start to engine
        if (type === 'round_start' || type === 'round_freeze_end') {
            if (pendingRoundEnd) {
                processRoundEnd();
                resetRoundState();
                pendingRoundEnd = null;
            } else if (currentRoundEvents.length > 0 && type === 'round_start') {
                // Round started but no round end from previous? Safety reset.
                resetRoundState();
            }
            
            // Update Time Anchors
            if (type === 'round_start') {
                currentRoundStartTick = tick;
                // If it's a new round, clear freeze end until we see it
                if (!pendingRoundEnd) currentFreezeEndTick = null; 
            } else if (type === 'round_freeze_end') {
                currentFreezeEndTick = tick;
            }
        }

        // Pass event to Rating Engine (it tracks damage, trades, inventory)
        ratingEngine.handleEvent(e, currentRound, teammateSteamIds);

        if (type === 'round_end') {
            let winner: 'T' | 'CT' | null = null;
            if (e.winner == 2 || String(e.winner) === '2') winner = 'T';
            else if (e.winner == 3 || String(e.winner) === '3') winner = 'CT';
            
            if (!winner && e.winner) {
                const w = String(e.winner).toLowerCase();
                if (w === 't' || w.includes('terrorist')) winner = 'T';
                if (w === 'ct' || w.includes('counter')) winner = 'CT';
            }
            if (!winner && e.reason !== undefined) {
                 const r = e.reason;
                 if (r == 9 || r == 12) winner = 'T';
                 if (r == 7 || r == 8 || r == 1) winner = 'CT';
            }

            if (winner) {
                // Delay finalization to capture garbage time
                pendingRoundEnd = {
                    winner,
                    reason: e.reason || 0,
                    endTick: tick
                };
                
                // Add marker to timeline
                currentRoundEvents.push({
                    tick,
                    seconds: 0, // Will be updated in processRoundEnd
                    type: 'round_end'
                });
            }
        }
        else if (type === 'player_death') {
            const vic = normalizeSteamId(e.user_steamid);
            const att = normalizeSteamId(e.attacker_steamid);
            const ast = normalizeSteamId(e.assister_steamid);

            aliveTs.delete(vic);
            aliveCTs.delete(vic);
            
            const getTimelineInfo = (sid: string) => {
                if (sid === "BOT" || sid === "0") return { steamid: sid, name: "BOT", side: 'CT' as Side };
                const isTM = teammateSteamIds.has(sid);
                const currentRosterSide = (currentRound <= 12) ? initialRosterSide : (initialRosterSide === 'T' ? 'CT' : 'T');
                const s = isTM ? currentRosterSide : (currentRosterSide === 'T' ? 'CT' : 'T');
                const n = steamIdToName.get(sid) || "Unknown";
                return { steamid: sid, name: n, side: s };
            };

            currentRoundEvents.push({
                tick,
                seconds: 0, // Placeholder
                type: 'kill',
                subject: att ? getTimelineInfo(att) : undefined,
                target: getTimelineInfo(vic),
                weapon: (e.weapon || "").replace("weapon_", ""),
                isHeadshot: e.headshot,
                isWallbang: e.penetrated > 0,
                isBlind: e.attackerblind,
                isSmoke: e.thrusmoke
            });

            if (att && roundClutchAttempts.has(att) && att !== vic && att !== "BOT") {
                const clutchData = roundClutchAttempts.get(att)!;
                clutchData.kills++;
                roundClutchAttempts.set(att, clutchData);
            }
            
            const pVic = statsMap.get(vic);
            const pAtt = statsMap.get(att);
            const pAst = statsMap.get(ast);
            
            const rVic = getRoundPlayerStats(vic);
            const rAtt = att ? getRoundPlayerStats(att) : null;
            const rAst = ast ? getRoundPlayerStats(ast) : null;

            if (pVic) pVic.deaths++;

            if (pAtt && att !== vic && att !== "BOT") {
                pAtt.kills++;
                if (e.headshot) {
                    (pAtt as any).headshots++;
                    if (rAtt) rAtt.headshots = (rAtt.headshots || 0) + 1;
                }
                
                if (pVic) {
                    const vKey = pVic.steamid; 
                    if (!pAtt.duels[vKey]) pAtt.duels[vKey] = { kills: 0, deaths: 0 };
                    pAtt.duels[vKey].kills++;
                    const aKey = pAtt.steamid;
                    if (!pVic.duels[aKey]) pVic.duels[aKey] = { kills: 0, deaths: 0 };
                    pVic.duels[aKey].deaths++;
                }
            }
            if (pAst && ast !== "BOT" && ast !== att && ast !== vic) {
                 pAst.assists++;
                 if (rAst) rAst.assists = (rAst.assists || 0) + 1;
                 
                 if (e.assistedflash) {
                     pAst.flash_assists = (pAst.flash_assists || 0) + 1;
                     currentRoundEvents.push({
                         tick, seconds: 0, type: 'flash_assist',
                         subject: getTimelineInfo(ast), target: getTimelineInfo(vic)
                     });
                 } else {
                     currentRoundEvents.push({
                         tick, seconds: 0, type: 'assist',
                         subject: getTimelineInfo(ast), target: getTimelineInfo(vic)
                     });
                 }
            }
            
            if (aliveTs.size === 1 && aliveCTs.size >= 1) {
                const survivor = Array.from(aliveTs)[0];
                if (!roundClutchAttempts.has(survivor)) roundClutchAttempts.set(survivor, { opponents: aliveCTs.size, kills: 0 });
            }
            if (aliveCTs.size === 1 && aliveTs.size >= 1) {
                const survivor = Array.from(aliveCTs)[0];
                if (!roundClutchAttempts.has(survivor)) roundClutchAttempts.set(survivor, { opponents: aliveTs.size, kills: 0 });
            }
        }
        else if (type === 'player_hurt') {
            const att = normalizeSteamId(e.attacker_steamid);
            const vic = normalizeSteamId(e.user_steamid);
            const rawDmg = parseInt(e.dmg_health || 0);
            const actualDmg = healthTracker.recordDamage(vic, rawDmg);

            if (actualDmg > 0) {
                 const getTimelineInfo = (sid: string) => {
                    if (sid === "BOT" || sid === "0") return { steamid: sid, name: "World", side: 'CT' as Side };
                    const isTM = teammateSteamIds.has(sid);
                    const currentRosterSide = (currentRound <= 12) ? initialRosterSide : (initialRosterSide === 'T' ? 'CT' : 'T');
                    const s = isTM ? currentRosterSide : (currentRosterSide === 'T' ? 'CT' : 'T');
                    const n = steamIdToName.get(sid) || "Unknown";
                    return { steamid: sid, name: n, side: s };
                };
                
                currentRoundEvents.push({
                    tick,
                    seconds: 0,
                    type: 'damage',
                    subject: att ? getTimelineInfo(att) : undefined,
                    target: getTimelineInfo(vic),
                    weapon: (e.weapon || "").replace("weapon_", ""),
                    damage: actualDmg,
                    hitgroup: e.hitgroup
                });
            }

            if (att && att !== "BOT" && att !== "0" && att !== vic) {
                const p = statsMap.get(att);
                const r = getRoundPlayerStats(att);
                if (p) {
                    p.total_damage += actualDmg; 
                    const w = (e.weapon || "").replace("weapon_", "");
                    if (w === 'hegrenade') {
                        p.utility.heDamage += actualDmg;
                        r.utility.heDamage += actualDmg;
                        r.utilityDamage += actualDmg;
                    }
                    if (w === 'molotov' || w === 'incendiary' || w === 'inferno') {
                        p.utility.molotovDamage += actualDmg;
                        r.utility.molotovDamage += actualDmg;
                        r.utilityDamage += actualDmg;
                    }
                }
            }
        }
        else if (type === 'player_blind') {
            const att = normalizeSteamId(e.attacker_steamid);
            const vic = normalizeSteamId(e.user_steamid);
            const dur = parseFloat(e.blind_duration || 0);
            if (att && att !== "BOT" && att !== vic) {
                if (dur > 0) {
                    const p = statsMap.get(att);
                    const r = getRoundPlayerStats(att);
                    if (p) {
                        p.utility.enemiesBlinded++;
                        p.utility.blindDuration += dur;
                        r.utility.enemiesBlinded++;
                        r.utility.blindDuration += dur;
                    }
                }
            }
        }
        else if (type.endsWith('_detonate')) {
            const sid = normalizeSteamId(e.user_steamid);
            const p = statsMap.get(sid);
            const r = getRoundPlayerStats(sid);
            if (p) {
                if (type.includes('smoke')) { p.utility.smokesThrown++; r.utility.smokesThrown++; }
                if (type.includes('flash')) { p.utility.flashesThrown++; r.utility.flashesThrown++; }
                if (type.includes('hegrenade')) { p.utility.heThrown++; r.utility.heThrown++; }
                if (type.includes('molotov') || type.includes('incendiary')) { p.utility.molotovsThrown++; r.utility.molotovsThrown++; }
            }
        }
        else if (type === 'bomb_planted') {
            const sid = normalizeSteamId(e.user_steamid);
            const r = getRoundPlayerStats(sid);
            if (r) r.planted = true;
            
            const getTimelineInfo = (s: string) => {
                const n = steamIdToName.get(s) || "Unknown";
                return { steamid: s, name: n, side: 'T' as Side };
            };
            currentRoundEvents.push({
                tick, seconds: 0, type: 'plant', subject: getTimelineInfo(sid)
            });
        }
        else if (type === 'bomb_defused') {
            const sid = normalizeSteamId(e.user_steamid);
            const r = getRoundPlayerStats(sid);
            if (r) r.defused = true;
            
            const getTimelineInfo = (s: string) => {
                const n = steamIdToName.get(s) || "Unknown";
                return { steamid: s, name: n, side: 'CT' as Side };
            };
            currentRoundEvents.push({
                tick, seconds: 0, type: 'defuse', subject: getTimelineInfo(sid)
            });
        }
        else if (type === 'bomb_exploded') {
            currentRoundEvents.push({
                tick, seconds: 0, type: 'explode'
            });
        }
    }

    // Handle end of match (last round)
    if (pendingRoundEnd) {
        processRoundEnd();
    }

    ratingEngine.applyStats(statsMap);

    const ourPlayers: PlayerMatchStats[] = [];
    const enemyPlayers: PlayerMatchStats[] = [];
    
    statsMap.forEach((stats, sid) => {
        const rounds = stats.r3_rounds_played || 1;
        stats.adr = parseFloat((stats.total_damage / rounds).toFixed(1));
        
        const heads = (stats as any).headshots || 0;
        if (stats.kills > 0) {
            stats.hsRate = parseFloat(((heads / stats.kills) * 100).toFixed(1));
        } else {
            stats.hsRate = 0;
        }

        // Ghost filtering for overall stats
        if (stats.kills === 0 && stats.deaths === 0 && stats.assists === 0 && stats.total_damage === 0 && stats.utility_count === 0) return;
        
        const isRosterByName = ROSTER.some(r => r.id === stats.playerId);

        if (teammateSteamIds.has(sid) || isRosterByName) ourPlayers.push(stats);
        else enemyPlayers.push(stats);
    });

    ourPlayers.sort((a,b) => b.rating - a.rating);
    enemyPlayers.sort((a,b) => b.rating - a.rating);

    const finalScoreUs = s1 + s3;
    const finalScoreThem = s2 + s4;
    
    return {
        id: generateId('demo'),
        source: 'Demo',
        date: new Date().toISOString(),
        mapId: meta.map_name || 'Unknown',
        serverName: meta.server_name, // Add this
        rank: 'N/A',
        result: finalScoreUs > finalScoreThem ? 'WIN' : finalScoreUs < finalScoreThem ? 'LOSS' : 'TIE',
        startingSide: initialRosterSide,
        score: { 
            us: finalScoreUs, 
            them: finalScoreThem, 
            half1_us: s1, half1_them: s2, 
            half2_us: s3, half2_them: s4 
        }, 
        players: ourPlayers,
        enemyPlayers: enemyPlayers,
        rounds: matchRounds 
    };
};