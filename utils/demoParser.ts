
import { DemoData, Match, PlayerMatchStats, MatchRound, MatchTimelineEvent, PlayerRoundStats, Side } from "../types";
import { generateId } from "./idGenerator";
import { ROSTER } from "../constants/roster";
import { RatingEngine } from "./rating3/RatingEngine";
import { HealthTracker } from "./rating3/HealthTracker";

// Import split modules
import { normalizeSteamId, resolveName } from "./demo/helpers";
import { determineTeammates } from "./demo/teamLogic";
import { determineStartingSide } from "./demo/sideLogic";

export const parseDemoJson = (data: DemoData): Match => {
    const events = Array.isArray(data) ? data : (data.events || []);
    const meta = (!Array.isArray(data) && data.meta) ? data.meta : { map_name: 'Unknown', server_name: '' };
    
    events.sort((a: any, b: any) => (a.tick || 0) - (b.tick || 0));

    // --- PHASE 1-4: Identify Players & Teams (Extracted) ---
    const { 
        teammateSteamIds, 
        steamIdToName, 
        activeSteamIds, 
        allSteamIds 
    } = determineTeammates(data, events);

    // --- PHASE 5: Determine Starting Side (Extracted) ---
    const initialRosterSide = determineStartingSide(events, teammateSteamIds);

    // --- PHASE 6: CALCULATE STATS (Engine Loop) ---
    // Note: The rest of this function is largely preserved to ensure exact metric behavior
    
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

    // Track dynamic team assignments from events
    const playerSideMap = new Map<string, 'T' | 'CT'>();
    
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
                adr: 0, hsRate: 0, rating: 0, we: 0, wpa: 0,
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
    let roundTs = new Set<string>(); // New: Track all T players
    let roundCTs = new Set<string>(); // New: Track all CT players

    let roundClutchAttempts = new Map<string, { opponents: number, kills: number }>();
    
    // Check match start availability same as before
    const hasMatchStart = events.some(e => e.event_name === 'round_announce_match_start');
    let matchStarted = !hasMatchStart;

    const tickRate = 64; 

    const resetRoundState = () => {
        aliveTs.clear();
        aliveCTs.clear();
        roundTs.clear();
        roundCTs.clear();

        roundClutchAttempts.clear();
        healthTracker.reset(); 
        currentRoundPlayerStats.clear();
        currentRoundEvents = [];
        
        currentRoundStartTick = 0;
        currentFreezeEndTick = null;

        const currentRosterSide = (currentRound <= 12) ? initialRosterSide : (initialRosterSide === 'T' ? 'CT' : 'T');
        
        activeSteamIds.forEach(sid => {
            // Priority: Use the definitive side from playerSideMap
            const realSide = playerSideMap.get(sid);
            let side: 'T' | 'CT';

            if (realSide) {
                side = realSide;
            } else {
                // Fallback to roster logic if not yet seen in team events
                const isTeammate = teammateSteamIds.has(sid);
                side = isTeammate ? currentRosterSide : (currentRosterSide === 'T' ? 'CT' : 'T');
            }

            if (side === 'T') {
                aliveTs.add(sid);
                roundTs.add(sid);
            } else {
                aliveCTs.add(sid);
                roundCTs.add(sid);
            }
        });
    };

    // Helper: Finalize the PREVIOUS round (including post-round events)
    const processRoundEnd = () => {
        if (!pendingRoundEnd) return;
        
        const { winner, reason, endTick } = pendingRoundEnd;
        const currentRosterSide = (currentRound <= 12) ? initialRosterSide : (initialRosterSide === 'T' ? 'CT' : 'T');

        let targetTs = Array.from(roundTs);
        let targetCTs = Array.from(roundCTs);

        // Fallback logic for empty sets
        if (targetTs.length === 0 || targetCTs.length === 0) {
            const fallbackTs: string[] = [];
            const fallbackCTs: string[] = [];
            activeSteamIds.forEach(sid => {
                const side = playerSideMap.get(sid);                    
                if (!side) console.log('[Debug] ID missing in map:', sid);
                if (side === 'T') fallbackTs.push(sid);
                else if (side === 'CT') fallbackCTs.push(sid);
            });
            if (targetTs.length === 0) targetTs = fallbackTs;
            if (targetCTs.length === 0) targetCTs = fallbackCTs;
        }

        // console.log('[WPA] Distributing WPA:', { T: targetTs.length, CT: targetCTs.length, winner });

        ratingEngine.finalizeRound(Array.from(activeSteamIds), targetTs, targetCTs, winner);
        
        const roundPlayerStatsRecord: Record<string, PlayerRoundStats> = {};
        
        activeSteamIds.forEach(sid => {
            const ratingCtx = ratingEngine.getCurrentRoundContext(sid);
            const tempStats = getRoundPlayerStats(sid);
            
            let pSide: 'T' | 'CT' = 'CT';
            if (playerSideMap.has(sid)) pSide = playerSideMap.get(sid)!;
            else if (roundTs.has(sid)) pSide = 'T';
            else if (roundCTs.has(sid)) pSide = 'CT';
            else {
                 const isTeammate = teammateSteamIds.has(sid);
                 pSide = isTeammate ? currentRosterSide : (currentRosterSide === 'T' ? 'CT' : 'T');
            }

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
                    wpa: ratingCtx.wpa,
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

        const anchorTick = currentFreezeEndTick ?? currentRoundStartTick;
        const roundDuration = Math.max(0, (endTick - anchorTick) / tickRate);

        currentRoundEvents.forEach(ev => {
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

        scores[winner]++;
        statsMap.forEach(p => p.r3_rounds_played = (p.r3_rounds_played || 0) + 1);

        const isFirstHalf = currentRound <= 12;
        if (winner === currentRosterSide) { if (isFirstHalf) s1++; else s3++; } 
        else { if (isFirstHalf) s2++; else s4++; }

        roundClutchAttempts.forEach((data, sid) => {
            const isTeammate = teammateSteamIds.has(sid);
            const playerSide = isTeammate ? currentRosterSide : (currentRosterSide === 'T' ? 'CT' : 'T');
            const won = (playerSide === winner);
            
            let isSave = false;
            if (!won) {
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

    // --- Main Event Loop ---
    let latestFreezeEndTick = 0; // Track last freeze_end seen (even in warmup)

    for (const e of events) {
        const type = e.event_name;
        const tick = e.tick || 0;

        if (type === 'round_freeze_end') {
            latestFreezeEndTick = tick;
        }

        // Side Map Updates
        if (type === 'player_team') {
            const sid = normalizeSteamId(e.user_steamid || e.player || e.userid); 
            const tm = e.team || e.team_num; 
            
            // WPA FIX: Sync round rosters immediately when team changes
            roundTs.delete(sid);
            roundCTs.delete(sid);

            if (tm == 2) { 
                playerSideMap.set(sid, 'T');
                roundTs.add(sid);
            }
            else if (tm == 3) { 
                playerSideMap.set(sid, 'CT');
                roundCTs.add(sid);
            }
        }
        if (type === 'player_spawn') {
            const sid = normalizeSteamId(e.user_steamid || e.userid);
            const tm = e.team_num || e.team;
            
            // WPA FIX: Sync round rosters immediately on spawn
            if (tm == 2) { 
                playerSideMap.set(sid, 'T');
                roundCTs.delete(sid);
                roundTs.add(sid);
            }
            else if (tm == 3) { 
                playerSideMap.set(sid, 'CT');
                roundTs.delete(sid);
                roundCTs.add(sid);
            }
        }
        if (e.user_steamid) {
            const sid = normalizeSteamId(e.user_steamid);
            const tm = e.user_team_num || e.team_num;
            if (tm == 2) playerSideMap.set(sid, 'T');
            else if (tm == 3) playerSideMap.set(sid, 'CT');
        }
        if (e.attacker_steamid) {
            const sid = normalizeSteamId(e.attacker_steamid);
            const tm = e.attacker_team_num;
            if (tm == 2) playerSideMap.set(sid, 'T');
            else if (tm == 3) playerSideMap.set(sid, 'CT');
        }

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

            // Notify Engine of Match Start (Clear State)
            ratingEngine.handleEvent(e, currentRound, teammateSteamIds, aliveTs, aliveCTs, roundTs, roundCTs);

            // FIX: Initialize Round 1 if round_freeze_end was skipped (happened before match start)
            // Many demos have round_freeze_end BEFORE match_start, causing WPA to fail (0% win prob due to time panic)
            // We use the last seen freeze_end if it was recent, otherwise current tick
            const isRecent = (tick - latestFreezeEndTick) < (64 * 20); // 20s tolerance
            const effectiveStart = (latestFreezeEndTick > 0 && isRecent) ? latestFreezeEndTick : tick;

            // Synthesize freeze_end to initialize WPA Engine time tracking
            ratingEngine.handleEvent(
                { event_name: 'round_freeze_end', tick: effectiveStart },
                currentRound, teammateSteamIds, aliveTs, aliveCTs, roundTs, roundCTs
            );

            // Add visual start event
            currentFreezeEndTick = effectiveStart;
            currentRoundEvents.push({
                tick: effectiveStart,
                seconds: 0,
                type: 'damage', // Logic-only type
                subject: { steamid: '0', name: 'Round Start (Est)', side: 'CT' },
                weapon: 'init',
                winProb: ratingEngine.getRoundWinProb()
            });

            continue;
        }

        if (!matchStarted) continue;

        if (type === 'round_start' || type === 'round_freeze_end') {
            if (pendingRoundEnd) {
                processRoundEnd();
                resetRoundState();
                pendingRoundEnd = null;
            } else if (currentRoundEvents.length > 0 && type === 'round_start') {
                resetRoundState();
            }
            
            if (type === 'round_start') {
                currentRoundStartTick = tick;
                if (!pendingRoundEnd) currentFreezeEndTick = null; 
            } else if (type === 'round_freeze_end') {
                currentFreezeEndTick = tick;
            }
        }
        
        // LAZY INIT FIX: For visual timeline
        // If we missed the start/freeze_end events (broken demo), initialize anchor now
        // so we don't get huge negative numbers or absurd durations
        if (currentRoundStartTick === 0 && currentFreezeEndTick === null && tick > 0) {
             // Only for gameplay events
             if (type === 'player_death' || type === 'player_hurt' || type === 'bomb_planted' || type.includes('grenade')) {
                 currentFreezeEndTick = tick;
                 currentRoundEvents.push({
                    tick,
                    seconds: 0,
                    type: 'damage',
                    subject: { steamid: '0', name: 'Round Start (Auto-Fix)', side: 'CT' },
                    weapon: 'init',
                    winProb: 0.5
                });
             }
        }

        ratingEngine.handleEvent(e, currentRound, teammateSteamIds, aliveTs, aliveCTs, roundTs, roundCTs);

        // MOVED: Win Probability Event generation AFTER handleEvent so engine is initialized
        if (type === 'round_freeze_end') {
            currentRoundEvents.push({
                tick,
                seconds: 0,
                type: 'damage', // Using generic type for start event, strictly logic only
                subject: { steamid: '0', name: 'Round Start', side: 'CT' },
                weapon: 'init',
                winProb: ratingEngine.getRoundWinProb() // Initial Win Prob
            });
        }

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
                pendingRoundEnd = {
                    winner,
                    reason: e.reason || 0,
                    endTick: tick
                };
                currentRoundEvents.push({
                    tick,
                    seconds: 0,
                    type: 'round_end',
                    winProb: winner === 'T' ? 1.0 : 0.0
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
                seconds: 0, 
                type: 'kill',
                subject: att ? getTimelineInfo(att) : undefined,
                target: getTimelineInfo(vic),
                weapon: (e.weapon || "").replace("weapon_", ""),
                isHeadshot: e.headshot,
                isWallbang: e.penetrated > 0,
                isBlind: e.attackerblind,
                isSmoke: e.thrusmoke,
                winProb: ratingEngine.getRoundWinProb()
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
                         subject: getTimelineInfo(ast), target: getTimelineInfo(vic),
                         winProb: ratingEngine.getRoundWinProb()
                     });
                 } else {
                     currentRoundEvents.push({
                         tick, seconds: 0, type: 'assist',
                         subject: getTimelineInfo(ast), target: getTimelineInfo(vic),
                         winProb: ratingEngine.getRoundWinProb()
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
                    hitgroup: e.hitgroup,
                    winProb: ratingEngine.getRoundWinProb()
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
                tick, seconds: 0, type: 'plant', subject: getTimelineInfo(sid),
                winProb: ratingEngine.getRoundWinProb()
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
                tick, seconds: 0, type: 'defuse', subject: getTimelineInfo(sid),
                winProb: ratingEngine.getRoundWinProb()
            });
        }
        else if (type === 'bomb_exploded') {
            currentRoundEvents.push({
                tick, seconds: 0, type: 'explode',
                winProb: ratingEngine.getRoundWinProb()
            });
        }
    }

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
        serverName: meta.server_name, 
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
