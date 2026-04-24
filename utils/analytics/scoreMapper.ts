/**
 * Advanced Score Mapping Utility
 * Maps a value to a score using a piecewise curve to ensure proper bounds,
 * addressing issues where 0 value yielded baseline points in pure sigmoids.
 */

export const mapScore = (
  val: number,
  minExpected: number,   // Values below this get 0 points
  meanExpected: number,  // Values exactly here get 50% of the maximum points
  goodExpected: number,  // Values exactly here get 90% of the maximum points
  maxPoints: number      // The maximum base points for this metric
): number => {
  if (val <= minExpected) return 0;
  
  // Scale from 0 to 50%
  if (val <= meanExpected) {
    const pct = (val - minExpected) / (meanExpected - minExpected);
    return pct * 0.5 * maxPoints;
  }
  
  // Scale from 50% to 90%
  if (val <= goodExpected) {
    const pct = (val - meanExpected) / (goodExpected - meanExpected);
    return (0.5 + pct * 0.4) * maxPoints;
  }
  
  // Scale 90% to asymptotically approach 100%
  const over = val - goodExpected;
  const range = goodExpected - meanExpected || 1;
  const k = 2.0 / range;
  return (0.9 + 0.1 * (1 - Math.exp(-k * over))) * maxPoints;
};

export const inverseMapScore = (
  val: number,
  maxPoor: number,       // Values above this (worse) get 0 points
  meanExpected: number,  // Values exactly here get 50% of the maximum points
  goodExpected: number,  // Values exactly here get 90% of the maximum points
  maxPoints: number
): number => {
  if (val >= maxPoor) return 0;
  
  if (val >= meanExpected) {
    const pct = (maxPoor - val) / (maxPoor - meanExpected);
    return pct * 0.5 * maxPoints;
  }
  
  if (val >= goodExpected) {
    const pct = (meanExpected - val) / (meanExpected - goodExpected);
    return (0.5 + pct * 0.4) * maxPoints;
  }
  
  const under = goodExpected - val;
  const range = meanExpected - goodExpected || 1;
  const k = 2.0 / range;
  return (0.9 + 0.1 * (1 - Math.exp(-k * under))) * maxPoints;
};
