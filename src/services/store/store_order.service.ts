// src/services/store/store_order.service.ts
import { storeOrderRepository } from "../../repository/store/store_order.repository";
import { storeProductRepository } from "../../repository/store/store_product.repository";
import { createstoreRepository } from "../../repository/store/createstore.repository";
import { ApiError } from "../../utils/ApiError";
import { type StoreOrderItem } from "../../schemas/store/store_order.schema";

interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  color?: string | null;
  size?: string | null;
}

interface CreateOrderInput {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity?: string;
  customerCountry?: string;
  customerPostalCode?: string;
  storeId: string;
  items: CreateOrderItemInput[];
  paymentMethod: "cod" | "jazzcash" | "easypaisa" | "bank_transfer";
  notes?: string;
}

export const storeOrderService = {

  // âœ… Create order
  async createOrder(input: CreateOrderInput) {
    const {
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerCity,
      customerCountry,
      customerPostalCode,
      storeId,
      items,
      paymentMethod,
      notes,
    } = input;

    // Validate store
    const store = await createstoreRepository.findById(storeId);
    if (!store) throw new ApiError(404, "Store not found");

    // Validate and populate items
    const populatedItems: Omit<
      StoreOrderItem,
      "_id" | "orderId" | "createdAt" | "updatedAt"
    >[] = [];

    const productIdsToUpdate: string[] = [];
    let totalAmount = 0;

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        throw new ApiError(400, "Each item must have a valid productId and quantity");
      }

      // Fetch product from this store
      const product = await storeProductRepository.findById(item.productId);
      if (!product || product.storeId !== storeId) {
        throw new ApiError(404, `Product ${item.productId} not found in this store`);
      }

      const finalPrice = Number(product.finalPrice ?? product.productPrice);
      totalAmount += finalPrice * item.quantity;

      productIdsToUpdate.push(product._id);

      populatedItems.push({
        productId: product._id,
        productName: product.productName,
        productImages: product.productImages,
        quantity: item.quantity,
        color:
          product.productColors && product.productColors.length > 0
            ? (item.color ?? null)
            : null,
        size:
          product.productSizes && product.productSizes.length > 0
            ? (item.size ?? null)
            : null,
        itemStatus: "pending",
        itemPaymentStatus: "pending",
      });
    }

    const shippingCost = 0;
    const finalAmount = totalAmount + shippingCost;

    // Create order + items in a single transaction
    const order = await storeOrderRepository.create(
      {
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        customerCity,
        customerCountry,
        customerPostalCode,
        storeId,
        storeOwnerId: store.ownerId,
        totalAmount: totalAmount.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        finalAmount: finalAmount.toFixed(2),
        paymentMethod,
        paymentStatus: "pending",
        orderStatus: "pending",
        notes,
      },
      populatedItems
    );

    // âœ… Increment ordersalltime for each unique product (mirrors old JS behavior)
    for (const productId of productIdsToUpdate) {
      await storeProductRepository.incrementOrdersAllTime(productId);
    }

    // âœ… Increment totalSells on the store (mirrors old JS behavior)
    await createstoreRepository.incrementTotalSells(storeId);

    // Mark notification sent
    await storeOrderRepository.markNotified(order._id);

    return order;
  },

  // âœ… Get store orders (store owner)
  async getStoreOrders(storeId: string, page: number, limit: number) {
    const store = await createstoreRepository.findById(storeId);
    if (!store) throw new ApiError(404, "Store not found");

    return await storeOrderRepository.findByStoreId(storeId, page, limit);
  },

  // âœ… Get order by ID
  async getOrderById(orderId: string) {
    const order = await storeOrderRepository.findById(orderId);
    if (!order) throw new ApiError(404, "Order not found");
    return order;
  },

  // âœ… Get order by ID and store
  async getOrderByIdAndStore(orderId: string, storeId: string) {
    const order = await storeOrderRepository.findByIdAndStore(orderId, storeId);
    if (!order) throw new ApiError(404, "Order not found");
    return order;
  },

  // âœ… Update order status
  async updateOrderStatus(
    orderId: string,
    orderStatus: StoreOrderItem["itemStatus"],
    trackingNumber?: string
  ) {
    const order = await storeOrderRepository.updateOrderStatus(
      orderId,
      orderStatus,
      trackingNumber
    );
    if (!order) throw new ApiError(404, "Order not found");
    return order;
  },

  // âœ… Get customer orders â€” all stores (with optional storeId filter via query)
  // Mirrors old getCustomerOrders dynamic endpoint
  async getCustomerOrders(
    customerId: string,
    page: number,
    limit: number,
    storeId?: string
  ) {
    if (storeId) {
      const store = await createstoreRepository.findById(storeId);
      if (!store) throw new ApiError(404, "Store not found");
    }

    return await storeOrderRepository.findByCustomerId(customerId, page, limit, storeId);
  },

  // âœ… Get customer orders from ONE store â€” returns storeInfo in response
  // Mirrors old getCustomerOrdersFromOneStore endpoint
  async getCustomerOrdersFromOneStore(
    customerId: string,
    storeId: string,
    page: number,
    limit: number
  ) {
    const store = await createstoreRepository.findById(storeId);
    if (!store) throw new ApiError(404, "Store not found");

    const result = await storeOrderRepository.findByCustomerId(
      customerId,
      page,
      limit,
      storeId
    );

    return {
      orders: result.orders,
      totalOrders: result.total,
      storeInfo: {
        storeId: store._id,
        storeName: store.storeName,
        storeLogo: store.storeLogo,
      },
    };
  },

  // âœ… Cancel order by customer (only pending orders)
  async cancelOrderByCustomer(
    orderId: string,
    storeId: string,
    customerId: string
  ) {
    const order = await storeOrderRepository.findByIdAndStore(orderId, storeId);
    if (!order) throw new ApiError(404, "Order not found");

    if (order.customerId !== customerId) {
      throw new ApiError(403, "You are not the customer of this order");
    }

    if (order.orderStatus !== "pending") {
      throw new ApiError(400, "You can only cancel pending orders");
    }

    const cancelled = await storeOrderRepository.cancelOrder(orderId);
    if (!cancelled) throw new ApiError(400, "Order could not be cancelled");

    return cancelled;
  },

  // âœ… Delete order by store owner (hard delete â€” cascades items)
  async deleteOrderByOwner(
    orderId: string,
    storeId: string,
    ownerId: string
  ) {
    const order = await storeOrderRepository.findByIdAndStore(orderId, storeId);
    if (!order) throw new ApiError(404, "Order not found");

    if (order.storeOwnerId !== ownerId) {
      throw new ApiError(403, "Unauthorized access");
    }

    const deleted = await storeOrderRepository.deleteOrder(orderId, storeId);
    if (!deleted) throw new ApiError(400, "Order could not be deleted");

    return deleted;
  },

  // âœ… Update individual item status (store owner only)
  async updateItemStatus(
    orderId: string,
    storeId: string,
    itemId: string,
    itemStatus?: StoreOrderItem["itemStatus"],
    itemPaymentStatus?: StoreOrderItem["itemPaymentStatus"]
  ) {
    if (!itemStatus && !itemPaymentStatus) {
      throw new ApiError(400, "Provide itemStatus or itemPaymentStatus to update");
    }

    const validItemStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
    const validPaymentStatuses = ["pending", "completed", "failed", "refunded"];

    if (itemStatus && !validItemStatuses.includes(itemStatus)) {
      throw new ApiError(
        400,
        `Invalid itemStatus. Must be one of: ${validItemStatuses.join(", ")}`
      );
    }

    if (itemPaymentStatus && !validPaymentStatuses.includes(itemPaymentStatus)) {
      throw new ApiError(
        400,
        `Invalid itemPaymentStatus. Must be one of: ${validPaymentStatuses.join(", ")}`
      );
    }

    const updatedItem = await storeOrderRepository.updateItemStatus(
      itemId,
      orderId,
      storeId,
      itemStatus,
      itemPaymentStatus
    );

    if (!updatedItem) throw new ApiError(404, "Order or item not found");

    // Return full order + the updated item (mirrors old JS response)
    const order = await storeOrderRepository.findById(orderId);

    return { order, updatedItem };
  },
};



