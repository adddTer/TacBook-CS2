
/**
 * Generates a 7-digit ID starting with a specific prefix.
 * Used for Tactics (1xxxxxx) and Utilities (2xxxxxx).
 */
export const generateId = (startDigit: string = '1') => {
  const randomPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `${startDigit}${randomPart}`;
};

/**
 * Generates a unique alphanumeric ID for groups.
 * Format: [TIMESTAMP_HEX][RANDOM_HEX]
 */
export const generateGroupId = (): string => {
    const timestamp = Date.now().toString(16).toUpperCase(); // Hex timestamp
    const random = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    return `${timestamp}${random}`;
};
