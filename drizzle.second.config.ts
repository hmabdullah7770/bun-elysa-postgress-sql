// drizzle.second.config.ts  (in root, next to drizzle.config.ts)
import { defineConfig } from "drizzle-kit";
import { DB_NAME_2 } from "./src/constant";

export default defineConfig({
    schema: "./src/schemas/mastarPortal/index.ts",        // second db schemas
    out: "./src/migrations/mastarPortal",            // separate migrations folder
    dialect: "postgresql",
    dbCredentials: {
        url: `${process.env.DATABASE_URL}/${DB_NAME_2}`,
    },
});