// // src/services/store-order.service.ts
// import { storeOrderRepository } from "../../repository/store/store_order.repository";

// import { storeProductRepository } from "../../repository/store/store_product.repository";

// import { createstoreRepository } from "../../repository/store/createstore.repository";
// import { ApiError } from "../../utils/ApiError";
// import {
//   type StoreOrderItem,
// } from "../../schemas/store/store_order.schema";

// interface CreateOrderItemInput {
//   productId: string;
//   quantity: number;
//   color?: string | null;
//   size?: string | null;
// }

// interface CreateOrderInput {
//   customerId: string;
//   customerName: string;
//   customerEmail: string;
//   customerPhone: string;
//   customerAddress: string;
//   customerCity?: string;
//   customerCountry?: string;
//   customerPostalCode?: string;
//   storeId: string;
//   items: CreateOrderItemInput[];
//   paymentMethod: "cod" | "jazzcash" | "easypaisa" | "bank_transfer";
//   notes?: string;
// }

// export const storeOrderService = {

//   // âœ… Create order
//   async createOrder(input: CreateOrderInput) {
//     const {
//       customerId,
//       customerName,
//       customerEmail,
//       customerPhone,
//       customerAddress,
//       customerCity,
//       customerCountry,
//       customerPostalCode,
//       storeId,
//       items,
//       paymentMethod,
//       notes,
//     } = input;

