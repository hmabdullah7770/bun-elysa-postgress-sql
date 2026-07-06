export function isValidId(id: string | number): boolean {
  const num = Number(id);
  return Number.isInteger(num) && num >= 1 && num <= Number.MAX_SAFE_INTEGER;
}