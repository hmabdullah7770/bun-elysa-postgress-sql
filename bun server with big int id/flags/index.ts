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