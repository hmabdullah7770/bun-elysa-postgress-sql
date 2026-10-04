import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { flags } from "../flags";

type CacheOptions = {
  ttlSeconds?: number;
};

let tableInitialization: Promise<void> | undefined;

const assertCacheEnabled = () => {
  if (!flags.postgresBackends.useCache) {
    throw new Error("PostgreSQL cache backend is disabled");
  }
};

const validateKey = (key: string) => {
  if (!key.trim()) throw new Error("Cache key is required");
  return key;
};

const ensureCacheTable = async () => {
  if (!tableInitialization) {
    tableInitialization = db.execute(sql`
      CREATE UNLOGGED TABLE IF NOT EXISTS public.app_cache (
        cache_key text PRIMARY KEY,
        cache_value jsonb NOT NULL,
        expires_at timestamptz,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `).then(() => undefined);
  }

  try {
    await tableInitialization;
  } catch (error) {
    tableInitialization = undefined;
    throw error;
  }
};

const validateTtl = (ttlSeconds: number | undefined) => {
  if (
    ttlSeconds !== undefined &&
    (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0)
  ) {
    throw new Error("Cache TTL must be a positive number of seconds");
  }
};

export const cacheSet = async <T>(
  key: string,
  value: T,
  options: CacheOptions = {},
) => {
  assertCacheEnabled();
  validateKey(key);
  validateTtl(options.ttlSeconds);
  const serializedValue = JSON.stringify(value);
  if (serializedValue === undefined) {
    throw new Error("Cache value must be JSON-serializable");
  }

  await ensureCacheTable();
  return db.execute(sql`
    INSERT INTO public.app_cache (cache_key, cache_value, expires_at, updated_at)
    VALUES (
      ${key},
      ${serializedValue}::jsonb,
      CASE
        WHEN ${options.ttlSeconds ?? null}::double precision IS NULL THEN NULL
        ELSE now() + (${options.ttlSeconds ?? null}::double precision * interval '1 second')
      END,
      now()
    )
    ON CONFLICT (cache_key) DO UPDATE SET
      cache_value = EXCLUDED.cache_value,
      expires_at = EXCLUDED.expires_at,
      updated_at = now()
  `);
};

export const cacheGet = async <T = unknown>(key: string): Promise<T | null> => {
  assertCacheEnabled();
  validateKey(key);
  await ensureCacheTable();

  const result = await db.execute<{ cache_value: T }>(sql`
    SELECT cache_value
    FROM public.app_cache
    WHERE cache_key = ${key}
      AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1
  `);

  return result[0]?.cache_value ?? null;
};

export const cacheDelete = async (key: string) => {
  assertCacheEnabled();
  validateKey(key);
  await ensureCacheTable();
  return db.execute(sql`
    DELETE FROM public.app_cache
    WHERE cache_key = ${key}
  `);
};

export const cleanExpiredCache = async (limit = 1000) => {
  assertCacheEnabled();
  if (!Number.isInteger(limit) || limit < 1 || limit > 10000) {
    throw new Error("Cleanup limit must be an integer between 1 and 10000");
  }

  await ensureCacheTable();
  return db.execute(sql`
    WITH expired AS (
      SELECT cache_key
      FROM public.app_cache
      WHERE expires_at <= now()
      LIMIT ${limit}
    )
    DELETE FROM public.app_cache
    WHERE cache_key IN (SELECT cache_key FROM expired)
    RETURNING cache_key
  `);
};
