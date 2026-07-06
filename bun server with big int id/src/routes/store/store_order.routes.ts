// src/routes/store/store_order.routes.ts
import { Elysia, t } from "elysia";
import { storeOrderController } from "../../controller/store/store_order.controller";
import { authMiddleware } from "../../middleware/auth";
import { verifyStoreOwner } from "../../middleware/store";

const storeOrderRoutes = new Elysia({ prefix: "/api/v1/stores" })

  .use(authMiddleware

    // ✅ Create order (Customer)
    // POST /api/v1/stores/orders/create
    .post(
      "/orders/create",
      async ({ body, userVerified }) => {
        return await storeOrderController.createOrder(body, userVerified);
      },
      {
        body: t.Object({
          storeId: t.String(),
          items: t.Array(
            t.Object({
              productId: t.String(),
              quantity: t.Number({ minimum: 1 }),
              color: t.Optional(t.Nullable(t.String())),
              size: t.Optional(t.Nullable(t.String())),
            })
          ),
          customerName: t.String(),
          customerEmail: t.String(),
          customerPhone: t.String(),
          customerAddress: t.String(),
          customerCity: t.Optional(t.String()),
          customerCountry: t.Optional(t.String()),
          customerPostalCode: t.Optional(t.String()),
          paymentMethod: t.Optional(
            t.Union([
              t.Literal("cod"),
              t.Literal("jazzcash"),
              t.Literal("easypaisa"),
              t.Literal("bank_transfer"),
            ])
          ),
          notes: t.Optional(t.String()),
        }),
      }
    )

    // ✅ Get customer orders — all stores (mirrors GET /orders/myorders)
    // Optional ?storeId= query filter also works here
    // GET /api/v1/stores/orders/myorders
    .get(
      "/orders/myorders",
      async ({ query, userVerified }) => {
        return await storeOrderController.getCustomerOrders(query, userVerified);
      },
      {
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          storeId: t.Optional(t.String()), // optional filter
        }),
      }
    )

    // ✅ Get customer orders from ONE specific store — returns storeInfo
    // Mirrors GET /orders/my-orders/:storeId
    // GET /api/v1/stores/orders/my-orders/:storeId
    .get(
      "/orders/my-orders/:storeId",
      async ({ params, query, userVerified }) => {
        return await storeOrderController.getCustomerOrdersFromOneStore(
          params,
          query,
          userVerified
        );
      },
      {
        params: t.Object({
          storeId: t.String(),
        }),
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
        }),
      }
    )

    // ✅ Get a single order by ID
    // GET /api/v1/stores/orders/:orderId
    .get(
      "/orders/:orderId",
      async ({ params, userVerified }) => {
        return await storeOrderController.getOrderById(params, userVerified);
      },
      {
        params: t.Object({
          orderId: t.String(),
        }),
      }
    )

    // ✅ Cancel order by customer (only pending orders)
    // PATCH /api/v1/stores/orders/:orderId/:storeId/cancel
    .patch(
      "/orders/:orderId/:storeId/cancel",
      async ({ params, userVerified }) => {
        return await storeOrderController.cancelOrderByCustomer(params, userVerified);
      },
      {
        params: t.Object({
          orderId: t.String(),
          storeId: t.String(),
        }),
      }
    )

    // ─── Store Owner Protected Routes ─────────────────────────────────────────
    .use(verifyStoreOwner

      // ✅ Get all orders for a store (Store Owner)
      // GET /api/v1/stores/orders/store/:storeId
      .get(
        "/orders/store/:storeId",
        async ({ params, query, store }) => {
          return await storeOrderController.getStoreOrders(params, query, store);
        },
        {
          params: t.Object({
            storeId: t.String(),
          }),
          query: t.Object({
            page: t.Optional(t.String()),
            limit: t.Optional(t.String()),
          }),
        }
      )

      // ✅ Update order status (Store Owner)
      // PATCH /api/v1/stores/orders/:orderId/status
      .patch(
        "/orders/:orderId/status",
        async ({ params, body, store }) => {
          return await storeOrderController.updateOrderStatus(params, body, store);
        },
        {
          params: t.Object({
            orderId: t.String(),
          }),
          body: t.Object({
            orderStatus: t.Union([
              t.Literal("pending"),
              t.Literal("processing"),
              t.Literal("shipped"),
              t.Literal("delivered"),
              t.Literal("cancelled"),
            ]),
            trackingNumber: t.Optional(t.String()),
          }),
        }
      )

      // ✅ Delete order by store owner (hard delete, cascades items)
      // DELETE /api/v1/stores/orders/:orderId/:storeId
      .delete(
        "/orders/:orderId/:storeId",
        async ({ params, body, store }) => {
          return await storeOrderController.deleteOrderByOwner(params, body, store);
        },
        {
          params: t.Object({
            orderId: t.String(),
            storeId: t.String(),
          }),
        }
      )

      // ✅ Update individual item status (Store Owner)
      // PATCH /api/v1/stores/orders/:orderId/items/:itemId/status
      .patch(
        "/orders/:orderId/items/:itemId/status",
        async ({ params, body, store }) => {
          return await storeOrderController.updateItemStatus(params, body, store);
        },
        {
          params: t.Object({
            orderId: t.String(),
            itemId: t.String(),
          }),
          body: t.Object({
            itemStatus: t.Optional(
              t.Union([
                t.Literal("pending"),
                t.Literal("processing"),
                t.Literal("shipped"),
                t.Literal("delivered"),
                t.Literal("cancelled"),
              ])
            ),
            itemPaymentStatus: t.Optional(
              t.Union([
                t.Literal("pending"),
                t.Literal("completed"),
                t.Literal("failed"),
                t.Literal("refunded"),
              ])
            ),
          }),
        }
      )

    ) // end verifyStoreOwner
  ); // end authMiddleware

