import { defineConfig } from "drizzle-kit";
import {connectionString} from "./src/db/index"

export default defineConfig({
  schema: "./src/schemas/index.ts",        // where your schema files are
  out: "./src/migrations",               // where migration files will be generated
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },


  // ✅ Add this for custom names!
  migrations: {
    prefix: "timestamp",  // ← uses timestamp instead!
    // OR
    // prefix: "index",      // ← uses 0000, 0001...
  }
});