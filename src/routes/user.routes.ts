// src/routes/user.routes.ts
import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth";

import {
  getuser,
  getuserwithId,
  getuserwithoutfollowing,
  updateuser,
  changeavatar,
  changecoverImage,
  followlistcon,
  getWatchHistory,
} from "../controller/user.controller";

const userRoutes = new Elysia({ prefix: "/api/v1/users" })

  // ──────────────── All Protected Routes ────────────────
  .use(
     authMiddleware
  // GET /api/v1/users/current-user
  .get("/current-user", getuser)

  // GET /api/v1/users/user-id/:id
  .get("/user-id/:id", getuserwithId, {
    params: t.Object({
      id: t.String(),
    }),
  })

  // PATCH /api/v1/users/update-account
  .patch("/update-account", updateuser, {
    body: t.Object({
      email: t.Optional(t.String()),
      fullName: t.Optional(t.String()),
      bio: t.Optional(t.String()),
      whatsapp: t.Optional(t.String()),
      storeLink: t.Optional(t.String()),
      facebook: t.Optional(t.String()),
      instagram: t.Optional(t.String()),
      productlink: t.Optional(t.String()),
    }),
  })

  // PATCH /api/v1/users/avatar (file upload)
  .patch("/avatar", changeavatar, {
    body: t.Object({
      avatar: t.File(),
    }),
  })

  // PATCH /api/v1/users/cover-image (file upload)
  .patch("/cover-image", changecoverImage, {
    body: t.Object({
      coverImage: t.File(),
    }),
  })

  // GET /api/v1/users/f/:username (follow profile / channel)
  .get("/f/:username", followlistcon, {
    params: t.Object({
      username: t.String(),
    }),
  })

  // GET /api/v1/users/history
  .get("/history", getWatchHistory)
)
export default userRoutes;