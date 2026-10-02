import { Elysia } from "elysia";
import { ApiError } from "../utils/ApiError";

const TIME_TOLERANCE_MS = 30_000;

export const timeSyncMiddleware = new Elysia({ name: "time-sync" }).onRequest(
  ({ request }) => {
    const timestamp = request.headers.get("x-timestamp");
    if (timestamp === null) return;

    const clientTime = Number(timestamp);
    if (!Number.isSafeInteger(clientTime)) {
      throw new ApiError(400, "Invalid client timestamp");
    }

    const serverTime = Date.now();
    const difference = Math.abs(serverTime - clientTime);
    if (difference > TIME_TOLERANCE_MS) {
      throw new ApiError(400, "Clock synchronization required", [
        { serverTime, clientTime, difference },
      ]);
    }
  }
);