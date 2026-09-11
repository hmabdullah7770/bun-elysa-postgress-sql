import { defineConfig } from "drizzle-kit";
// import { connectionString } from "./src/db/index"

export default defineConfig({
  schema: "./src/schemas/index.ts",       // same schema files (or a copy, if Supabase tables differ)
  out: "./src/migrations/supabase",         // separate migrations folder
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_SUPABASE!,
  },
});