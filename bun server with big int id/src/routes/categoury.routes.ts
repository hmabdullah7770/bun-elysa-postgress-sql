import { Elysia, t } from "elysia";
import { createAuthMiddleware } from "../middleware/auth";
import {
  addCategoury,
  deleteCategoury,
  getAllCategouryName,
  getCatagoury,
  getFollowingUsersCategoryUltraFast,
  getFollowingUsersPosts,
  getFollowingUsersUnifiedFeed,
  gethasVideoPostsByCategory,
  getonlyImagePostsByCategory,
  getPostsByCategory,
  getPostsByCategoryCousor,
  getPostsByCategoryCousorRedis,
  getUnifiedFeed,
  updateCategoury,
} from "../controller/categoury.controller";

const feedQuery = t.Object({
  category: t.Optional(t.String()),
  categouryname: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  cursor: t.Optional(t.String()),
  query: t.Optional(t.String()),
  sortBy: t.Optional(t.String()),
  sortType: t.Optional(t.String()),
  direction: t.Optional(t.String()),
});

const categoryRoutes = new Elysia({ prefix: "/api/v1/categoury" })
  .get("/getcategoury", getCatagoury, {
    query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()) }),
  })
  .get("/allcategoury", getAllCategouryName)
  .get("/unified-feed", getUnifiedFeed, { query: feedQuery })
  .use(createAuthMiddleware()
    .post("/addcategoury", addCategoury, {
      body: t.Object({ categouryname: t.String({ minLength: 1, maxLength: 255 }) }),
    })
    .patch("/update/:categoryId", updateCategoury, {
      params: t.Object({ categoryId: t.String() }),
      body: t.Object({ categouryname: t.String({ minLength: 1, maxLength: 255 }) }),
    })
    .delete("/deletecategoury", deleteCategoury, {
      body: t.Object({
        categoryId: t.Optional(t.Union([t.String(), t.Number()])),
        _id: t.Optional(t.Union([t.String(), t.Number()])),
        categouryname: t.Optional(t.String()),
      }),
    })
    .get("/getfollowinguserscategoury", getFollowingUsersCategoryUltraFast, {
      query: feedQuery,
    })
    .get("/following-unified-feed", getFollowingUsersUnifiedFeed, { query: feedQuery })
    .get("/getfollowingusersposts", getFollowingUsersPosts, { query: feedQuery })
    .get("/getpostsbycategory", getPostsByCategory, { query: feedQuery })
    .get("/getpostsbycategorycursor", getPostsByCategoryCousor, { query: feedQuery })
    .get("/getpostsbycategorycursor/redis", getPostsByCategoryCousorRedis, {
      query: feedQuery,
    })
    .get("/gethasvideofeedbycategory", gethasVideoPostsByCategory, { query: feedQuery })
    .get("/getonlyimagefeedbycategory", getonlyImagePostsByCategory, { query: feedQuery })
  );

export default categoryRoutes;