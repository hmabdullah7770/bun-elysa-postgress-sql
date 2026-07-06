// src/debug-schema.ts
import * as schema from "./schemas/index";

console.log("\n🔍 Checking all schema exports...\n");

let hasError = false;

for (const [key, value] of Object.entries(schema)) {
  if (value === undefined || value === null) {
    console.error(`❌ BROKEN: "${key}" is ${value}`);
    hasError = true;
  } else if (typeof value === "object" && !(value as any)["Symbol(drizzle:Name)"] === undefined) {
    console.log(`✅ OK: "${key}" → ${typeof value}`);
  } else {
    console.log(`✅ OK: "${key}" → ${typeof value}`);
  }
}

if (!hasError) {
  console.log("\n✅ All exports look fine — problem is in drizzle.config.ts imports");
} else {
  console.log("\n💥 Found undefined exports above — fix those files first");
}