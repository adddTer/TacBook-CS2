
import { GLOBAL_STATS, getEvaluationTier, TIER_STYLES, EvaluationTier } from './analytics/globalThresholds';

/**
 * Centralized style definitions for data visualization.
 * Handles the 4-tier color system including the "Flowing Pink" effect.
 */

export const TIER_CLASSES = {
    OUTSTANDING: {
        text: 'text-gradient-clip bg-gradient-outstanding font-black drop-shadow-sm bg-[length:200%_auto] animate-flowGradient',
        bg: 'bg-gradient-outstanding text-white border-fuchsia-400 shadow-md shadow-fuchsia-500/30 bg-[length:200%_auto] animate-flowGradient',
        fill: TIER_STYLES.OUTSTANDING.hex,
        bar: 'bg-gradient-outstanding bg-[length:200%_auto] animate-flowGradient'
    },
    EXCELLENT: {
        text: TIER_STYLES.EXCELLENT.color + ' font-bold',
        bg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
        fill: TIER_STYLES.EXCELLENT.hex,
        bar: 'bg-green-500'
    },
    ORDINARY: {
        text: TIER_STYLES.ORDINARY.color + ' font-medium',
        bg: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700',
        fill: TIER_STYLES.ORDINARY.hex,
        bar: 'bg-yellow-500'
    },
    POOR: {
        text: TIER_STYLES.POOR.color,
        bg: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border-red-100 dark:border-red-800',
        fill: TIER_STYLES.POOR.hex,
        bar: 'bg-red-500'
    }
};

/**
 * Generic function to determine tier based on thresholds.
 */
export const getTier = (value: number, thresholds: [number, number, number], reverse: boolean = false): EvaluationTier => {
    return getEvaluationTier(value, thresholds, reverse);
};

/**
 * Helper to get the specific CSS class string for a value
 */
export const getValueStyleClass = (value: number, thresholds: [number, number, number], type: 'text' | 'bg' | 'bar' = 'text', reverse: boolean = false): string => {
    const tier = getTier(value, thresholds, reverse);
    return TIER_CLASSES[tier][type];
};

/**
 * Specific helper for 0-100 Scores
 */
export const getScoreStyle = (score: number, type: 'text' | 'bg' | 'bar' = 'text') => {
    return getValueStyleClass(score, GLOBAL_STATS.SCORE.thresholds, type);
};

/**
 * Specific helper for Rating 4.0
 */
export const getRatingStyle = (rating: number, type: 'text' | 'bg' = 'text') => {
    return getValueStyleClass(rating, GLOBAL_STATS.RATING.thresholds, type);
};

/**
 * Specific helper for WPA
 */
export const getWpaStyle = (wpa: number) => {
    return getValueStyleClass(wpa, GLOBAL_STATS.WPA.thresholds, 'text');
};

/**
 * Generic helper for any stat defined in GLOBAL_STATS
 */
export const getStatStyle = (statKey: string, value: number, type: 'text' | 'bg' | 'bar' = 'text') => {
    const stat = GLOBAL_STATS[statKey] || GLOBAL_STATS.SCORE;
    return getValueStyleClass(value, stat.thresholds, type, stat.reverse);
};

/**
 * Get hex color for SVG charts
 */
export const getScoreHex = (score: number): string => {
    const tier = getTier(score, GLOBAL_STATS.SCORE.thresholds);
    return TIER_CLASSES[tier].fill;
};


