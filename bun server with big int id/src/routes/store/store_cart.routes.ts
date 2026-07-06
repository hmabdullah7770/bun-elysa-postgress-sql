// src/routes/store_cart.routes.ts
import { Elysia } from "elysia";
import { storeCartController } from "../../controller/store/store_cart.controller";

 const storeCartRoutes = new Elysia({ prefix: "/api/v1/stores" })

  // ADD TO CART
  .post("/cart/add", async ({ body }) => {
    return await storeCartController.addToStoreCart(body);
  })

  // GET CART
  .get("/cart/:userId/:storeId", async ({ params }) => {
    return await storeCartController.getStoreCart(
      params.userId,
      params.storeId,
    );
  })

  // REMOVE FROM CART
  .delete("/store-cart/remove", async ({ body }) => {
    return await storeCartController.removeFromStoreCart(body);
  })

  // CLEAR CART
  .delete("/store-cart/clear", async ({ body }) => {
    return await storeCartController.clearStoreCart(body);
  });

  export default storeCartRoutes;