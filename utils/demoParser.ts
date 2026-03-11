import { DemoData, Match, PlayerMatchStats, MatchRound, MatchTimelineEvent, PlayerRoundStats, Side } from "../types";
import { generateId } from "./idGenerator";
import { ROSTER } from "../constants/roster";
import { RatingEngine } from "./rating3/RatingEngine";
import { HealthTracker } from "./rating3/HealthTracker";

// Import split modules
import { normalizeSteamId, resolveName } from "./demo/helpers";
import { determineTeammates } from "./demo/teamLogic";
import { determineStartingSide } from "./demo/sideLogic";

// Hitgroup mapping for JSON string values
const HITGROUP_MAP: Record<string, number> = {
    'generic': 0,
    'head': 1,
    'chest': 2,
    'stomach': 3,
    'left arm': 4,
    'right arm': 5,
    'left leg': 6,
    'right leg': 7,
    'gear': 10
};

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

    // --- PHASE 5.5: Pre-Analyze Round Results (Retrospective Logic) ---
    const roundResults = new Map<number, { winner: 'T' | 'CT', reason: number, endTick: number, defuserSid?: string, defuseTick?: number }>();
    const roundFreezeEnds = new Map<number, number>(); // Store freeze end ticks for filtering
    {
        let tempRound = 1;
        let tempMatchStarted = false;
        let tempRoundStartTick = 0;
        let tempFreezeEndTick = 0;
        let tempDefuser: string | undefined = undefined;
        let tempDefuseTick: number | undefined = undefined; // NEW
        let tempExploded = false;
        
        // Replicate the exact state machine of the main loop to ensure round alignment
        // We must handle 'round_announce_match_start' exactly as Phase 2 does.
        const hasMatchStart = events.some(e => e.event_name === 'round_announce_match_start');
        tempMatchStarted = !hasMatchStart; // If no match start event, assume started immediately (like Phase 2)

        events.forEach(e => {
            if (e.event_name === 'round_announce_match_start') {
                tempMatchStarted = true;
                tempRound = 1;
                roundResults.clear();
                roundFreezeEnds.clear();
                tempRoundStartTick = 0;
                tempFreezeEndTick = 0;
                tempDefuser = undefined;
                tempDefuseTick = undefined;
                tempExploded = false;
            }
            if (!tempMatchStarted) return;

            if (e.event_name === 'round_start') {
                // IMPLICIT ROUND END CHECK: Match Phase 6 logic
                // If we see a new round_start while already in a round (and haven't seen round_end),
                // it means the previous round ended implicitly.
                // We must increment tempRound to keep indices aligned with the main loop.
                if (tempRoundStartTick > 0) {
                    // FIX: Infer result for implicit round end
                    // If we have a defuser, it's a CT win. If exploded, it's a T win.
                    let implicitWinner: 'T' | 'CT' | null = null;
                    let implicitReason = 0;
                    
                    if (tempDefuser) {
                        implicitWinner = 'CT';
                        implicitReason = 7; // TargetSaved (Defused)
                    } else if (tempExploded) {
                        implicitWinner = 'T';
                        implicitReason = 1; // TargetBombed
                    }
                    
                    // If we can't infer from bomb, check if we have any result stored for this round? No.
                    // Just save what we have.
                    
                    if (implicitWinner) {
                         roundResults.set(tempRound, { 
                             winner: implicitWinner, 
                             reason: implicitReason, 
                             endTick: e.tick, // Use current tick as end tick
                             defuserSid: tempDefuser,
                             defuseTick: tempDefuseTick
                         });
                    }
                    
                    if (tempFreezeEndTick > 0) {
                         roundFreezeEnds.set(tempRound, tempFreezeEndTick);
                    }

                    tempRound++;
                    // Reset state for new round
                    tempFreezeEndTick = 0;
                    tempDefuser = undefined;
                    tempDefuseTick = undefined;
                    tempExploded = false;
                }
                
                tempRoundStartTick = e.tick;
                tempDefuser = undefined;
                tempDefuseTick = undefined;
                tempExploded = false;
            }
            if (e.event_name === 'round_freeze_end') {
                tempFreezeEndTick = e.tick;
            }
            
            // LAZY INIT REPLICATION: Match Phase 6 logic
            if (tempRoundStartTick === 0 && tempFreezeEndTick === 0 && e.tick > 0) {
                 const type = e.event_name;
                 if (type === 'player_death' || type === 'player_hurt' || type === 'bomb_planted' || type.includes('grenade')) {
                     tempFreezeEndTick = e.tick;
                     tempRoundStartTick = e.tick; // Implicit start
                 }
            }

            if (e.event_name === 'bomb_defused') {
                const anyE = e as any;
                tempDefuser = normalizeSteamId(anyE.userid || anyE.user_steamid);
                tempDefuseTick = e.tick; // NEW
            }
            
            if (e.event_name === 'bomb_exploded') {
                tempExploded = true;
            }
            
            if (e.event_name === 'round_end') {
                const anyE = e as any;
                let winner: 'T' | 'CT' | null = null;
                
                // 1. Try standard winner field
                if (anyE.winner == 2 || String(anyE.winner) === '2') winner = 'T';
                else if (anyE.winner == 3 || String(anyE.winner) === '3') winner = 'CT';
                
                // 2. Fallback text check
                if (!winner && anyE.winner) {
                     const w = String(anyE.winner).toLowerCase();
                     if (w === 't' || w.includes('terrorist')) winner = 'T';
                     if (w === 'ct' || w.includes('counter')) winner = 'CT';
                }

                // 3. PRIORITY OVERRIDE: Reason-based determination
                if (anyE.reason !== undefined) {
                     const r = Number(anyE.reason);
                     if (r === 1 || r === 12) winner = 'T';
                     if (r === 7) winner = 'CT';
                     if (!winner) {
                         if (r === 8 || r === 9) winner = r === 8 ? 'T' : 'CT';
                     }
                }

                if (winner) {
                    const reason = Number(anyE.reason);
                    const endTick = e.tick;
                    
                    // --- WARMUP CHECK REPLICATION ---
                    const tickRate = 64; // Assume 64 for check
                    const checkAnchor = tempFreezeEndTick || tempRoundStartTick;
                    const checkDuration = Math.max(0, (endTick - checkAnchor) / tickRate);
                    
                    let isWarmup = false;
                    if (tempRound === 1) {
                        if (checkDuration < 15) isWarmup = true;
                        if (reason === 7 && (checkDuration < 114 || checkDuration > 116)) isWarmup = true;
                    }

                    if (!isWarmup) {
                        // console.log(`[Parser] Phase 5.5: Found Round ${tempRound} Result: Winner=${winner}, Reason=${reason}, EndTick=${endTick}`);
                        roundResults.set(tempRound, { winner, reason, endTick, defuserSid: tempDefuser, defuseTick: tempDefuseTick });
                        if (tempFreezeEndTick > 0) {
                            roundFreezeEnds.set(tempRound, tempFreezeEndTick);
                        }
                        
                        // IMPORTANT: Phase 2 increments round AFTER processing round_end
                        tempRound++;
                        
                        // Reset state
                        tempRoundStartTick = 0;
                        tempFreezeEndTick = 0;
                        tempDefuser = undefined;
                        tempDefuseTick = undefined;
                        tempExploded = false;
                    } else {
                        // If warmup, we don't increment tempRound, effectively discarding it
                        // Reset state just like main loop
                        tempRoundStartTick = 0;
                        tempFreezeEndTick = 0;
                        tempDefuser = undefined;
                        tempDefuseTick = undefined;
                        tempExploded = false;
                    }
                }
            }
        });
        console.log(`[Parser] Phase 5.5 Complete. Found ${roundResults.size} rounds.`);
    }

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

    // FIX: Pre-fill playerSideMap to ensure we have data for Round 1
    // This handles cases where 'round_announce_match_start' is missing or player_team events are incomplete
    activeSteamIds.forEach(sid => {
        if (teammateSteamIds.has(sid)) {
            playerSideMap.set(sid, initialRosterSide);
        } else {
            playerSideMap.set(sid, initialRosterSide === 'T' ? 'CT' : 'T');
        }
    });
    
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
    let otUs = 0, otThem = 0;

    let aliveTs = new Set<string>();
    let aliveCTs = new Set<string>();
    let roundTs = new Set<string>(); // New: Track all T players
    let roundCTs = new Set<string>(); // New: Track all CT players
    let firstKillHappened = false;

    let roundClutchAttempts = new Map<string, { opponents: number, kills: number }>();
    
    // Check match start availability same as before
    const hasMatchStart = events.some(e => e.event_name === 'round_announce_match_start');
    let matchStarted = !hasMatchStart;

    const tickRate = 64; 

    // --- Helper: Calculate Side for Round (Supports OT) ---
    const getRoundSide = (round: number, initialSide: 'T' | 'CT'): 'T' | 'CT' => {
        const oppositeSide = initialSide === 'T' ? 'CT' : 'T';
        
        // Regular Time (MR12)
        if (round <= 24) {
            return round <= 12 ? initialSide : oppositeSide;
        }
        
        // Overtime (MR3, 6 rounds per OT)
        const otRound = round - 24;
        const otNumber = Math.ceil(otRound / 6); // 1, 2, 3...
        const otSubRound = (otRound - 1) % 6; // 0..5
        
        // Determine the starting side for this OT block
        // OT1 (Odd): Starts with Opposite Side (Stay on side from end of Reg)
        // OT2 (Even): Starts with Initial Side
        const otStartSide = (otNumber % 2 !== 0) ? oppositeSide : initialSide;
        
        // Determine side for specific round within OT (Swap after 3 rounds)
        if (otSubRound < 3) {
            return otStartSide;
        } else {
            return otStartSide === 'T' ? 'CT' : 'T';
        }
    };

    const resetRoundState = () => {
        aliveTs.clear();
        aliveCTs.clear();
        roundTs.clear();
        roundCTs.clear();
        firstKillHappened = false;

        roundClutchAttempts.clear();
        healthTracker.reset(); 
        ratingEngine.resetRoundState();
        currentRoundPlayerStats.clear();
        currentRoundEvents = [];
        
        currentRoundStartTick = 0;
        currentFreezeEndTick = null;

        const currentRosterSide = getRoundSide(currentRound, initialRosterSide);
        
        activeSteamIds.forEach(sid => {
            // FIX: Ensure playerSideMap reflects the CURRENT half's side
            // Previously, playerSideMap was static from match start, causing 2nd half stats to be attributed to 1st half side.
            // We now update it based on the roster logic for the current round.
            const isTeammate = teammateSteamIds.has(sid);
            const expectedSide = isTeammate ? currentRosterSide : (currentRosterSide === 'T' ? 'CT' : 'T');
            
            // Update the map to the current correct side
            playerSideMap.set(sid, expectedSide);

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

        // WARMUP CHECK: Time Limit with Abnormal Duration
        // Reason 7 = Target Saved (Time Limit)
        // Standard round is 1:55 (115s). If it ends by time limit significantly earlier or later, 
        // it implies the round timer was not a full regulation round, thus Warmup.
        const checkAnchor = currentFreezeEndTick ?? currentRoundStartTick;
        const checkDuration = Math.max(0, (endTick - checkAnchor) / tickRate);

        // User Request: Discard if Round 1, Reason 7 (Time), and duration NOT in [114, 116] (1:54 - 1:56)
        // FIX: Also discard impossibly short rounds (< 15s) which are likely warmup artifacts
        const r = Number(reason);
        if (currentRound === 1) {
             if (checkDuration < 15) {
                 // console.log('[Parser] Discarding Warmup Round (Impossibly Short)', { duration: checkDuration });
                 resetRoundState();
                 pendingRoundEnd = null;
                 return;
             }
             
             if (r === 7 && (checkDuration < 114 || checkDuration > 116)) {
                 // console.log('[Parser] Discarding Warmup Round (Time Limit + Abnormal Duration)', { duration: checkDuration });
                 resetRoundState();
                 pendingRoundEnd = null;
                 return;
             }
        }
        
        const currentRosterSide = getRoundSide(currentRound, initialRosterSide);

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
            const p = statsMap.get(sid);

            // Multikill tracking
            const roundKills = ratingCtx?.kills || 0;
            if (p && roundKills >= 2) {
                if (roundKills === 2) p.multikills.k2++;
                else if (roundKills === 3) p.multikills.k3++;
                else if (roundKills === 4) p.multikills.k4++;
                else if (roundKills >= 5) p.multikills.k5++;
            }

            if (p && ratingCtx) {
                if (ratingCtx.isEntryKill) p.entry_kills = (p.entry_kills || 0) + 1;
                if (ratingCtx.isEntryDeath) p.entry_deaths = (p.entry_deaths || 0) + 1;
            }
            
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

        // Calculate Team Economy for the round
        let equipUs = 0;
        let equipThem = 0;

        activeSteamIds.forEach(sid => {
            const startVal = ratingEngine.getInventoryValue(sid, 'start');
            const isTeammate = teammateSteamIds.has(sid);
            // Determine side for this round to correctly attribute economy
            // We use the side from playerSideMap which should be accurate for the round
            const pSide = playerSideMap.get(sid);
            
            // If we know the side, we can group by side. 
            // However, "Us" vs "Them" depends on who is "Us".
            // "Us" is defined by teammateSteamIds.
            
            if (isTeammate) {
                equipUs += startVal;
            } else {
                equipThem += startVal;
            }
        });

        matchRounds.push({
            roundNumber: currentRound,
            winnerSide: winner,
            winReason: reason || 0,
            duration: roundDuration,
            endTick: endTick,
            playerStats: roundPlayerStatsRecord,
            timeline: [...currentRoundEvents],
            equip_value_us: equipUs,
            equip_value_them: equipThem
        });

        scores[winner]++;
        statsMap.forEach(p => p.r3_rounds_played = (p.r3_rounds_played || 0) + 1);

        // CS2 strictly uses MR12 (12 rounds per half, 24 rounds regulation)
        const halfMax = 12;
        const regulationMax = 24;

        if (currentRound <= halfMax) {
            if (winner === currentRosterSide) s1++; else s2++;
        } else if (currentRound <= regulationMax) {
            if (winner === currentRosterSide) s3++; else s4++;
        } else {
            // OT rounds
            if (winner === currentRosterSide) otUs++; else otThem++;
        }

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
                 p.clutchHistory.push({ 
                     round: currentRound, 
                     opponentCount: data.opponents, 
                     result: won ? 'won' : (isSave ? 'saved' : 'lost'), 
                     kills: data.kills, 
                     side: playerSide,
                     mapName: meta.map_name || 'Unknown'
                 });
            }
        });

        currentRound++;
    };

    // FIX: Initialize round state (aliveTs, roundTs, etc.) immediately!
    // If the demo misses 'round_announce_match_start', these sets would otherwise remain empty
    // until the first 'round_start', causing WPA to ignore kills in the first round.
    resetRoundState();

    // --- Main Event Loop ---
    let latestFreezeEndTick = 0; // Track last freeze_end seen (even in warmup)
    let hasRoundStartSeen = !hasMatchStart; // If no match start announce, assume we are in game

    // Determine the last round number from pre-analysis
    let lastRound = 0;
    if (roundResults.size > 0) {
        lastRound = Math.max(...Array.from(roundResults.keys()));
    }

    for (const e of events) {
        const type = e.event_name;
        const tick = e.tick || 0;

        if (type === 'round_freeze_end') {
            latestFreezeEndTick = tick;
        }

        // --- REMOVED: Event-based playerSideMap updates ---
        // CS2 demos often have buggy team_num fields (especially after halftime).
        // Relying on these fields corrupts playerSideMap and causes friendly fire false positives.
        // We now strictly rely on resetRoundState() which uses the robust roster logic.

        if (type === 'round_announce_match_start') {
            matchStarted = true;
            hasRoundStartSeen = false; // Reset: Wait for first real round_start
            currentRound = 1;
            scores = { T: 0, CT: 0 };
            s1 = 0; s2 = 0; s3 = 0; s4 = 0;
            otUs = 0; otThem = 0;
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
            
            // FIX: Force populate playerSideMap based on roster
            // This handles cases where spawn events happen before match start
            activeSteamIds.forEach(sid => {
                if (teammateSteamIds.has(sid)) {
                    playerSideMap.set(sid, initialRosterSide);
                } else {
                    playerSideMap.set(sid, initialRosterSide === 'T' ? 'CT' : 'T');
                }
            });

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
            
            // Pass Pre-Analyzed Result to Engine
            const result = roundResults.get(currentRound);
            if (result) ratingEngine.setRoundResult(result);

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

        // Helper to check if current round is a side-switch round
        const isSwitchSideRound = (round: number) => {
            if (round === 12) return true;
            if (round === 24) return true;
            if (round > 24) {
                const otRound = round - 24;
                return otRound % 3 === 0;
            }
            return false;
        };

        if (type === 'round_start' || type === 'round_freeze_end') {
            hasRoundStartSeen = true; // Confirmed round start
            if (pendingRoundEnd) {
                processRoundEnd();
                resetRoundState();
                pendingRoundEnd = null;
            } else if (currentRoundStartTick > 0 && type === 'round_start') {
                // FIX: Implicit round end detected (missing round_end event)
                // We must finalize the previous round instead of discarding it.
                // Match Phase 1 logic: Any new round_start while in a round means the previous one ended.
                
                // 1. Infer Winner (if not already set)
                let inferredWinner: 'T' | 'CT' = 'CT'; // Default
                if (currentRoundEvents.length > 0) {
                    const hasExplosion = currentRoundEvents.some(e => e.type === 'explode');
                    const hasDefuse = currentRoundEvents.some(e => e.type === 'defuse');
                    
                    if (hasExplosion) inferredWinner = 'T';
                    else if (hasDefuse) inferredWinner = 'CT';
                    else if (aliveTs.size === 0 && aliveCTs.size > 0) inferredWinner = 'CT';
                    else if (aliveCTs.size === 0 && aliveTs.size > 0) inferredWinner = 'T';
                }
                
                // 2. Set Pending End
                pendingRoundEnd = {
                    winner: inferredWinner,
                    reason: 1, // TargetBombed(T) or CTWin(CT) approx
                    endTick: tick
                };
                
                // 3. Process & Reset
                processRoundEnd();
                resetRoundState();
                pendingRoundEnd = null;
            } else if (currentRoundStartTick === 0) {
                // FIX: If we are starting a new round (currentRoundStartTick is 0) and there is no pending round end,
                // it means any events that happened before this (e.g. warmup events) should be cleared.
                resetRoundState();
            }
            
            if (type === 'round_start') {
                currentRoundStartTick = tick;
                if (!pendingRoundEnd) {
                    // Try to pre-load freeze end tick from pre-analysis
                    const preFreeze = roundFreezeEnds.get(currentRound);
                    if (preFreeze) {
                        currentFreezeEndTick = preFreeze;
                    } else {
                        currentFreezeEndTick = null; 
                    }
                }
                
                // Ensure Round Result is set even if we miss round_freeze_end
                let result = roundResults.get(currentRound);
                
                // FORCE FIX: Fuzzy Round Matching
                // If direct match is missing OR refers to a past round (lagging index), search for the correct future round
                if (!result || result.endTick <= tick) {
                    let bestCandidate: typeof result | undefined;
                    let minDistance = Infinity;
                    
                    for (const [rNum, res] of roundResults.entries()) {
                        // We are looking for a round that ends AFTER the current start tick
                        if (res.endTick > tick) {
                            const dist = res.endTick - tick;
                            // We want the CLOSEST future round (which is the current one)
                            // Filter out rounds that are too far away (e.g. > 5 mins) to avoid jumping to end of match
                            if (dist < minDistance && dist < (64 * 300)) {
                                minDistance = dist;
                                bestCandidate = res;
                            }
                        }
                    }
                    
                    if (bestCandidate) {
                        result = bestCandidate;
                        // console.log(`[Parser] Fuzzy Match: Snapped to round ending at ${result.endTick} (dist: ${minDistance})`);
                    }
                }
                
                if (result) {
                    console.log(`[Parser] Phase 6: Setting Round ${currentRound} Result: Winner=${result.winner}, Reason=${result.reason}, EndTick=${result.endTick}`);
                    ratingEngine.setRoundResult(result);
                } else {
                    console.warn(`[Parser] Phase 6: No Round Result found for Round ${currentRound} (Tick: ${tick})`);
                }
                
            } else if (type === 'round_freeze_end') {
                currentFreezeEndTick = tick;
                
                // Redundant but safe
                const result = roundResults.get(currentRound);
                if (result) ratingEngine.setRoundResult(result);
            }
        }
        
        // Filter out events during freeze time (negative seconds)
        if (currentFreezeEndTick && tick < currentFreezeEndTick) {
            // STRICT FILTER: Only allow item/econ events during freeze time.
            // Absolutely NO damage, kills, plants, or defuses allowed.
            const allowedTypes = ['item_pickup', 'item_drop', 'item_purchase', 'player_spawn', 'player_team'];
            if (!allowedTypes.includes(type)) {
                 continue;
            }
        }

        if (type === 'begin_defuse') {
            const sid = normalizeSteamId(e.user_steamid || e.userid);
            const hasKit = e.haskit === true || e.haskit === 'true' || e.haskit === 1;
            ratingEngine.handleDefuseStart(sid, hasKit);
        }

        // LAZY INIT FIX: For visual timeline
        // If we missed the start/freeze_end events (broken demo), initialize anchor now
        // so we don't get huge negative numbers or absurd durations
        if (currentRoundStartTick === 0 && currentFreezeEndTick === null && tick > 0) {
             // Only for gameplay events
             if (type === 'player_death' || type === 'player_hurt' || type === 'bomb_planted' || type.includes('grenade')) {
                 currentFreezeEndTick = tick;
                 hasRoundStartSeen = true; // Implicit start
                 
                 // FIX: Notify RatingEngine that freeze time has ended!
                 // Without this, the engine thinks we are still in freeze time and locks win prob at 50% (or map bias)
                 ratingEngine.handleEvent(
                    { event_name: 'round_freeze_end', tick: tick },
                    currentRound, teammateSteamIds, aliveTs, aliveCTs, roundTs, roundCTs
                 );

                 // Pass Pre-Analyzed Result to Engine (Ensure it's set for the new round)
                 const result = roundResults.get(currentRound);
                 if (result) ratingEngine.setRoundResult(result);

                 currentRoundEvents.push({
                    tick,
                    seconds: 0,
                    type: 'damage',
                    subject: { steamid: '0', name: 'Round Start (Auto-Fix)', side: 'CT' },
                    weapon: 'init',
                    winProb: ratingEngine.getRoundWinProb() // Now this should be correct
                });
             }
        }

        ratingEngine.handleEvent(e, currentRound, teammateSteamIds, aliveTs, aliveCTs, roundTs, roundCTs);

        // MOVED: Win Probability Event generation AFTER handleEvent so engine is initialized
        if (type === 'round_freeze_end') {
            // FIX: Re-apply round result because handleEvent -> startNewRound -> reset() wipes it out
            let result = roundResults.get(currentRound);
            
            console.log(`[Parser_DEBUG] Phase 6: Round ${currentRound} Freeze End (Tick: ${tick}). Searching for result...`);

            if (!result || result.endTick <= tick) {
                let bestCandidate: typeof result | undefined;
                let minDistance = Infinity;
                
                console.log(`[Parser_DEBUG] Direct match failed or invalid (EndTick=${result?.endTick}). Starting Fuzzy Search...`);

                for (const [rNum, res] of roundResults.entries()) {
                    if (res.endTick > tick) {
                        const dist = res.endTick - tick;
                        // We want the CLOSEST future round (which is the current one)
                        // Filter out rounds that are too far away (e.g. > 5 mins) to avoid jumping to end of match
                        if (dist < minDistance && dist < (64 * 300)) {
                            minDistance = dist;
                            bestCandidate = res;
                        }
                    }
                }
                
                if (bestCandidate) {
                    result = bestCandidate;
                    console.log(`[Parser_DEBUG] Fuzzy Match Found: Round ending at ${result.endTick} (dist: ${minDistance})`);
                } else {
                    console.warn(`[Parser_DEBUG] Fuzzy Match Failed: No suitable future round found.`);
                }
            } else {
                console.log(`[Parser_DEBUG] Direct Match Found: Round ending at ${result.endTick}`);
            }

            if (result) {
                console.log(`[Parser_DEBUG] Setting Round Result for Engine: Winner=${result.winner}, Reason=${result.reason}, EndTick=${result.endTick}`);
                ratingEngine.setRoundResult(result);
            } else {
                console.error(`[Parser_DEBUG] CRITICAL: Could not determine result for Round ${currentRound}! WPA will be broken.`);
            }

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
                 if (r == 1 || r == 8 || r == 9 || r == 12) winner = 'T'; // TargetBombed, TerroristsWin
                 if (r == 7) winner = 'CT'; // TargetSaved, CTsWin
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
            // FIX: Ignore post-round deaths in switch-side rounds (12, 24, 27, 30...) OR the last round
            // These are "garbage time" kills that shouldn't count for stats or RTG
            if (isSwitchSideRound(currentRound) || currentRound === lastRound) {
                const roundResult = roundResults.get(currentRound);
                if (roundResult && tick > roundResult.endTick) {
                    // console.log(`[Parser] Ignoring post-round death in switch/last round ${currentRound} (Tick: ${tick} > ${roundResult.endTick})`);
                    continue;
                }
            }

            const vic = normalizeSteamId(e.user_steamid);
            const att = normalizeSteamId(e.attacker_steamid);
            const ast = normalizeSteamId(e.assister_steamid);

            aliveTs.delete(vic);
            aliveCTs.delete(vic);
            
            const getTimelineInfo = (sid: string) => {
                if (sid === "BOT" || sid === "0") return { steamid: sid, name: "BOT", side: 'CT' as Side };
                const isTM = teammateSteamIds.has(sid);
                const currentRosterSide = getRoundSide(currentRound, initialRosterSide);
                const s = isTM ? currentRosterSide : (currentRosterSide === 'T' ? 'CT' : 'T');
                const n = steamIdToName.get(sid) || "Unknown";
                return { steamid: sid, name: n, side: s };
            };
            
            // FIX: Use hitgroup mapping if available in event, otherwise fallback
            let headshot = e.headshot;
            // Additional check if e.headshot is boolean or not available
            
            // Hitgroup detection from kill event is sometimes missing in summary, rely on headshot flag
            
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
                if (rAtt) rAtt.kills++;

                // Entry Kill/Death Tracking
                if (!firstKillHappened && vic !== "BOT") {
                    pAtt.entry_kills++;
                    if (pVic) pVic.entry_deaths++;
                    firstKillHappened = true;
                }

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
            // FIX: Ignore post-round damage in switch-side rounds OR the last round
            if (isSwitchSideRound(currentRound) || currentRound === lastRound) {
                const roundResult = roundResults.get(currentRound);
                if (roundResult && tick > roundResult.endTick) {
                    continue;
                }
            }

            const att = normalizeSteamId(e.attacker_steamid);
            const vic = normalizeSteamId(e.user_steamid);
            const rawDmg = parseInt(e.dmg_health || 0);
            const actualDmg = healthTracker.recordDamage(vic, rawDmg);
            
            // FIX: Convert string hitgroup to number if needed
            let hg = e.hitgroup;
            if (typeof hg === 'string') {
                hg = HITGROUP_MAP[hg.toLowerCase()] || 0;
            }

            if (actualDmg > 0) {
                 const getTimelineInfo = (sid: string) => {
                    if (sid === "BOT" || sid === "0") return { steamid: sid, name: "World", side: 'CT' as Side };
                    const isTM = teammateSteamIds.has(sid);
                    const currentRosterSide = getRoundSide(currentRound, initialRosterSide);
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
                    hitgroup: hg, // Use corrected hitgroup
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

    const finalScoreUs = s1 + s3 + otUs;
    const finalScoreThem = s2 + s4 + otThem;
    
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
            half2_us: s3, half2_them: s4,
            ot_us: otUs > 0 || otThem > 0 ? otUs : undefined,
            ot_them: otUs > 0 || otThem > 0 ? otThem : undefined
        }, 
        players: ourPlayers,
        enemyPlayers: enemyPlayers,
        rounds: matchRounds,
        parserVersion: '1.0.0',
        rawDemoJson: data
    };
};