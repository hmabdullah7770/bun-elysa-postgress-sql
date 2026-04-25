import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(sql);

async function main() {
  try {
    await migrate(db, { migrationsFolder: "./src/migrations" });
    console.log("✅ Migration successful");
  } catch (err) {
    console.error("❌ Migration failed:", err); // Full error prints here
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();