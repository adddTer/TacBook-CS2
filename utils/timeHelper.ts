/**
 * Converts CS round time strings to comparable seconds.
 * 
 * Freeze Time -> 999 (Sorts first)
 * 1:55 -> 115
 * 0:30 -> 30
 * Post Plant / Post -> -1 (Sorts last)
 */
export const parseTime = (timeStr?: string): number => {
  if (!timeStr) return 0;
  
  const t = timeStr.toLowerCase();
  
  if (t.includes('freeze') || t.includes('start')) return 999;
  if (t.includes('post') || t.includes('end')) return -1;
  
  // Handle MM:SS format
  if (t.includes(':')) {
    const [m, s] = t.split(':').map(Number);
    return (m || 0) * 60 + (s || 0);
  }
  
  return 0;
};

/**
 * Sorts actions chronologically descending (Early round first).
 */
export const sortActions = (a: { time?: string }, b: { time?: string }) => {
  return parseTime(b.time) - parseTime(a.time);
};
