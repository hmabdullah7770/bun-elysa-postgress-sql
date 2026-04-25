// src/routes/store.routes.ts
import { Elysia, t } from "elysia";
import { authMiddleware } from "../../middleware/auth";
import { verifyStoreOwner } from "../../middleware/store";
import {
  createStore,
  getUserStores,
  getStoreById,
  updateStore,
  deleteStore,
  incrementClickCount,
  rateStore,
  getTopRatedStores,
  getUserRatedStores,
} from "../../controller/store/createstore.controller";

const storeRoutes = new Elysia({ prefix: "/api/v1/stores" })

  // ──────────────── Public Routes ────────────────

  // GET /api/v1/stores/top-rated
  .get("/top-rated", getTopRatedStores, {
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      category: t.Optional(t.String()),
    }),
  })

  

  // POST /api/v1/stores/:storeId/click
  .post("/:storeId/click", incrementClickCount, {
    params: t.Object({
      storeId: t.String(),
    }),
  })

  // ──────────────── Protected Routes ────────────────

  .use(
    authMiddleware

    // POST /api/v1/stores
    .post("/create", createStore, {
      body: t.Object({
        storeName: t.String({ minLength: 1 }),
        category: t.Optional(t.String()),
        storeLogo: t.File({
          type: ["image/jpeg", "image/png", "image/webp"],
          maxSize: "5m",
        }),
      }),
    })

    // GET /api/v1/stores/my-stores
    .get("/user-stores", getUserStores)

    // GET /api/v1/stores/my-ratings
    .get("/my-ratings", getUserRatedStores, {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    })
     
    .use(verifyStoreOwner
    // PATCH /api/v1/stores/:storeId
    .put("/:storeId", updateStore, {
      params: t.Object({
        storeId: t.String(),
      }),
      body: t.Object({
        storeName: t.Optional(t.String()),
        category: t.Optional(t.String()),
        storeLogo: t.Optional(
          t.File({
            type: ["image/jpeg", "image/png", "image/webp"],
            maxSize: "5m",
          })
        ),
      }),
    })
       
    // DELETE /api/v1/stores/:storeId
    .delete("/:storeId", deleteStore, {
      params: t.Object({
        storeId: t.String(),
      }),
    })

)

    // POST /api/v1/stores/rate
    .post("/rate", rateStore, {
      body: t.Object({
        storeId: t.String(),
        rating: t.Number({ minimum: 1, maximum: 5 }),
      }),
    })
  )

  // GET /api/v1/stores/:storeId
  .get("/:storeId", getStoreById, {
    params: t.Object({
      storeId: t.String(),
    }),
  })

export default storeRoutes;