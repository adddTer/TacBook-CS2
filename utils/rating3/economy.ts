export const T_WIN_MATRIX = [
  [0.498, 0.555, 0.578, 0.609, 0.663, 0.740],
  [0.396, 0.480, 0.511, 0.562, 0.613, 0.748],
  [0.349, 0.438, 0.484, 0.539, 0.590, 0.761],
  [0.333, 0.388, 0.419, 0.482, 0.557, 0.740],
  [0.303, 0.351, 0.384, 0.412, 0.480, 0.650],
  [0.224, 0.205, 0.217, 0.200, 0.266, 0.486]
];

const VALUE_THRESHOLDS = [4700, 3550, 2700, 1700, 1000, 0];

export const getEquipmentIndex = (value: number): number => {
    if (value >= VALUE_THRESHOLDS[0]) return 0;
    if (value <= VALUE_THRESHOLDS[5]) return 5;
    
    for (let i = 0; i < VALUE_THRESHOLDS.length - 1; i++) {
        if (value >= VALUE_THRESHOLDS[i + 1]) {
            const range = VALUE_THRESHOLDS[i] - VALUE_THRESHOLDS[i + 1];
            const progress = (VALUE_THRESHOLDS[i] - value) / range;
            return i + progress;
        }
    }
    return 5;
};

const interpolateMatrix = (rowIdx: number, colIdx: number): number => {
    const r0 = Math.floor(rowIdx);
    const r1 = Math.min(5, r0 + 1);
    const c0 = Math.floor(colIdx);
    const c1 = Math.min(5, c0 + 1);
    
    const rFrac = rowIdx - r0;
    const cFrac = colIdx - c0;
    
    const v00 = T_WIN_MATRIX[r0][c0];
    const v01 = T_WIN_MATRIX[r0][c1];
    const v10 = T_WIN_MATRIX[r1][c0];
    const v11 = T_WIN_MATRIX[r1][c1];
    
    const top = v00 * (1 - cFrac) + v01 * cFrac;
    const bottom = v10 * (1 - cFrac) + v11 * cFrac;
    
    return top * (1 - rFrac) + bottom * rFrac;
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

    const baseWinRate = interpolateMatrix(tIndex, ctIndex);

    if (subjectSide === 'T') {
        return baseWinRate;
    } else {
        return 1.0 - baseWinRate;
    }
};
