
/**
 * Generates a 7-digit ID starting with a specific prefix.
 * @param startDigit The starting digit (e.g., '1' for Tactics, '2' for Utilities)
 */
export const generateId = (startDigit: string = '1') => {
  // Ensure the random part creates the remaining 6 digits (000000 to 999999)
  const randomPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `${startDigit}${randomPart}`;
};
