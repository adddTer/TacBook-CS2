import { Tournament } from "../../types";
import { blastBountyS12026 } from "./blast-bounty-s1-2026";
import { blastOpenRotterdam2026 } from "./blast-open-rotterdam-2026";
import { blastRivalsFortWorth2026 } from "./blast-rivals-fort-worth-2026";
import { eslProLeagueS23 } from "./esl-pro-league-s23";
import { iemAtlanta2026 } from "./iem-atlanta-2026";
import { iemCologne2026 } from "./iem-cologne-2026";
import { iemKrakow2026 } from "./iem-krakow-2026";
import { iemRio2026 } from "./iem-rio-2026";
import { pglAstana2026 } from "./pgl-astana-2026";
import { pglBucharest2026 } from "./pgl-bucharest-2026";
import { pglClujNapoca2026 } from "./pgl-cluj-napoca-2026";

export const ALL_PRE_CODED_TOURNAMENTS: Tournament[] = [
    blastBountyS12026,
    iemKrakow2026,
    pglClujNapoca2026,
    eslProLeagueS23,
    blastOpenRotterdam2026,
    pglBucharest2026,
    iemRio2026,
    blastRivalsFortWorth2026,
    pglAstana2026,
    iemAtlanta2026,
    iemCologne2026
];
