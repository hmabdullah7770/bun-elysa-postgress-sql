import { Elysia } from "elysia";
import redis from "../db/redis";

type LocalCounter = { count: number; expiresAt: number };
const localCounters = new Map<string, LocalCounter>();

export const createRateLimiter = (maxRequests: number, windowSeconds: number) =>
  new Elysia({ name: `rate-limit-${maxRequests}-${windowSeconds}` }).onBeforeHandle(
    async ({ request, server, set }) => {
      const ip = server?.requestIP(request)?.address
        ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        ?? "unknown";
      const path = new URL(request.url).pathname;
      const key = `rate:${ip}:${path}`;
      let count: number;

      if (redis) {
        count = await redis.incr(key);
        if (count === 1) await redis.expire(key, windowSeconds);
      } else {
        const now = Date.now();
        const current = localCounters.get(key);
        if (!current || current.expiresAt <= now) {
          localCounters.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
          count = 1;
        } else {
          current.count += 1;
          count = current.count;
        }
      }

      if (count > maxRequests) {
        set.status = 429;
        return {
          success: false,
          statusCode: 429,
          message: "Too many requests",
          data: null,
        };
      }
    }
  );

export const strictLimiter = createRateLimiter(20, 60);
export const normalLimiter = createRateLimiter(100, 60);
export const scrollLimiter = createRateLimiter(500, 60);
export const publicLimiter = createRateLimiter(200, 60);