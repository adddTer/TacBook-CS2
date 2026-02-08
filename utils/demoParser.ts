
import { DemoData, Match, PlayerMatchStats, ClutchAttempt } from "../types";
import { generateId } from "./idGenerator";
import { ROSTER } from "../constants/roster";
import { RatingEngine } from "./rating3/RatingEngine";
import { InventoryManager } from "./rating/inventory"; // Keep old reference if needed, or remove if unused, but we use new engine now.

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
    'FuNct1on': 'FuNct1on',
    'R\u2061\u2061\u2061ain\u2061\u2061\u2061\u2061\u2061': 'Rain' 
};

// Map weapon names to likely side for heuristic side determination
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
    const meta = (!Array.isArray(data) && data.meta) ? data.meta : { map_name: 'Unknown' };
    
    // Sort by Tick to ensure linear processing
    events.sort((a: any, b: any) => (a.tick || 0) - (b.tick || 0));

    // Common: Identify Roster SteamIDs & Collect Names
    const rosterSteamIds = new Set<string>();
    const allSteamIds = new Set<string>(); 
    const activeSteamIds = new Set<string>();
    
    const steamIdToName = new Map<string, string>();

    // Helper to collect names from events
    const collectPlayerInfo = (sid: string, name: string | null) => {
        if (sid === "BOT") return;
        allSteamIds.add(sid);
        if (name) {
            if (!steamIdToName.has(sid) || steamIdToName.get(sid) === "Unknown") {
                steamIdToName.set(sid, name);
            }
        }
    };

    // Pre-scan players
    if (!Array.isArray(data) && data.players) {
        data.players.forEach(p => collectPlayerInfo(normalizeSteamId(p.steamid), p.name));
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

    allSteamIds.forEach(sid => {
        const rawName = steamIdToName.get(sid) || "Unknown";
        const resolved = resolveName(rawName);
        const isRoster = ROSTER.some(r => r.id === resolved);
        if (isRoster) rosterSteamIds.add(sid);
    });

    // ==========================================================================================
    // PASS 1: DETERMINE SIDE
    // ==========================================================================================
    
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
            if (rosterSteamIds.has(sid)) { side = 'T'; weight = 100; }
        }
        else if (e.event_name === 'bomb_defused') {
            const sid = normalizeSteamId(e.user_steamid);
            if (rosterSteamIds.has(sid)) { side = 'CT'; weight = 100; }
        }
        else if (e.event_name === 'player_death' || e.event_name === 'player_hurt') {
            const sid = normalizeSteamId(e.attacker_steamid);
            if (rosterSteamIds.has(sid) && e.weapon) {
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

    // ==========================================================================================
    // PASS 2: CALCULATE STATS
    // ==========================================================================================

    const statsMap = new Map<string, PlayerMatchStats>();
    
    // RATING 3.0 ENGINE INITIALIZATION
    const ratingEngine = new RatingEngine();

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
                duels: {}, 
                utility: { smokesThrown: 0, flashesThrown: 0, enemiesBlinded: 0, blindDuration: 0, heThrown: 0, heDamage: 0, molotovsThrown: 0, molotovDamage: 0 },
                clutches: { '1v1': { won: 0, lost: 0 }, '1v2': { won: 0, lost: 0 }, '1v3': { won: 0, lost: 0 }, '1v4': { won: 0, lost: 0 }, '1v5': { won: 0, lost: 0 } },
                clutchHistory: [],
                // Rating 3.0 Placeholders
                r3_rounds_played: 0
            } as any);
        }
        return statsMap.get(sid);
    };

    allSteamIds.forEach(sid => getOrInitStats(sid, null));

    let currentRound = 1;
    let scores = { T: 0, CT: 0 };
    let s1 = 0, s2 = 0, s3 = 0, s4 = 0;

    let aliveTs = new Set<string>();
    let aliveCTs = new Set<string>();
    let roundClutchAttempts = new Map<string, { opponents: number, kills: number }>();
    let roundProcessed = false;
    let matchStarted = !hasMatchStart;

    const resetRoundState = () => {
        roundClutchAttempts.clear();
        aliveTs.clear();
        aliveCTs.clear();
        const currentRosterSide = (currentRound <= 12) ? initialRosterSide : (initialRosterSide === 'T' ? 'CT' : 'T');
        activeSteamIds.forEach(sid => {
            const isRoster = rosterSteamIds.has(sid);
            const side = isRoster ? currentRosterSide : (currentRosterSide === 'T' ? 'CT' : 'T');
            if (side === 'T') aliveTs.add(sid);
            else aliveCTs.add(sid);
        });
        
        // Rating 3.0: Reset Inventory for Dead Players (keep survivors)
        // Since we don't have explicit survivors passed to engine yet, engine handles internal resets logic.
    };

    for (const e of events) {
        // RATING 3.0: Engine Hook
        ratingEngine.handleEvent(e, currentRound, rosterSteamIds);

        const type = e.event_name;
        
        if (type === 'round_announce_match_start') {
            matchStarted = true;
            currentRound = 1;
            scores = { T: 0, CT: 0 };
            s1 = 0; s2 = 0; s3 = 0; s4 = 0;
            statsMap.forEach(p => {
                p.kills = 0; p.deaths = 0; p.assists = 0;
                p.total_damage = 0; (p as any).headshots = 0;
                p.utility = { smokesThrown: 0, flashesThrown: 0, enemiesBlinded: 0, blindDuration: 0, heThrown: 0, heDamage: 0, molotovsThrown: 0, molotovDamage: 0 };
                p.duels = {};
                p.clutches = { '1v1': { won: 0, lost: 0 }, '1v2': { won: 0, lost: 0 }, '1v3': { won: 0, lost: 0 }, '1v4': { won: 0, lost: 0 }, '1v5': { won: 0, lost: 0 } };
                p.clutchHistory = [];
                p.r3_rounds_played = 0;
            });
            resetRoundState();
            continue;
        }

        if (!matchStarted) continue;

        // --- Round Start ---
        if (type === 'round_start' || type === 'round_freeze_end') {
            if (!roundProcessed) {
                resetRoundState();
                roundProcessed = true; 
            }
        }

        // --- Round End ---
        else if (type === 'round_end') {
            roundProcessed = false;
            statsMap.forEach(p => p.r3_rounds_played = (p.r3_rounds_played || 0) + 1);

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

            const currentRosterSide = (currentRound <= 12) ? initialRosterSide : (initialRosterSide === 'T' ? 'CT' : 'T');

            if (winner) {
                scores[winner]++;
                const isFirstHalf = currentRound <= 12;
                if (winner === currentRosterSide) { if (isFirstHalf) s1++; else s3++; } 
                else { if (isFirstHalf) s2++; else s4++; }

                // RESOLVE CLUTCHES
                roundClutchAttempts.forEach((data, sid) => {
                    const isRoster = rosterSteamIds.has(sid);
                    const playerSide = isRoster ? currentRosterSide : (currentRosterSide === 'T' ? 'CT' : 'T');
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
                
                // RATING 3.0: Increment internal round counter in engine
                ratingEngine.incrementRound(Array.from(activeSteamIds));

                currentRound++;
            }
        }

        // --- Death ---
        else if (type === 'player_death') {
            const vic = normalizeSteamId(e.user_steamid);
            const att = normalizeSteamId(e.attacker_steamid);
            const ast = normalizeSteamId(e.assister_steamid);
            const tick = e.tick;

            // Rating 3.0 Data Prep
            const tAlivePre = aliveTs.size;
            const ctAlivePre = aliveCTs.size;
            const vicSide = aliveTs.has(vic) ? 'T' : (aliveCTs.has(vic) ? 'CT' : null);

            // Update Alive Lists
            aliveTs.delete(vic);
            aliveCTs.delete(vic);
            
            // RATING 3.0: Process Kill
            if (vicSide) {
                ratingEngine.processKill(vic, att, ast, tick, tAlivePre, ctAlivePre, vicSide);
            }

            // Track Clutch Kills
            if (att && roundClutchAttempts.has(att) && att !== vic && att !== "BOT") {
                const clutchData = roundClutchAttempts.get(att)!;
                clutchData.kills++;
                roundClutchAttempts.set(att, clutchData);
            }
            
            // Stats Logic
            const pVic = statsMap.get(vic);
            const pAtt = statsMap.get(att);
            const pAst = statsMap.get(ast);

            if (pVic) pVic.deaths++;

            if (pAtt && att !== vic && att !== "BOT") {
                const isAttRoster = rosterSteamIds.has(att);
                const isVicRoster = rosterSteamIds.has(vic);
                if (isAttRoster !== isVicRoster) {
                    pAtt.kills++;
                    if (e.headshot) (pAtt as any).headshots++;
                    if (pVic) {
                        const vKey = pVic.steamid; 
                        if (!pAtt.duels[vKey]) pAtt.duels[vKey] = { kills: 0, deaths: 0 };
                        pAtt.duels[vKey].kills++;
                        const aKey = pAtt.steamid;
                        if (!pVic.duels[aKey]) pVic.duels[aKey] = { kills: 0, deaths: 0 };
                        pVic.duels[aKey].deaths++;
                    }
                }
            }
            if (pAst && ast !== "BOT" && ast !== att && ast !== vic) {
                 const isAstRoster = rosterSteamIds.has(ast);
                 const isVicRoster = rosterSteamIds.has(vic);
                 if (isAstRoster !== isVicRoster) {
                     pAst.assists++;
                     if (e.assistedflash) pAst.flash_assists = (pAst.flash_assists || 0) + 1;
                 }
            }
            
            // Check for Clutch Conditions
            if (aliveTs.size === 1 && aliveCTs.size >= 1) {
                const survivor = Array.from(aliveTs)[0];
                if (!roundClutchAttempts.has(survivor)) roundClutchAttempts.set(survivor, { opponents: aliveCTs.size, kills: 0 });
            }
            if (aliveCTs.size === 1 && aliveTs.size >= 1) {
                const survivor = Array.from(aliveCTs)[0];
                if (!roundClutchAttempts.has(survivor)) roundClutchAttempts.set(survivor, { opponents: aliveTs.size, kills: 0 });
            }
        }
        
        // --- Damage ---
        else if (type === 'player_hurt') {
            const att = normalizeSteamId(e.attacker_steamid);
            const vic = normalizeSteamId(e.user_steamid);
            const dmg = parseInt(e.dmg_health || 0);

            if (att && att !== "BOT" && att !== "0" && att !== vic) {
                const isAttRoster = rosterSteamIds.has(att);
                const isVicRoster = rosterSteamIds.has(vic);
                if (isAttRoster !== isVicRoster) {
                    const p = statsMap.get(att);
                    if (p) {
                        p.total_damage += dmg;
                        const w = (e.weapon || "").replace("weapon_", "");
                        if (w === 'hegrenade') p.utility.heDamage += dmg;
                        if (w === 'molotov' || w === 'incendiary' || w === 'inferno') p.utility.molotovDamage += dmg;
                    }
                }
            }
        }
        else if (type === 'player_blind') {
            const att = normalizeSteamId(e.attacker_steamid);
            const vic = normalizeSteamId(e.user_steamid);
            const dur = parseFloat(e.blind_duration || 0);
            if (att && att !== "BOT" && att !== vic) {
                const isAttRoster = rosterSteamIds.has(att);
                const isVicRoster = rosterSteamIds.has(vic);
                if (isAttRoster !== isVicRoster && isAttRoster && dur > 0) {
                    const p = statsMap.get(att);
                    if (p) {
                        p.utility.enemiesBlinded++;
                        p.utility.blindDuration += dur;
                    }
                }
            }
        }
        else if (type.endsWith('_detonate')) {
            const p = statsMap.get(normalizeSteamId(e.user_steamid));
            if (p) {
                if (type.includes('smoke')) p.utility.smokesThrown++;
                if (type.includes('flash')) p.utility.flashesThrown++;
                if (type.includes('hegrenade')) p.utility.heThrown++;
                if (type.includes('molotov') || type.includes('incendiary')) p.utility.molotovsThrown++;
            }
        }
    }

    // RATING 3.0: Apply Final Calculations
    ratingEngine.applyStats(statsMap);

    // Finalize Arrays
    const ourPlayers: PlayerMatchStats[] = [];
    const enemyPlayers: PlayerMatchStats[] = [];
    
    statsMap.forEach((stats, sid) => {
        if (stats.kills === 0 && stats.deaths === 0 && stats.total_damage === 0 && stats.utility_count === 0) return;
        if (rosterSteamIds.has(sid)) ourPlayers.push(stats);
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
        enemyPlayers: enemyPlayers
    };
};
