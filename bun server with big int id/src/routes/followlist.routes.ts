import { Elysia, t } from "elysia";
import { createAuthMiddleware } from "../middleware/auth";
import {
  getUserFollowers,
  getUserFollowing,
  getUserFollowStats,
  isFollowing,
  toggleFollow,
} from "../controller/followlist.controller";

const userIdParams = t.Object({ userId: t.String() });
const paginationQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
});

const followListRoutes = new Elysia({ prefix: "/api/v1/followlist" }).use(
  createAuthMiddleware()
    .post("/toggle/:followingId", toggleFollow, {
      params: t.Object({ followingId: t.String() }),
    })
    .get("/followers/:userId", getUserFollowers, {
      params: userIdParams,
      query: paginationQuery,
    })
    .get("/following/:userId", getUserFollowing, {
      params: userIdParams,
      query: paginationQuery,
    })
    .get("/is-following/:userId", isFollowing, {
      params: userIdParams,
    })
    .get("/stats/:userId", getUserFollowStats, {
      params: userIdParams,
    })
);

export default followListRoutes;
