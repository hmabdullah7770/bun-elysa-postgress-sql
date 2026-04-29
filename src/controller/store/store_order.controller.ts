// src/controllers/store/store_order.controller.ts
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { storeOrderService } from "../../services/store/store_order.service";

export const storeOrderController = {

  // âœ… Create order (Customer)
  async createOrder(body: any, user: any) {
    const {
      storeId,
      items,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerCity,
      customerCountry,
      customerPostalCode,
      paymentMethod,
      notes,
    } = body;

    if (!storeId || !items || !customerName || !customerEmail || !customerPhone || !customerAddress) {
      throw new ApiError(400, "All required fields must be provided");
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "Items must be a non-empty array");
    }

    const order = await storeOrderService.createOrder({
      customerId: user._id,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerCity,
      customerCountry,
      customerPostalCode,
      storeId,
      items,
      paymentMethod: paymentMethod || "cod",
      notes,
    });

    return new ApiResponse(201, order, "Order created successfully");
  },

  // âœ… Get store orders (Store Owner)
  async getStoreOrders(
    params: { storeId: string },
    query: { page?: string; limit?: string },
    store: any
  ) {
    const result = await storeOrderService.getStoreOrders(
      params.storeId,
      Number(query.page || "1"),
      Number(query.limit || "10")
    );

    return new ApiResponse(200, result, "Store orders retrieved successfully");
  },

  // âœ… Get order by ID
  async getOrderById(params: { orderId: string }, user: any) {
    const order = await storeOrderService.getOrderById(params.orderId);
    return new ApiResponse(200, order, "Order retrieved successfully");
  },

  // âœ… Update order status (Store Owner)
  async updateOrderStatus(
    params: { orderId: string },
    body: { orderStatus: string; trackingNumber?: string },
    store: any
  ) {
    if (!body.orderStatus) {
      throw new ApiError(400, "Order status is required");
    }

    const order = await storeOrderService.updateOrderStatus(
      params.orderId,
      body.orderStatus as any,
      body.trackingNumber
    );

    return new ApiResponse(200, order, "Order status updated successfully");
  },

  // âœ… Get customer orders â€” all stores (dynamic, optional storeId as query param)
  // Mirrors old getCustomerOrders
  async getCustomerOrders(
    query: { page?: string; limit?: string; storeId?: string },
    user: any
  ) {
    const result = await storeOrderService.getCustomerOrders(
      user._id,
      Number(query.page || "1"),
      Number(query.limit || "10"),
      query.storeId
    );

    const message = query.storeId
      ? "Orders from store retrieved successfully"
      : "Customer orders retrieved successfully";

    return new ApiResponse(200, result, message);
  },

  // âœ… Get customer orders from ONE specific store â€” returns storeInfo
  // Mirrors old getCustomerOrdersFromOneStore
  async getCustomerOrdersFromOneStore(
    params: { storeId: string },
    query: { page?: string; limit?: string },
    user: any
  ) {
    const result = await storeOrderService.getCustomerOrdersFromOneStore(
      user._id,
      params.storeId,
      Number(query.page || "1"),
      Number(query.limit || "10")
    );

    return new ApiResponse(
      200,
      result,
      `Orders from ${result.storeInfo.storeName} retrieved successfully`
    );
  },

  // âœ… Cancel order by customer (only pending orders)
  async cancelOrderByCustomer(
    params: { orderId: string; storeId: string },
    user: any
  ) {
    const order = await storeOrderService.cancelOrderByCustomer(
      params.orderId,
      params.storeId,
      user._id
    );

    return new ApiResponse(200, order, "Order cancelled successfully");
  },

  // âœ… Delete order by store owner (hard delete)
  async deleteOrderByOwner(
    params: { orderId: string; storeId: string },
    body: any,
    store: any
  ) {
    await storeOrderService.deleteOrderByOwner(
      params.orderId,
      params.storeId,
      store._id
    );

    return new ApiResponse(200, {}, "Order deleted successfully");
  },

  // âœ… Update individual item status (Store Owner)
  async updateItemStatus(
    params: { orderId: string; itemId: string },
    body: { itemStatus?: string; itemPaymentStatus?: string },
    store: any
  ) {
    if (!body.itemStatus && !body.itemPaymentStatus) {
      throw new ApiError(400, "Provide itemStatus or itemPaymentStatus to update");
    }

    const result = await storeOrderService.updateItemStatus(
      params.orderId,
      store._id,
      params.itemId,
      body.itemStatus as any,
      body.itemPaymentStatus as any
    );

    return new ApiResponse(200, result, "Item status updated successfully");
  },
};


