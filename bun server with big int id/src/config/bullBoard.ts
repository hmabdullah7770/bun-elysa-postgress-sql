import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { HonoAdapter } from "@bull-board/hono";
import type { Queue } from "bullmq";
import { Elysia } from "elysia";
import { serveStatic } from "hono/bun";

export const createBullBoardRoutes = (queues: Array<Queue | null | undefined>) => {
  const availableQueues = queues.filter((queue): queue is Queue => queue !== null && queue !== undefined);
  if (availableQueues.length === 0) {
    console.warn("Bull Board skipped: no queues are configured");
    return new Elysia();
  }

  const serverAdapter = new HonoAdapter(serveStatic).setBasePath("/admin/queues");
  createBullBoard({
    queues: availableQueues.map((queue) => new BullMQAdapter(queue)),
    serverAdapter,
  });

  const boardApp = serverAdapter.registerPlugin();
  const forwardToBullBoard = async ({ request, set }: any) => {
    if (process.env.NODE_ENV !== "development") {
      const adminToken = request.headers.get("x-admin-token");
      if (!process.env.ADMIN_SECRET_TOKEN || adminToken !== process.env.ADMIN_SECRET_TOKEN) {
        set.status = 401;
        return { message: "Unauthorized" };
      }
    }
    return boardApp.fetch(request);
  };

  return new Elysia()
    .all("/admin/queues", forwardToBullBoard)
    .all("/admin/queues/*", forwardToBullBoard);
};