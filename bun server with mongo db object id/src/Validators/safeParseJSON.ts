// src/utils/safeParseJSON.ts
// import { ApiError } from ".";

export function safeParseJSON<T>(
  value: unknown,
  fieldName: string = "field"
): T {
  // ✅ Handle empty cases
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "undefined" ||
    value === "null"
  ) {
    return [] as unknown as T;
  }

  // ✅ Already correct type
  if (typeof value !== "string") {
    return value as T;
  }

  try {
    // ✅ Try JSON parse
    const firstParse = JSON.parse(value);

    // Double stringified
    if (typeof firstParse === "string") {
      return JSON.parse(firstParse) as T;
    }

    return firstParse as T;

  } catch {
    // ✅ Plain string like "smartphone"
    // Wrap it in array
    console.log(`⚠️ ${fieldName} is plain string → wrapping in array`);
    return [value] as unknown as T;
  }
}