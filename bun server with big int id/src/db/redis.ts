import Redis from "ioredis";
import { flags } from "../config/flags";

const redis = flags.redis && process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  : null;

if (redis) {
  redis.on("connect", () => console.log("Redis connected successfully"));
  redis.on("error", (error) => console.error("Redis connection error:", error));
} else if (flags.redis) {
  console.warn("Redis is enabled but REDIS_URL is missing; queue features are disabled");
}

export default redis;