//     // Validate store
//     const store = await createstoreRepository.findById(storeId);
//     if (!store) throw new ApiError(404, "Store not found");

//     // Validate and populate items
//     const populatedItems: Omit<
//       StoreOrderItem,
//       "_id" | "orderId" | "createdAt" | "updatedAt"
//     >[] = [];

//     let totalAmount = 0;

//     for (const item of items) {
//       if (!item.productId || !item.quantity || item.quantity <= 0) {
//         throw new ApiError(
//           400,
//           "Each item must have a valid productId and quantity"
//         );
//       }

//       // Fetch product
//       const product = await storeProductRepository.findById(item.productId);

//       if (!product || product.storeId !== storeId) {
//         throw new ApiError(
//           404,
//           `Product ${item.productId} not found in this store`
//         );
//       }

//       const finalPrice = Number(product.finalPrice ?? product.productPrice);
//       totalAmount += finalPrice * item.quantity;

//       populatedItems.push({
//         productId: product._id,
//         productName: product.productName,
//         productImages: product.productImages,
//         quantity: item.quantity,
//         color:
//           product.productColors && product.productColors.length > 0
//             ? (item.color ?? null)
//             : null,
//         size:
//           product.productSizes && product.productSizes.length > 0
//             ? (item.size ?? null)
//             : null,
//         itemStatus: "pending",
//         itemPaymentStatus: "pending",
//       });
//     }

//     const shippingCost = 0;
//     const finalAmount = totalAmount + shippingCost;

//     // Create order + items in transaction
//     const order = await storeOrderRepository.create(
//       {
//         customerId,
//         customerName,
//         customerEmail,
//         customerPhone,
//         customerAddress,
//         customerCity,
//         customerCountry,
//         customerPostalCode,
//         storeId,
//         storeOwnerId: store.ownerId,
//         totalAmount: totalAmount.toFixed(2),
//         shippingCost: shippingCost.toFixed(2),
//         finalAmount: finalAmount.toFixed(2),
//         paymentMethod,
//         paymentStatus: "pending",
//         orderStatus: "pending",
//         notes,
//       },
//       populatedItems
//     );

//     // Mark notification sent
//     await storeOrderRepository.markNotified(order._id);

//     return order;
//   },

//   // âœ… Get store orders
//   async getStoreOrders(
//     storeId: string,
//     page: number,
//     limit: number
//   ) {
//     const store = await createstoreRepository.findById(storeId);
//     if (!store) throw new ApiError(404, "Store not found");

//     return await storeOrderRepository.findByStoreId(storeId, page, limit);
//   },

//   // âœ… Get order by ID
//   async getOrderById(orderId: string) {
//     const order = await storeOrderRepository.findById(orderId);
//     if (!order) throw new ApiError(404, "Order not found");
//     return order;
//   },

