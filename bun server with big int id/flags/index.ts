const envFlag = (name: string, fallback: boolean): boolean => {
  const value = process.env[name];
  return value === undefined ? fallback : value.toLowerCase() === "true";
};

export const flags = {
  masterDb: envFlag("MASTER_DB_ENABLED", false),
  redis: envFlag("REDIS_ENABLED", false),
  useQstashQueue:
    envFlag("USE_QSTASH_QUEUE", envFlag("USE_QSTASH", false)),
  mailer: envFlag("MAILER_ENABLED", false),
  useOpenSearch: envFlag("OPENSEARCH_ENABLED", false),
  useBullMQOpenSearch: envFlag("BULLMQ_OPENSEARCH_ENABLED", false),
  paidUser: envFlag("PAID_USER_ENABLED", true),
  securityVideo: envFlag("SECURITY_VIDEO_ENABLED", false),
  downloadFrames: envFlag("DOWNLOAD_FRAMES_ENABLED", true),
  videoModeratorFrames: envFlag("VIDEO_MODERATOR_FRAMES_ENABLED", true),
  videoModeratorVerifyDb: envFlag("VIDEO_MODERATOR_VERIFY_DB", false),
  useEmailQueue: envFlag("EMAIL_QUEUE_ENABLED", false),

   postgresBackends: {
    usePgmqQueue: envFlag("USE_PGMQ_QUEUE", false),
     useCache: envFlag("USE_POSTGRES_CACHE", false),
     useFullTextSearch: envFlag("USE_POSTGRES_FULL_TEXT_SEARCH", false),
    useTrigramSearch: envFlag("USE_POSTGRES_TRIGRAM_SEARCH", false),
    useVectorSearch: envFlag("USE_POSTGRES_VECTOR_SEARCH", false),
  },

  postgresExtensions: {
    pgmq: envFlag("POSTGRES_PGMQ_ENABLED", false),
    pgTrgm: envFlag("POSTGRES_PG_TRGM_ENABLED", false),
    pgVector: envFlag("POSTGRES_PGVECTOR_ENABLED", false),
    pgSearch: envFlag("POSTGRES_PG_SEARCH_ENABLED", false),
    postgis: envFlag("POSTGRES_POSTGIS_ENABLED", false),
    pgCron: envFlag("POSTGRES_PG_CRON_ENABLED", false),
    pgcrypto: envFlag("POSTGRES_PGCRYPTO_ENABLED", false),
    pgStatStatements: envFlag("POSTGRES_PG_STAT_STATEMENTS_ENABLED", false),
    pgPartman: envFlag("POSTGRES_PG_PARTMAN_ENABLED", false),
  },
} as const;