// // src/controllers/store-order.controller.ts
// import { ApiError } from "../../utils/ApiError";
// import { ApiResponse } from "../../utils/ApiResponse";
// import { storeOrderService } from "../../services/store/store_order.service";

// export const storeOrderController = {

//   // âœ… Create order
//   async createOrder(body: any, user: any) {
//     const {
//       storeId,
//       items,
//       customerName,
//       customerEmail,
//       customerPhone,
//       customerAddress,
//       customerCity,
//       customerCountry,
//       customerPostalCode,
//       paymentMethod,
//       notes,
//     } = body;

//     if (
//       !storeId ||
//       !items ||
//       !customerName ||
//       !customerEmail ||
//       !customerPhone ||
//       !customerAddress
//     ) {
//       throw new ApiError(400, "All required fields must be provided");
//     }

//     if (!Array.isArray(items) || items.length === 0) {
//       throw new ApiError(400, "Items must be a non-empty array");
//     }

//     const order = await storeOrderService.createOrder({
//       customerId: user._id,
//       customerName,
//       customerEmail,
//       customerPhone,
//       customerAddress,
//       customerCity,
//       customerCountry,
//       customerPostalCode,
//       storeId,
//       items,
//       paymentMethod: paymentMethod || "cod",
//       notes,
//     });

//     return new ApiResponse(201, order, "Order created successfully");
//   },

//   // âœ… Get store orders
//   async getStoreOrders(
//     params: { storeId: string },
//     query: { page?: string; limit?: string },
//     store: any
//   ) {
//     const result = await storeOrderService.getStoreOrders(
//       params.storeId,
//       Number(query.page || "1"),
//       Number(query.limit || "10")
//     );

//     return new ApiResponse(
//       200,
//       result,
//       "Store orders retrieved successfully"
//     );
//   },

//   // âœ… Get order by ID
//   async getOrderById(
//     params: { orderId: string },
//     user: any
//   ) {
//     const order = await storeOrderService.getOrderById(params.orderId);

//     return new ApiResponse(200, order, "Order retrieved successfully");
//   },

//   // âœ… Update order status
//   async updateOrderStatus(
//     params: { orderId: string },
//     body: { orderStatus: string; trackingNumber?: string },
//     store: any
//   ) {
//     if (!body.orderStatus) {
//       throw new ApiError(400, "Order status is required");
//     }

//     const order = await storeOrderService.updateOrderStatus(
//       params.orderId,
//       body.orderStatus as any,
//       body.trackingNumber
//     );

//     return new ApiResponse(
//       200,
//       order,
//       "Order status updated successfully"
//     );
//   },

//   // âœ… Get customer orders
//   async getCustomerOrders(
//     query: { page?: string; limit?: string; storeId?: string },
//     user: any
//   ) {
//     const result = await storeOrderService.getCustomerOrders(
//       user._id,
//       Number(query.page || "1"),
//       Number(query.limit || "10"),
//       query.storeId
//     );

//     const message = query.storeId
//       ? "Orders from store retrieved successfully"
//       : "Customer orders retrieved successfully";

//     return new ApiResponse(200, result, message);
//   },

//   // âœ… Cancel order by customer
//   async cancelOrderByCustomer(
//     params: { orderId: string; storeId: string },
//     user: any
//   ) {
//     const order = await storeOrderService.cancelOrderByCustomer(
//       params.orderId,
//       params.storeId,
//       user._id
//     );

//     return new ApiResponse(200, order, "Order cancelled successfully");
//   },

//   // âœ… Delete order by owner
//   async deleteOrderByOwner(
//     params: { orderId: string; storeId: string },
//     user: any,
//     store: any
//   ) {
//     await storeOrderService.deleteOrderByOwner(
//       params.orderId,
//       params.storeId,
//       user._id
//     );

//     return new ApiResponse(200, {}, "Order deleted successfully");
//   },

//   // âœ… Update item status
//   async updateItemStatus(
//     params: { orderId: string; itemId: string },
//     body: { itemStatus?: string; itemPaymentStatus?: string },
//     store: any
//   ) {
//     if (!body.itemStatus && !body.itemPaymentStatus) {
//       throw new ApiError(
//         400,
//         "Provide itemStatus or itemPaymentStatus to update"
//       );
//     }

//     const result = await storeOrderService.updateItemStatus(
//       params.orderId,
//       store._id,
//       params.itemId,
//       body.itemStatus as any,
//       body.itemPaymentStatus as any
//     );

//     return new ApiResponse(
//       200,
//       result,
//       "Item status updated successfully"
//     );
//   },
// };