//   // âœ… Get order by ID and store
//   async getOrderByIdAndStore(orderId: string, storeId: string) {
//     const order = await storeOrderRepository.findByIdAndStore(
//       orderId,
//       storeId
//     );
//     if (!order) throw new ApiError(404, "Order not found");
//     return order;
//   },

//   // âœ… Update order status
//   async updateOrderStatus(
//     orderId: string,
//     orderStatus: StoreOrderItem["itemStatus"],
//     trackingNumber?: string
//   ) {
//     const order = await storeOrderRepository.updateOrderStatus(
//       orderId,
//       orderStatus,
//       trackingNumber
//     );
//     if (!order) throw new ApiError(404, "Order not found");
//     return order;
//   },

//   // âœ… Get customer orders
//   async getCustomerOrders(
//     customerId: string,
//     page: number,
//     limit: number,
//     storeId?: string
//   ) {
//     if (storeId) {
//       const store = await createstoreRepository.findById(storeId);
//       if (!store) throw new ApiError(404, "Store not found");
//     }

//     return await storeOrderRepository.findByCustomerId(
//       customerId,
//       page,
//       limit,
//       storeId
//     );
//   },

//   // âœ… Cancel order by customer
//   async cancelOrderByCustomer(
//     orderId: string,
//     storeId: string,
//     customerId: string
//   ) {
//     const order = await storeOrderRepository.findByIdAndStore(
//       orderId,
//       storeId
//     );

//     if (!order) throw new ApiError(404, "Order not found");

//     if (order.customerId !== customerId) {
//       throw new ApiError(403, "You are not the customer of this order");
//     }

//     if (order.orderStatus !== "pending") {
//       throw new ApiError(400, "You can only cancel pending orders");
//     }

//     const cancelled = await storeOrderRepository.cancelOrder(orderId);
//     if (!cancelled) throw new ApiError(400, "Order could not be cancelled");

//     return cancelled;
//   },

//   // âœ… Delete order by owner
//   async deleteOrderByOwner(
//     orderId: string,
//     storeId: string,
//     ownerId: string
//   ) {
//     const order = await storeOrderRepository.findByIdAndStore(
//       orderId,
//       storeId
//     );

//     if (!order) throw new ApiError(404, "Order not found");

//     if (order.storeOwnerId !== ownerId) {
//       throw new ApiError(403, "Unauthorized access");
//     }

//     const deleted = await storeOrderRepository.deleteOrder(orderId, storeId);
//     if (!deleted) throw new ApiError(400, "Order could not be deleted");

//     return deleted;
//   },

//   // âœ… Update item status
//   async updateItemStatus(
//     orderId: string,
//     storeId: string,
//     itemId: string,
//     itemStatus?: StoreOrderItem["itemStatus"],
//     itemPaymentStatus?: StoreOrderItem["itemPaymentStatus"]
//   ) {
//     if (!itemStatus && !itemPaymentStatus) {
//       throw new ApiError(
//         400,
//         "Provide itemStatus or itemPaymentStatus to update"
//       );
//     }

//     const validItemStatuses = [
//       "pending",
//       "processing",
//       "shipped",
//       "delivered",
//       "cancelled",
//     ];
//     const validPaymentStatuses = [
//       "pending",
//       "completed",
//       "failed",
//       "refunded",
//     ];

//     if (itemStatus && !validItemStatuses.includes(itemStatus)) {
//       throw new ApiError(
//         400,
//         `Invalid itemStatus. Must be one of: ${validItemStatuses.join(", ")}`
//       );
//     }

//     if (
//       itemPaymentStatus &&
//       !validPaymentStatuses.includes(itemPaymentStatus)
//     ) {
//       throw new ApiError(
//         400,
//         `Invalid itemPaymentStatus. Must be one of: ${validPaymentStatuses.join(", ")}`
//       );
//     }

//     const updatedItem = await storeOrderRepository.updateItemStatus(
//       itemId,
//       orderId,
//       storeId,
//       itemStatus,
//       itemPaymentStatus
//     );

//     if (!updatedItem) throw new ApiError(404, "Order or item not found");

//     // Get full order with all items
//     const order = await storeOrderRepository.findById(orderId);

//     return { order, updatedItem };
//   },
// };