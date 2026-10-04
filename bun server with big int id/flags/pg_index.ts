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

 
} as const;



// export const pgIndex = {
//   postgresBackends: {
//     redis: {
//       replaces: "pgmq",
//       description: "Redis-like queue service replacement in PostgreSQL",
//     },
//     useQstashQueue: {
//       replaces: "pgmq",
//       description: "Queue/job processing can be handled by PostgreSQL pgmq",
//     },
//     useOpenSearch: {
//       replaces: [
//         "useFullTextSearch",
//         "useTrigramSearch",
//         "useVectorSearch",
//         "pgSearch",
//       ],
//       description: "OpenSearch search capabilities can be replaced by PostgreSQL search features",
//     },
//     useBullMQOpenSearch: {
//       replaces: [
//         "pgmq",
//         "useFullTextSearch",
//         "useTrigramSearch",
//         "useVectorSearch",
//         "pgSearch",
//       ],
//       description: "Combination of queue + search can be replaced using pgmq + PostgreSQL search features",
//     },
//     useEmailQueue: {
//       replaces: "pgmq",
//       description: "Email queue can be replaced by PostgreSQL pgmq",
//     },
//   },

//   postgresExtensions: {
//     pgTrgm: "pg_trgm",
//     pgVector: "pgvector",
//     pgSearch: "pg_search",
//     pgmq: "pgmq",
//     postgis: "postgis",
//     pgCron: "pg_cron",
//     pgcrypto: "pgcrypto",
//     pgStatStatements: "pg_stat_statements",
//     pgPartman: "pg_partman",
//     timescaleDb: "timescaledb",
//     pgDuckDb: "duckdb",
//     pgPrewarm: "pg_prewarm",
//   },
// } as const;
