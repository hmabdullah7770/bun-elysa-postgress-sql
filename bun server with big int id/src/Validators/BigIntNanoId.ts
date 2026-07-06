// src/utils/validators.ts

/**
 * Validate BIGINT ID
 */
export function isBigInt(id: string | number): boolean {
  const str = String(id);
  
  if (!/^\d+$/.test(str)) {
    return false;
  }
  
  try {
    const num = BigInt(str);
    return num >= 1n && num <= 9223372036854775807n;
  } catch {
    return false;
  }
}

/**
 * Validate NanoID (default 21 chars)
 */
export function isNanoId(id: string, length: number = 21): boolean {
  if (typeof id !== "string") return false;
  const regex = new RegExp(`^[A-Za-z0-9]{${length}}$`);
  return regex.test(id);
}

/**
 * Validate Short ID (12 chars)
 */
export function isShortId(id: string): boolean {
  return isNanoId(id, 12);
}

/**
 * Validate Sortable ID
 */
export function isSortableId(id: string): boolean {
  if (typeof id !== "string") return false;
  return /^[a-z0-9]{6,8}[A-Za-z0-9]{8}$/.test(id);
}

