import { Elysia, t } from "elysia";
import { addToFavouret, getUserFavourets, removeFromFavouret } from "../controller/favouret.controller";
import { authMiddleware } from "../middleware/auth";

const favouretRoutes = new Elysia({ prefix: "/api/v1/favouret" }).use(
  authMiddleware
    .get("/", getUserFavourets)
    .post("/add", addToFavouret, {
      body: t.Object({ postIds: t.Array(t.Union([t.String(), t.Number()])) }),
    })
    .delete("/remove", removeFromFavouret, {
      body: t.Object({ postIds: t.Array(t.Union([t.String(), t.Number()])) }),
    })
);

export default favouretRoutes;