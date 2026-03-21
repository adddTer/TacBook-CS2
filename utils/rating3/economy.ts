export const T_WIN_MATRIX = [
  [0.498, 0.555, 0.578, 0.609, 0.663, 0.740],
  [0.396, 0.480, 0.511, 0.562, 0.613, 0.748],
  [0.349, 0.438, 0.484, 0.539, 0.590, 0.761],
  [0.333, 0.388, 0.419, 0.482, 0.557, 0.740],
  [0.303, 0.351, 0.384, 0.412, 0.480, 0.650],
  [0.224, 0.205, 0.217, 0.200, 0.266, 0.486]
];

export const getEquipmentIndex = (value: number): number => {
    if (value >= 4700) return 0;
    if (value >= 3550) return 1;
    if (value >= 2700) return 2;
    if (value >= 1700) return 3;
    if (value >= 1000) return 4;
    return 5;
};

export const getExpectedWinRate = (
    subjectValue: number,
    opponentValue: number,
    subjectSide: 'T' | 'CT',
    isTeamKill: boolean,
    isWorldOrSuicide: boolean
): number => {
    if (isTeamKill || isWorldOrSuicide) {
        return 0.50;
    }

    const tValue = subjectSide === 'T' ? subjectValue : opponentValue;
    const ctValue = subjectSide === 'CT' ? subjectValue : opponentValue;

    const tIndex = getEquipmentIndex(tValue);
    const ctIndex = getEquipmentIndex(ctValue);

    const baseWinRate = T_WIN_MATRIX[tIndex][ctIndex];

    if (subjectSide === 'T') {
        return baseWinRate;
    } else {
        return 1.0 - baseWinRate;
    }
};
