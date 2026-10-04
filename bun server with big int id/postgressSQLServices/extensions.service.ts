import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { flags } from "../flags";

const configuredExtensions = [
  { enabled: flags.postgresExtensions.pgmq, name: "pgmq" },
  { enabled: flags.postgresExtensions.pgTrgm, name: "pg_trgm" },
  { enabled: flags.postgresExtensions.pgVector, name: "vector" },
  { enabled: flags.postgresExtensions.pgSearch, name: "pg_search" },
  { enabled: flags.postgresExtensions.postgis, name: "postgis" },
  { enabled: flags.postgresExtensions.pgCron, name: "pg_cron" },
  { enabled: flags.postgresExtensions.pgcrypto, name: "pgcrypto" },
  {
    enabled: flags.postgresExtensions.pgStatStatements,
    name: "pg_stat_statements",
  },
  { enabled: flags.postgresExtensions.pgPartman, name: "pg_partman" },
] as const;

export const installConfiguredPostgresExtensions = async () => {
  const enabledExtensions = configuredExtensions.filter(({ enabled }) => enabled);

  for (const { name } of enabledExtensions) {
    await db.execute(sql.raw(`CREATE EXTENSION IF NOT EXISTS "${name}"`));
  }

  return enabledExtensions.map(({ name }) => name);
};
