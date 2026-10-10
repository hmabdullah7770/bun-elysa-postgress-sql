import { Elysia, t } from "elysia";
import {
  addRating,
  deleteRating,
  getPostRatings,
  getPostRatingSummary,
  getUserRatingForPost,
  updateRating,
} from "../controller/rating.controller";
import { createAuthMiddleware } from "../middleware/auth";
import decompressRequestBody from "../middleware/decompressRequestBody";

const ratingRoutes = new Elysia({ prefix: "/api/v1/rating" })
  .use(decompressRequestBody)
  .use(
    createAuthMiddleware()
      .get("/:postId", getPostRatings, {
        params: t.Object({ postId: t.String() }),
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          sortBy: t.Optional(t.String()),
          sortType: t.Optional(t.String()),
        }),
      })
      .post("/add", addRating, {
        body: t.Object({
          posts: t.Array(
            t.Object({
              postId: t.Union([t.String(), t.Number()]),
              rating: t.Union([t.Number(), t.Null()]),
            })
          ),
        }),
      })
      .patch("/rating/:ratingId", updateRating, {
        params: t.Object({ ratingId: t.String() }),
        body: t.Object({
          rating: t.Optional(t.Number()),
          comment: t.Optional(t.Union([t.String(), t.Null()])),
        }),
      })
      .delete("/rating/:ratingId", deleteRating, {
        params: t.Object({ ratingId: t.String() }),
      })
      .get("/summary/:postId", getPostRatingSummary, {
        params: t.Object({ postId: t.String() }),
      })
      .get("/user/:postId", getUserRatingForPost, {
        params: t.Object({ postId: t.String() }),
      })
  );

export default ratingRoutes;