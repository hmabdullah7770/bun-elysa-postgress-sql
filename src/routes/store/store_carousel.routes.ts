import { Elysia, t } from "elysia";
import { authMiddleware } from "../../middleware/auth";
import { verifyStoreOwner } from "../../middleware/store";
import {
  createCarousel,
  getStoreCarousels,
  updateCarousel,
  deleteCarousel,
} from "../../controller/store/store_carousel.controller";

const storeCarouselRoutes = new Elysia({ prefix: "/api/v1/stores" })

// Protected + owner only
  .use(authMiddleware
  // GET /api/v1/stores/:storeId/carousels  — public
  .get("/:storeId/carousels", getStoreCarousels, {
    params: t.Object({ storeId: t.String() }),
  })

  
    .use(verifyStoreOwner

  // POST /api/v1/stores/:storeId/carousels/create
  .post("/carousels/:storeId/create", createCarousel, {
    params: t.Object({ storeId: t.String() }),
  })

  // PATCH /api/v1/stores/:storeId/carousels/:carouselId
  .patch("/:storeId/carousels/:carouselId", updateCarousel, {
    params: t.Object({
      storeId: t.String(),
      carouselId: t.String(),
    }),
  })

  // DELETE /api/v1/stores/:storeId/carousels/:carouselId
  .delete("/:storeId/carousels/:carouselId", deleteCarousel, {
    params: t.Object({
      storeId: t.String(),
      carouselId: t.String(),
    }),
  })
  )
)

export default storeCarouselRoutes;




// jsonB


// src/routes/store_carousel.routes.ts
// import { Elysia, t } from "elysia";
// import { authMiddleware } from "../../middleware/auth";
// import { verifyStoreOwner } from "../../middleware/store";
// import {
//   createCarousel,
//   getStoreCarousels,
//   updateCarousel,
//   deleteCarousel,
// } from "../../controller/store/store_carousel.controller";

// const storeCarouselRoutes = new Elysia({ prefix: "/api/v1/stores" })

// // Protected + owner only
//   .use(authMiddleware
//   // GET /api/v1/stores/:storeId/carousels  — public
//   .get("/:storeId/carousels", getStoreCarousels, {
//     params: t.Object({ storeId: t.String() }),
//   })

  
//     .use(verifyStoreOwner

//   // POST /api/v1/stores/:storeId/carousels/create
//   .post("/carousels/:storeId/create", createCarousel, {
//     params: t.Object({ storeId: t.String() }),
//   })

//   // PATCH /api/v1/stores/:storeId/carousels/:carouselId
//   .patch("/:storeId/carousels/:carouselId", updateCarousel, {
//     params: t.Object({
//       storeId: t.String(),
//       carouselId: t.String(),
//     }),
//   })

//   // DELETE /api/v1/stores/:storeId/carousels/:carouselId
//   .delete("/:storeId/carousels/:carouselId", deleteCarousel, {
//     params: t.Object({
//       storeId: t.String(),
//       carouselId: t.String(),
//     }),
//   })
//   )
// )

// export default storeCarouselRoutes;

