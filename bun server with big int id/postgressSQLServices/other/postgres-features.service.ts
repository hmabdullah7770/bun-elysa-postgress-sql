import { sql } from "drizzle-orm";
import { db } from "../../src/db";

const quoteIdentifier = (identifier: string) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid PostgreSQL identifier: ${identifier}`);
  }
  return `"${identifier}"`;
};

const quoteTable = (schema: string, table: string) =>
  `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;

// PostGIS finds rows within a radius in meters. Geometry values must use SRID 4326.
export const findRowsNearby = async (options: {
  schema?: string;
  table: string;
  geometryColumn: string;
  longitude: number;
  latitude: number;
  radiusMeters: number;
  limit?: number;
}) => {
  const {
    schema = "public",
    table,
    geometryColumn,
    longitude,
    latitude,
    radiusMeters,
    limit = 50,
  } = options;

  if (
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error("Longitude or latitude is outside the valid range");
  }
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    throw new Error("Radius must be a positive number of meters");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new Error("Limit must be an integer between 1 and 500");
  }

  const source = quoteTable(schema, table);
  const geometry = quoteIdentifier(geometryColumn);
  const point = sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography`;

  return db.execute(sql`
    SELECT nearby_rows.*,
      ST_Distance(nearby_rows.${sql.raw(geometry)}::geography, ${point}) AS distance_meters
    FROM ${sql.raw(source)} AS nearby_rows
    WHERE ST_DWithin(
      nearby_rows.${sql.raw(geometry)}::geography,
      ${point},
      ${radiusMeters}
    )
    ORDER BY distance_meters ASC
    LIMIT ${limit}
  `);
};

// pg_cron schedules trusted SQL commands inside PostgreSQL; never pass user input as command.
export const schedulePostgresJob = async (
  jobName: string,
  schedule: string,
  trustedSqlCommand: string,
) => {
  if (!jobName.trim()) throw new Error("Job name is required");
  if (!schedule.trim()) throw new Error("Cron schedule is required");
  if (!trustedSqlCommand.trim()) throw new Error("SQL command is required");

  return db.execute(sql`
    SELECT cron.schedule(${jobName.trim()}, ${schedule.trim()}, ${trustedSqlCommand})
  `);
};

// Remove a pg_cron job by its configured job name.
export const unschedulePostgresJob = async (jobName: string) => {
  if (!jobName.trim()) throw new Error("Job name is required");
  return db.execute(sql`
    SELECT cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = ${jobName.trim()}
  `);
};

// pgcrypto encrypts text with a caller-supplied secret; keep that secret outside the database.
export const encryptPostgresText = async (plaintext: string, secret: string) => {
  if (!secret) throw new Error("Encryption secret is required");
  return db.execute(sql`
    SELECT encode(pgp_sym_encrypt(${plaintext}, ${secret}), 'base64') AS ciphertext
  `);
};

// Decrypt ciphertext returned by encryptPostgresText using the same secret.
export const decryptPostgresText = async (ciphertext: string, secret: string) => {
  if (!ciphertext) throw new Error("Ciphertext is required");
  if (!secret) throw new Error("Encryption secret is required");
  return db.execute(sql`
    SELECT pgp_sym_decrypt(decode(${ciphertext}, 'base64'), ${secret}) AS plaintext
  `);
};

// pg_stat_statements reports aggregated query statistics and may require Supabase permissions.
export const getTopPostgresStatements = async (limit = 20) => {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Limit must be an integer between 1 and 100");
  }

  return db.execute(sql`
    SELECT query, calls, total_exec_time, mean_exec_time, rows
    FROM pg_stat_statements
    ORDER BY total_exec_time DESC
    LIMIT ${limit}
  `);
};

// RLS is enabled per table; add explicit policies separately or clients will be denied access.
export const enableRowLevelSecurity = async (
  table: string,
  schema = "public",
) => {
  return db.execute(sql.raw(`ALTER TABLE ${quoteTable(schema, table)} ENABLE ROW LEVEL SECURITY`));
};

// Supabase Realtime uses a publication; this adds a table without creating policies or changing RLS.
export const addTableToSupabaseRealtime = async (
  table: string,
  schema = "public",
) => {
  const isPublicationAvailable = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) AS exists
  `);

  if (!isPublicationAvailable[0]?.exists) {
    throw new Error("The supabase_realtime publication does not exist");
  }

  const alreadyPublished = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = ${schema}
        AND tablename = ${table}
    ) AS exists
  `);

  if (alreadyPublished[0]?.exists) return false;

  await db.execute(
    sql.raw(`ALTER PUBLICATION "supabase_realtime" ADD TABLE ${quoteTable(schema, table)}`),
  );
  return true;
};

// pg_partman automates time- or ID-based partition maintenance; call after installing/configuring a partition set.
export const runPgPartmanMaintenance = async () => {
  return db.execute(sql`CALL partman.run_maintenance_proc()`);
};
