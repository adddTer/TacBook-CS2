
/**
 * Centralized style definitions for data visualization.
 * Handles the 4-tier color system including the "Flowing Pink" effect.
 */

export const TIER_CLASSES = {
    OUTSTANDING: {
        text: 'text-flow-pink font-black drop-shadow-sm',
        bg: 'bg-flow-pink text-white border-fuchsia-400 shadow-md shadow-fuchsia-500/30',
        fill: '#c026d3', // fuchsia-600 (Static fallback for SVG fill)
        bar: 'bg-flow-pink'
    },
    EXCELLENT: {
        text: 'text-green-600 dark:text-green-400 font-bold',
        bg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
        fill: '#22c55e', // green-500
        bar: 'bg-green-500'
    },
    ORDINARY: {
        text: 'text-neutral-900 dark:text-white font-medium',
        bg: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700',
        fill: '#a3a3a3', // neutral-400
        bar: 'bg-neutral-400'
    },
    POOR: {
        text: 'text-red-500 dark:text-red-400',
        bg: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border-red-100 dark:border-red-800',
        fill: '#ef4444', // red-500
        bar: 'bg-red-500'
    }
};

type Tier = 'OUTSTANDING' | 'EXCELLENT' | 'ORDINARY' | 'POOR';

/**
 * Generic function to determine tier based on thresholds.
 * @param value The value to check
 * @param thresholds [Outstanding_Min, Excellent_Min, Ordinary_Min]
 * @param reverse If true, lower is better (e.g. Deaths per Round)
 */
export const getTier = (value: number, thresholds: [number, number, number], reverse: boolean = false): Tier => {
    const [t1, t2, t3] = thresholds;
    
    if (!reverse) {
        if (value >= t1) return 'OUTSTANDING';
        if (value >= t2) return 'EXCELLENT';
        if (value >= t3) return 'ORDINARY';
        return 'POOR';
    } else {
        if (value <= t1) return 'OUTSTANDING';
        if (value <= t2) return 'EXCELLENT';
        if (value <= t3) return 'ORDINARY';
        return 'POOR';
    }
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
    return getValueStyleClass(score, [80, 60, 40], type);
};

/**
 * Specific helper for Rating 4.0
 */
export const getRatingStyle = (rating: number, type: 'text' | 'bg' = 'text') => {
    return getValueStyleClass(rating, [1.45, 1.15, 0.95], type);
};

/**
 * Specific helper for WPA
 */
export const getWpaStyle = (wpa: number) => {
    return getValueStyleClass(wpa, [4.0, 0, -1.0], 'text'); // >4.0 is Outstanding, >0 is Excellent, >-1 is Avg
};

/**
 * Get hex color for SVG charts
 */
export const getScoreHex = (score: number): string => {
    const tier = getTier(score, [80, 60, 40]);
    return TIER_CLASSES[tier].fill;
};
