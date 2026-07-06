// src/routes/store/store_carousel_old.routes.ts
import { Elysia, t } from "elysia";
import { authMiddleware } from "../../middleware/auth";
import { verifyStoreOwner } from "../../middleware/store";
import {
  createCarouselOld,
  getStoreCarouselsOld,
  updateCarouselOld,       
  deleteCarouselOld,
} from "../../controller/store/store_carousel_old.controller";

const storeCarouselOldRoutes = new Elysia({ prefix: "/api/v1/stores" })

.use(authMiddleware
  // ✅ Public Route
  .get("/:storeId/oldcarousels", getStoreCarouselsOld, {
    params: t.Object({ storeId: t.String() }),
  })

  // ✅ Protected Routes
 
      
      .use(verifyStoreOwner

      // POST /api/v1/stores/oldcarousels/:storeId/create
      .post("/oldcarousels/:storeId/create", createCarouselOld, {
        params: t.Object({ storeId: t.String() }),
      })

      // PATCH /api/v1/stores/:storeId/oldcarousels/:carouselId
      .patch("/:storeId/oldcarousels/:carouselId", updateCarouselOld, {
        params: t.Object({
          storeId: t.String(),
          carouselId: t.String(),
        }),
      })

      // DELETE /api/v1/stores/:storeId/oldcarousels/:carouselId
      .delete("/:storeId/oldcarousels/:carouselId", deleteCarouselOld, {
        params: t.Object({
          storeId: t.String(),
          carouselId: t.String(),
        }),
      })
  
      )
    )

export default storeCarouselOldRoutes;



// src/routes/store_carousel.routes.ts
