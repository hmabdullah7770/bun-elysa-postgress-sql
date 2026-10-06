import { Elysia, t } from "elysia";
import { createAuthMiddleware } from "../middleware/auth";
import {
  checkVideoFrames,
  deleteModerationRecord,
  verifyModeration,
} from "../controller/videoModeration.controller";

const videoModerationRoutes = new Elysia({ prefix: "/api/v1/moderation" }).use(
  createAuthMiddleware()
    .post("/check-frames", checkVideoFrames, {
      body: t.Object({
        mediaIndex: t.Union([t.String(), t.Number()]),
        frames: t.Files({
          type: ["image/jpeg", "image/png", "image/webp"],
          minItems: 1,
          maxItems: 15,
        }),
      }),
    })
    .post("/verify", verifyModeration, {
      body: t.Object({ _id: t.Union([t.String(), t.Number()]) }),
    })
    .delete("/:id", deleteModerationRecord, {
      params: t.Object({ id: t.String() }),
    })
);

export default videoModerationRoutes;