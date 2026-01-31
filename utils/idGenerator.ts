
export const generateId = (prefix?: string) => {
  // Generate a random 6-digit number (100000-999999)
  const random = Math.floor(100000 + Math.random() * 900000).toString();
  return prefix ? `${prefix}_${random}` : random;
};
