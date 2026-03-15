export interface TeamConfig {
    name: string;
    members: {
        gameId: string;
        steamIds: string[];
    }[];
}

export const TEAMS: TeamConfig[] = [
    {
        name: "Vitality",
        members: [
            { gameId: "apEX", steamIds: ["76561197982602313"] },
            { gameId: "ropz", steamIds: ["76561197991272318"] },
            { gameId: "ZywOo", steamIds: ["76561198113666193"] },
            { gameId: "flameZ", steamIds: ["76561198305607374"] },
            { gameId: "mezii", steamIds: ["76561198048743787"] }
        ]
    },
    {
        name: "MOUZ",
        members: [
            { gameId: "Brollan", steamIds: ["76561198202562479"] },
            { gameId: "torzsi", steamIds: ["76561198089274291"] },
            { gameId: "Spinx", steamIds: ["76561198124996414"] },
            { gameId: "Jjimpphat", steamIds: ["76561198313886561"] },
            { gameId: "xertioN", steamIds: ["76561198164097495"] }
        ]
    },
    {
        name: "FURIA",
        members: [
            { gameId: "FalleN", steamIds: ["76561197962024749"] },
            { gameId: "yuurih", steamIds: ["76561198045388200"] },
            { gameId: "YEKINDAR", steamIds: ["76561198050346377"] },
            { gameId: "KSCERATO", steamIds: ["76561198084241699"] },
            { gameId: "molodoy", steamIds: ["76561198259464010"] }
        ]
    },
    {
        name: "Falcons",
        members: [
            { gameId: "NiKo", steamIds: ["76561198041683378"] },
            { gameId: "TeSeS", steamIds: ["76561198064619356"] },
            { gameId: "mONESY", steamIds: ["76561198332155653"] },
            { gameId: "kyxsan", steamIds: ["76561198118023190"] },
            { gameId: "kyousuke", steamIds: ["76561198357451240"] }
        ]
    },
    {
        name: "PARIVISION",
        members: [
            { gameId: "Jame", steamIds: ["76561198046808715"] },
            { gameId: "BELCHONOKK", steamIds: ["76561198155998188"] },
            { gameId: "xiELO", steamIds: ["76561198321684441"] },
            { gameId: "nota", steamIds: ["76561198202046200"] },
            { gameId: "zweih", steamIds: ["76561198150410425"] }
        ]
    },
    {
        name: "Aurora",
        members: [
            { gameId: "MAJ3R", steamIds: ["76561197960334752"] },
            { gameId: "XANTARES", steamIds: ["76561198027985338"] },
            { gameId: "woxic", steamIds: ["76561198042473911"] },
            { gameId: "soulfly", steamIds: ["76561198313460670"] },
            { gameId: "Wicadia", steamIds: ["76561198356976210"] }
        ]
    },
    {
        name: "Spirit",
        members: [
            { gameId: "sh1ro", steamIds: ["76561198105658632"] },
            { gameId: "magiox", steamIds: ["76561198135541617"] },
            { gameId: "tN1R", steamIds: ["76561198054904257"] },
            { gameId: "zont1x", steamIds: ["76561198313155822"] },
            { gameId: "donk", steamIds: ["76561198386265483"] }
        ]
    },
    {
        name: "Natus Vincere",
        members: [
            { gameId: "Aleksib", steamIds: ["76561197985834138"] },
            { gameId: "iM", steamIds: ["76561198018193850"] },
            { gameId: "b1t", steamIds: ["76561198145969187"] },
            { gameId: "wOnderful", steamIds: ["76561198124996415"] },
            { gameId: "makazze", steamIds: ["76561198855661122"] }
        ]
    },
    {
        name: "Astralis",
        members: [
            { gameId: "HooXi", steamIds: ["76561197998246340"] },
            { gameId: "phzy", steamIds: ["76561198154160451"] },
            { gameId: "jabbi", steamIds: ["76561198116520330"] },
            { gameId: "Staehr", steamIds: ["76561198327916568"] },
            { gameId: "ryu", steamIds: ["76561198118042512"] }
        ]
    },
    {
        name: "FUT",
        members: [
            { gameId: "demOn", steamIds: ["76561198194458814"] },
            { gameId: "lauNX", steamIds: ["76561198275529452"] },
            { gameId: "Krabeni", steamIds: ["76561198365287515"] },
            { gameId: "cmtry", steamIds: ["76561198284615211"] },
            { gameId: "dziugsS", steamIds: ["76561198165731305"] }
        ]
    },
    {
        name: "The MongolZ",
        members: [
            { gameId: "bLitz", steamIds: ["76561198099309855"] },
            { gameId: "Techno", steamIds: ["76561198299102213"] },
            { gameId: "mzinho", steamIds: ["76561198884961819"] },
            { gameId: "910", steamIds: ["76561198124505315"] },
            { gameId: "cobrazera", steamIds: ["76561198205461529"] }
        ]
    },
    {
        name: "G2",
        members: [
            { gameId: "huNter", steamIds: ["76561198064516934"] },
            { gameId: "malbsMd", steamIds: ["76561198055621376"] },
            { gameId: "SunPayus", steamIds: ["76561198108428414"] },
            { gameId: "HeavyGod", steamIds: ["76561198132470659"] },
            { gameId: "MATYS", steamIds: ["76561198144709141"] }
        ]
    },
    {
        name: "GamerLegion",
        members: [
            { gameId: "Snax", steamIds: ["76561197982260714"] },
            { gameId: "REZ", steamIds: ["76561198000494056"] },
            { gameId: "Tauson", steamIds: ["76561198305710645"] },
            { gameId: "PR", steamIds: ["76561198145100654"] },
            { gameId: "hypexx", steamIds: ["76561198154037562"] }
        ]
    },
    {
        name: "FaZe",
        members: [
            { gameId: "karrigan", steamIds: ["76561197984877300"] },
            { gameId: "frozen", steamIds: ["76561198046835158"] },
            { gameId: "Twistzz", steamIds: ["76561198104500913"] },
            { gameId: "broky", steamIds: ["76561198106201889"] },
            { gameId: "jcobbb", steamIds: ["76561198254876122"] }
        ]
    },
    {
        name: "Legacy",
        members: [
            { gameId: "arT", steamIds: ["76561198084241699"] },
            { gameId: "dumau", steamIds: ["76561198150772275"] },
            { gameId: "latto", steamIds: ["76561198188176510"] },
            { gameId: "n1ssim", steamIds: ["76561198165038150"] },
            { gameId: "saadzin", steamIds: ["76561198308419612"] }
        ]
    },
    {
        name: "Monte",
        members: [
            { gameId: "Rainwaker", steamIds: ["76561198142343940"] },
            { gameId: "Bymas", steamIds: ["76561198121043533"] },
            { gameId: "afro", steamIds: ["76561198065099510"] },
            { gameId: "Gizmy", steamIds: ["76561198204618290"] },
            { gameId: "AZUWU", steamIds: ["76561198135891361"] }
        ]
    },
    {
        name: "HEROIC",
        members: [
            { gameId: "xflOud", steamIds: ["76561198154670081"] },
            { gameId: "nilo", steamIds: ["76561198155913214"] },
            { gameId: "susp", steamIds: ["76561198161555320"] },
            { gameId: "Chr1zN", steamIds: ["76561198216506300"] },
            { gameId: "yxngsbor", steamIds: ["76561198301111624"] }
        ]
    },
    {
        name: "Gentle Mates",
        members: [
            { gameId: "alex", steamIds: ["76561197994354714"] },
            { gameId: "mopoz", steamIds: ["76561198030283452"] },
            { gameId: "sausol", steamIds: ["76561198155827655"] },
            { gameId: "dav1g", steamIds: ["76561198182255712"] },
            { gameId: "MartinezSa", steamIds: ["76561198125488514"] }
        ]
    },
    {
        name: "9z",
        members: [
            { gameId: "max", steamIds: ["76561198114004951"] },
            { gameId: "dgt", steamIds: ["76561198134768390"] },
            { gameId: "meyern", steamIds: ["76561198164317180"] },
            { gameId: "luchov", steamIds: ["76561198144615214"] },
            { gameId: "HUASOPEEK", steamIds: ["76561198119092410"] }
        ]
    },
    {
        name: "3DMAX",
        members: [
            { gameId: "Maka", steamIds: ["76561198031541014"] },
            { gameId: "Lucky", steamIds: ["76561198042426301"] },
            { gameId: "misutaaa", steamIds: ["76561198154142645"] },
            { gameId: "Ex3rcice", steamIds: ["76561198064098311"] },
            { gameId: "Graviti", steamIds: ["76561198114510103"] }
        ]
    }
];