export default storeOrderRoutes;


// // src/routes/store/store_order.routes.ts
// import { Elysia, t } from "elysia";
// import { storeOrderController } from "../../controller/store/store_order.controller";
// import { authMiddleware } from "../../middleware/auth";
// import { verifyStoreOwner } from "../../middleware/store";

// const storeOrderRoutes = new Elysia({ prefix: "/api/v1/stores" })

//   .use(authMiddleware

//     // ✅ Create order (Customer)
//     .post(
//       "/orders/create",
//       async ({ body, userVerified }) => {
//         return await storeOrderController.createOrder(body, userVerified);
//       },
//       {
//         body: t.Object({
//           storeId: t.String(),
//           items: t.Array(
//             t.Object({
//               productId: t.String(),
//               quantity: t.Number({ minimum: 1 }),
//               color: t.Optional(t.Nullable(t.String())),
//               size: t.Optional(t.Nullable(t.String())),
//             })
//           ),
//           customerName: t.String(),
//           customerEmail: t.String(),
//           customerPhone: t.String(),
//           customerAddress: t.String(),
//           customerCity: t.Optional(t.String()),
//           customerCountry: t.Optional(t.String()),
//           customerPostalCode: t.Optional(t.String()),
//           paymentMethod: t.Optional(
//             t.Union([
//               t.Literal("cod"),
//               t.Literal("jazzcash"),
//               t.Literal("easypaisa"),
//               t.Literal("bank_transfer"),
//             ])
//           ),
//           notes: t.Optional(t.String()),
//         }),
//       }
//     )

//     // ✅ Get customer orders (all stores or one store via query)
//     .get(
//       "/orders/my-orders/:storeId",
//       async ({ query, userVerified }) => {
//         return await storeOrderController.getCustomerOrders(query, userVerified);
//       },
//       {
//         query: t.Object({
//           page: t.Optional(t.String()),
//           limit: t.Optional(t.String()),
//           storeId: t.Optional(t.String()),
//         }),
//       }
//     )

//     // ✅ Get order by ID
//     .get(
//       "/orders/:orderId",
//       async ({ params, userVerified }) => {
//         return await storeOrderController.getOrderById(params, userVerified);
//       },
//       {
//         params: t.Object({
//           orderId: t.String(),
//         }),
//       }
//     )

//     // ✅ Cancel order by customer
//     .patch(
//       "/orders/:orderId/:storeId/cancel",
//       async ({ params, userVerified }) => {
//         return await storeOrderController.cancelOrderByCustomer(params, userVerified);
//       },
//       {
//         params: t.Object({
//           orderId: t.String(),
//           storeId: t.String(),
//         }),
//       }
//     )

//     // ✅ Store Owner Protected Routes
//     .use(verifyStoreOwner

//       // ✅ Get store orders (Store Owner)
//       .get(
//         "/orders/store/:storeId",
//         async ({ params, query, store }) => {
//           return await storeOrderController.getStoreOrders(params, query, store);
//         },
//         {
//           params: t.Object({
//             storeId: t.String(),
//           }),
//           query: t.Object({
//             page: t.Optional(t.String()),
//             limit: t.Optional(t.String()),
//           }),
//         }
//       )

//       // ✅ Update order status (Store Owner)
//       .patch(
//         "/orders/:orderId/status",
//         async ({ params, body, store }) => {
//           return await storeOrderController.updateOrderStatus(params, body, store);
//         },
//         {
//           params: t.Object({
//             orderId: t.String(),
//           }),
//           body: t.Object({
//             orderStatus: t.Union([
//               t.Literal("pending"),
//               t.Literal("processing"),
//               t.Literal("shipped"),
//               t.Literal("delivered"),
//               t.Literal("cancelled"),
//             ]),
//             trackingNumber: t.Optional(t.String()),
//           }),
//         }
//       )

//       // ✅ Delete order by owner (Store Owner)
//       .delete(
//         "/orders/:orderId/:storeId",
//         async ({ params, body, store }) => {
//           return await storeOrderController.deleteOrderByOwner(params, body, store);
//         },
//         {
//           params: t.Object({
//             orderId: t.String(),
//             storeId: t.String(),
//           }),
//         }
//       )

//       // ✅ Update item status (Store Owner)
//       .patch(
//         "/orders/:orderId/items/:itemId/status",
//         async ({ params, body, store }) => {
//           return await storeOrderController.updateItemStatus(params, body, store);
//         },
//         {
//           params: t.Object({
//             orderId: t.String(),
//             itemId: t.String(),
//           }),
//           body: t.Object({
//             itemStatus: t.Optional(
//               t.Union([
//                 t.Literal("pending"),
//                 t.Literal("processing"),
//                 t.Literal("shipped"),
//                 t.Literal("delivered"),
//                 t.Literal("cancelled"),
//               ])
//             ),
//             itemPaymentStatus: t.Optional(
//               t.Union([
//                 t.Literal("pending"),
//                 t.Literal("completed"),
//                 t.Literal("failed"),
//                 t.Literal("refunded"),
//               ])
//             ),
//           }),
//         }
//       )

//     ) // end verifyStoreOwner
//   ); // end authMiddleware

// export default storeOrderRoutes