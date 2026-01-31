export const generateId = (prefix?: string) => {
  // Generate a random 5-digit number (10000-99999) for easier searching
  const random = Math.floor(10000 + Math.random() * 90000).toString();
  return prefix ? `${prefix}_${random}` : random;
};