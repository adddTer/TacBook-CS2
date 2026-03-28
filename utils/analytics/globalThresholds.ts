export type EvaluationTier = "OUTSTANDING" | "EXCELLENT" | "ORDINARY" | "POOR";

export interface EvaluationData {
  text: string;
  color: string;
  bg: string;
  hex: string;
}

export const TIER_STYLES: Record<EvaluationTier, EvaluationData> = {
  OUTSTANDING: {
    text: "杰出",
    color: "text-purple-500 dark:text-purple-400",
    bg: "bg-gradient-to-r from-purple-500 to-fuchsia-500",
    hex: "#a855f7",
  },
  EXCELLENT: {
    text: "优秀",
    color: "text-green-500 dark:text-green-400",
    bg: "bg-green-500 dark:bg-green-400",
    hex: "#4ade80",
  },
  ORDINARY: {
    text: "普通",
    color: "text-neutral-900 dark:text-white",
    bg: "bg-yellow-500 dark:bg-yellow-400",
    hex: "#facc15",
  },
  POOR: {
    text: "需提升",
    color: "text-red-500 dark:text-red-400",
    bg: "bg-red-500 dark:bg-red-400",
    hex: "#f87171",
  },
};

export interface StatDefinition {
  label: string;
  thresholds: [number, number, number]; // [Outstanding, Excellent, Ordinary]
  reverse: boolean;
  isPercentage: boolean;
}

// Global definitions for all stats
export const GLOBAL_STATS: Record<string, StatDefinition> = {
  RATING: {
    label: "RATING 4.0",
    thresholds: [1.35, 1.15, 0.95],
    reverse: false,
    isPercentage: false,
  },
  WPA: {
    label: "WPA",
    thresholds: [3.4, 1.4, -0.6],
    reverse: false,
    isPercentage: true,
  },
  DPR: {
    label: "DPR",
    thresholds: [0.57, 0.65, 0.72],
    reverse: true,
    isPercentage: false,
  },
  KAST: {
    label: "KAST",
    thresholds: [80.0, 74.0, 68.0],
    reverse: false,
    isPercentage: true,
  },
  MULTI_KILL: {
    label: "MULTI-KILL",
    thresholds: [25.0, 18.0, 12.0],
    reverse: false,
    isPercentage: true,
  },
  ADR: {
    label: "ADR",
    thresholds: [95.0, 82.0, 70.0],
    reverse: false,
    isPercentage: false,
  },
  KPR: {
    label: "KPR",
    thresholds: [0.88, 0.78, 0.68],
    reverse: false,
    isPercentage: false,
  },
  KDR: {
    label: "K/D",
    thresholds: [1.35, 1.15, 0.95],
    reverse: false,
    isPercentage: false,
  },
  IMPACT: {
    label: "IMPACT",
    thresholds: [1.3, 1.1, 0.9],
    reverse: false,
    isPercentage: false,
  },
  SCORE: {
    label: "SCORE",
    thresholds: [80, 60, 40],
    reverse: false,
    isPercentage: false,
  },
};

export const getEvaluationTier = (
  value: number,
  thresholds: [number, number, number],
  reverse: boolean = false,
): EvaluationTier => {
  if (!reverse) {
    if (value >= thresholds[0]) return "OUTSTANDING";
    if (value >= thresholds[1]) return "EXCELLENT";
    if (value >= thresholds[2]) return "ORDINARY";
    return "POOR";
  } else {
    if (value <= thresholds[0]) return "OUTSTANDING";
    if (value <= thresholds[1]) return "EXCELLENT";
    if (value <= thresholds[2]) return "ORDINARY";
    return "POOR";
  }
};

export const getEvaluation = (
  value: number,
  thresholds: [number, number, number],
  reverse: boolean = false,
): EvaluationData => {
  const tier = getEvaluationTier(value, thresholds, reverse);
  return TIER_STYLES[tier];
};

export const getStatEvaluation = (
  statKey: string,
  value: number,
): EvaluationData => {
  const stat = GLOBAL_STATS[statKey] || GLOBAL_STATS.SCORE;
  return getEvaluation(value, stat.thresholds, stat.reverse);
};
