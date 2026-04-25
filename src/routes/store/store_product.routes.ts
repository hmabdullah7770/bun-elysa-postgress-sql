// src/routes/store/store_product.routes.ts
import { Elysia, t } from "elysia";
import { authMiddleware } from "../../middleware/auth";
import { verifyStoreOwner } from "../../middleware/store";
import {
  addProduct,
  getStoreProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  removeProductImage,
} from "../../controller/store/store_product.controller";

const storeProductRoutes = new Elysia({ prefix: "/api/v1/stores" })

  // ✅ Public Routes
  .get("/:storeId/products", getStoreProducts, {
    params: t.Object({ storeId: t.String() }),
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      category: t.Optional(t.String()),
      sort: t.Optional(t.String()),
    }),
  })

  .get("/products/:productId", getProductById, {
    params: t.Object({ productId: t.String() }),
  })

  // ✅ Protected Routes
  .group("", (app) =>
    app
      .use(authMiddleware)
      .use(verifyStoreOwner)

      // POST /api/v1/stores/:storeId/products
      .post("/:storeId/products", addProduct, {
        params: t.Object({ storeId: t.String() }),
        body: t.Object({
          productName: t.String({ minLength: 1 }),
          description: t.Optional(t.String()),
          warnings: t.Optional(t.String()),
          productPrice: t.String(),
          productDiscount: t.Optional(t.String()),
          productSizes: t.Optional(t.String()),
          productColors: t.Optional(t.String()),
          category: t.Optional(t.String()),
          stock: t.Optional(t.String()),
          variants: t.Optional(t.String()),
          specifications: t.Optional(t.String()),
          tags: t.Optional(t.String()),
          // ✅ Product images (up to 10)
          productImage0: t.Optional(t.File({
            type: ["image/jpeg", "image/png", "image/webp"],
            maxSize: "5m",
          })),
          productImage1: t.Optional(t.File({
            type: ["image/jpeg", "image/png", "image/webp"],
            maxSize: "5m",
          })),
          productImage2: t.Optional(t.File({
            type: ["image/jpeg", "image/png", "image/webp"],
            maxSize: "5m",
          })),
          productImage3: t.Optional(t.File({
            type: ["image/jpeg", "image/png", "image/webp"],
            maxSize: "5m",
          })),
          productImage4: t.Optional(t.File({
            type: ["image/jpeg", "image/png", "image/webp"],
            maxSize: "5m",
          })),
          productImage5: t.Optional(t.File({
            type: ["image/jpeg", "image/png", "image/webp"],
            maxSize: "5m",
          })),
          productImage6: t.Optional(t.File({
            type: ["image/jpeg", "image/png", "image/webp"],
            maxSize: "5m",
          })),
          productImage7: t.Optional(t.File({
            type: ["image/jpeg", "image/png", "image/webp"],
            maxSize: "5m",
          })),
          productImage8: t.Optional(t.File({
            type: ["image/jpeg", "image/png", "image/webp"],
            maxSize: "5m",
          })),
          productImage9: t.Optional(t.File({
            type: ["image/jpeg", "image/png", "image/webp"],
            maxSize: "5m",
          })),
        }),
      })

      // PUT /api/v1/stores/:storeId/products/:productId
      .put("/:storeId/products/:productId", updateProduct, {
        params: t.Object({
          storeId: t.String(),
          productId: t.String(),
        }),
        body: t.Object({
          productName: t.Optional(t.String()),
          description: t.Optional(t.String()),
          warnings: t.Optional(t.String()),
          productPrice: t.Optional(t.String()),
          productDiscount: t.Optional(t.String()),
          category: t.Optional(t.String()),
          stock: t.Optional(t.String()),
          variants: t.Optional(t.String()),
          specifications: t.Optional(t.String()),
          tags: t.Optional(t.String()),
          productImage0: t.Optional(t.File({
            type: ["image/jpeg", "image/png", "image/webp"],
            maxSize: "5m",
          })),
          productImage1: t.Optional(t.File({
            type: ["image/jpeg", "image/png", "image/webp"],
            maxSize: "5m",
          })),
          productImage2: t.Optional(t.File({
            type: ["image/jpeg", "image/png", "image/webp"],
            maxSize: "5m",
          })),
        }),
      })

      // DELETE /api/v1/stores/:storeId/products/:productId
      .delete("/:storeId/products/:productId", deleteProduct, {
        params: t.Object({
          storeId: t.String(),
          productId: t.String(),
        }),
      })

      // PATCH /api/v1/stores/:storeId/products/:productId/remove-image
      .patch(
        "/:storeId/products/:productId/remove-image",
        removeProductImage,
        {
          params: t.Object({
            storeId: t.String(),
            productId: t.String(),
          }),
          body: t.Object({
            imageUrl: t.String(),
          }),
        }
      )
  );

export default storeProductRoutes;