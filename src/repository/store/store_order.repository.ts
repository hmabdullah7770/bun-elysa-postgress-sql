// src/repositories/store-order.repository.ts
import { and, eq, desc, sql, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  store_order,
  store_order_item,
  type StoreOrder,
  type NewStoreOrder,
  type StoreOrderItem,
  type NewStoreOrderItem,
  type StoreOrderWithItems,
} from "../../schemas/store/store_order.schema";

export const storeOrderRepository = {

  // Ã¢Å“â€¦ Create order with items (transaction)
  async create(
    orderData: NewStoreOrder,
    itemsData: Omit<NewStoreOrderItem, "orderId">[]
  ): Promise<StoreOrderWithItems> {
    return await db.transaction(async (tx) => {
      // 1. Insert order
      const [order] = await tx
        .insert(store_order)
        .values(orderData)
        .returning();

      if (!order || !order._id) {
        throw new Error("Failed to create order");
      }

      // 2. Insert all items with orderId
      const items = await tx
        .insert(store_order_item)
        .values(
          itemsData.map((item) => ({
            ...item,
            orderId: order._id,
          }))
        )
        .returning();

      return { ...(order as StoreOrder), items };
    });
  },

  // Ã¢Å“â€¦ Find order by _id with items
  async findById(_id: string): Promise<StoreOrderWithItems | undefined> {
    const order = await db.query.store_order.findFirst({
      where: eq(store_order._id, _id),
      with: {
        items: true,
      },
    });
    return order;
  },

  // Ã¢Å“â€¦ Find order by _id and storeId with items
  async findByIdAndStore(
    _id: string,
    storeId: string
  ): Promise<StoreOrderWithItems | undefined> {
    const order = await db.query.store_order.findFirst({
      where: and(
        eq(store_order._id, _id),
        eq(store_order.storeId, storeId)
      ),
      with: {
        items: true,
      },
    });
    return order;
  },

  // Ã¢Å“â€¦ Get all orders for a store with pagination
  async findByStoreId(
    storeId: string,
    page: number,
    limit: number
  ): Promise<{ orders: StoreOrderWithItems[]; total: number; totalPages: number }> {
    const offset = (page - 1) * limit;

    const orders = await db.query.store_order.findMany({
      where: eq(store_order.storeId, storeId),
      orderBy: desc(store_order.createdAt),
      limit,
      offset,
      with: {
        items: true,
      },
    });

    const [{ count } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(store_order)
      .where(eq(store_order.storeId, storeId));

    const total = Number(count);

    return {
      orders,
      total,
      totalPages: Math.ceil(total / limit),
    };
  },

  // Ã¢Å“â€¦ Get customer orders with pagination (all createStore or one store)
  async findByCustomerId(
    customerId: string,
    page: number,
    limit: number,
    storeId?: string
  ): Promise<{ orders: StoreOrderWithItems[]; total: number; totalPages: number }> {
    const offset = (page - 1) * limit;

    const whereClause = storeId
      ? and(
          eq(store_order.customerId, customerId),
          eq(store_order.storeId, storeId)
        )
      : eq(store_order.customerId, customerId);

    const orders = await db.query.store_order.findMany({
      where: whereClause,
      orderBy: desc(store_order.createdAt),
      limit,
      offset,
      with: {
        items: true,
      },
    });

    const [{ count } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(store_order)
      .where(whereClause);

    const total = Number(count);

    return {
      orders,
      total,
      totalPages: Math.ceil(total / limit),
    };
  },

  // Ã¢Å“â€¦ Update order status
  async updateOrderStatus(
    _id: string,
    orderStatus: StoreOrder["orderStatus"],
    trackingNumber?: string
  ): Promise<StoreOrderWithItems | undefined> {
    const updateData: Partial<StoreOrder> = { orderStatus };
    if (trackingNumber) updateData.trackingNumber = trackingNumber;

    const [updated] = await db
      .update(store_order)
      .set(updateData)
      .where(eq(store_order._id, _id))
      .returning();

    if (!updated) return undefined;

    return await this.findById(updated._id);
  },

  // Ã¢Å“â€¦ Update individual item status Ã¢â‚¬â€ CLEAN with two tables
  async updateItemStatus(
    itemId: string,
    orderId: string,
    storeId: string,
    itemStatus?: StoreOrderItem["itemStatus"],
    itemPaymentStatus?: StoreOrderItem["itemPaymentStatus"]
  ): Promise<StoreOrderItem | undefined> {
    // First verify order belongs to store
    const order = await db.query.store_order.findFirst({
      where: and(
        eq(store_order._id, orderId),
        eq(store_order.storeId, storeId)
      ),
    });

    if (!order) return undefined;

    const updateData: Partial<StoreOrderItem> = {};
    if (itemStatus) updateData.itemStatus = itemStatus;
    if (itemPaymentStatus) updateData.itemPaymentStatus = itemPaymentStatus;

    const [updatedItem] = await db
      .update(store_order_item)
      .set(updateData)
      .where(
        and(
          eq(store_order_item._id, itemId),
          eq(store_order_item.orderId, orderId)
        )
      )
      .returning();

    return updatedItem;
  },

  // Ã¢Å“â€¦ Cancel order
  async cancelOrder(
    _id: string
  ): Promise<StoreOrderWithItems | undefined> {
    const [updated] = await db
      .update(store_order)
      .set({ orderStatus: "cancelled" })
      .where(
        and(
          eq(store_order._id, _id),
          eq(store_order.orderStatus, "pending")
        )
      )
      .returning();

    if (!updated) return undefined;

    return await this.findById(updated._id);
  },

  // Ã¢Å“â€¦ Hard delete order (cascade deletes items automatically)
  async deleteOrder(
    _id: string,
    storeId: string
  ): Promise<boolean> {
    const result = await db
      .delete(store_order)
      .where(
        and(
          eq(store_order._id, _id),
          eq(store_order.storeId, storeId)
        )
      )
      .returning();

    return result.length > 0;
  },

  // Ã¢Å“â€¦ Mark notification sent
  async markNotified(_id: string): Promise<void> {
    await db
      .update(store_order)
      .set({
        isNotified: true,
        notificationSentAt: new Date(),
      })
      .where(eq(store_order._id, _id));
  },
};


// // src/repositories/store-order.repository.ts
// import { and, eq, desc, sql, inArray } from "drizzle-orm";
// import { db } from "../../db";
// import {
//   store_order,
//   store_order_item,
//   type StoreOrder,
//   type NewStoreOrder,
//   type StoreOrderItem,
//   type NewStoreOrderItem,
//   type StoreOrderWithItems,
// } from "../../schemas/store/store_order.schema";

// export const storeOrderRepository = {

//   // Ã¢Å“â€¦ Create order with items (transaction)
//   async create(
//     orderData: NewStoreOrder,
//     itemsData: Omit<NewStoreOrderItem, "orderId">[]
//   ): Promise<StoreOrderWithItems> {
//     return await db.transaction(async (tx) => {
//       // 1. Insert order
//       const [order] = await tx
//         .insert(store_order)
//         .values(orderData)
//         .returning();

//       if (!order || !order._id) {
//         throw new Error("Failed to create order");
//       }

//       // 2. Insert all items with orderId
//       const items = await tx
//         .insert(store_order_item)
//         .values(
//           itemsData.map((item) => ({
//             ...item,
//             orderId: order._id,
//           }))
//         )
//         .returning();

//       return { ...(order as StoreOrder), items };
//     });
//   },

//   // Ã¢Å“â€¦ Find order by _id with items
//   async findById(_id: string): Promise<StoreOrderWithItems | undefined> {
//     const order = await db.query.store_order.findFirst({
//       where: eq(store_order._id, _id),
//       with: {
//         items: true,
//       },
//     });
//     return order;
//   },

//   // Ã¢Å“â€¦ Find order by _id and storeId with items
//   async findByIdAndStore(
//     _id: string,
//     storeId: string
//   ): Promise<StoreOrderWithItems | undefined> {
//     const order = await db.query.store_order.findFirst({
//       where: and(
//         eq(store_order._id, _id),
//         eq(store_order.storeId, storeId)
//       ),
//       with: {
//         items: true,
//       },
//     });
//     return order;
//   },

//   // Ã¢Å“â€¦ Get all orders for a store with pagination
//   async findByStoreId(
//     storeId: string,
//     page: number,
//     limit: number
//   ): Promise<{ orders: StoreOrderWithItems[]; total: number; totalPages: number }> {
//     const offset = (page - 1) * limit;

//     const orders = await db.query.store_order.findMany({
//       where: eq(store_order.storeId, storeId),
//       orderBy: desc(store_order.createdAt),
//       limit,
//       offset,
//       with: {
//         items: true,
//       },
//     });

//     const [{ count } = { count: 0 }] = await db
//       .select({ count: sql<number>`count(*)` })
//       .from(store_order)
//       .where(eq(store_order.storeId, storeId));

//     const total = Number(count);

//     return {
//       orders,
//       total,
//       totalPages: Math.ceil(total / limit),
//     };
//   },

//   // Ã¢Å“â€¦ Get customer orders with pagination (all createStore or one store)
//   async findByCustomerId(
//     customerId: string,
//     page: number,
//     limit: number,
//     storeId?: string
//   ): Promise<{ orders: StoreOrderWithItems[]; total: number; totalPages: number }> {
//     const offset = (page - 1) * limit;

//     const whereClause = storeId
//       ? and(
//           eq(store_order.customerId, customerId),
//           eq(store_order.storeId, storeId)
//         )
//       : eq(store_order.customerId, customerId);

//     const orders = await db.query.store_order.findMany({
//       where: whereClause,
//       orderBy: desc(store_order.createdAt),
//       limit,
//       offset,
//       with: {
//         items: true,
//       },
//     });

//     const [{ count } = { count: 0 }] = await db
//       .select({ count: sql<number>`count(*)` })
//       .from(store_order)
//       .where(whereClause);

//     const total = Number(count);

//     return {
//       orders,
//       total,
//       totalPages: Math.ceil(total / limit),
//     };
//   },

//   // Ã¢Å“â€¦ Update order status
//   async updateOrderStatus(
//     _id: string,
//     orderStatus: StoreOrder["orderStatus"],
//     trackingNumber?: string
//   ): Promise<StoreOrderWithItems | undefined> {
//     const updateData: Partial<StoreOrder> = { orderStatus };
//     if (trackingNumber) updateData.trackingNumber = trackingNumber;

//     const [updated] = await db
//       .update(store_order)
//       .set(updateData)
//       .where(eq(store_order._id, _id))
//       .returning();

//     if (!updated) return undefined;

//     return await this.findById(updated._id);
//   },

//   // Ã¢Å“â€¦ Update individual item status Ã¢â‚¬â€ CLEAN with two tables
//   async updateItemStatus(
//     itemId: string,
//     orderId: string,
//     storeId: string,
//     itemStatus?: StoreOrderItem["itemStatus"],
//     itemPaymentStatus?: StoreOrderItem["itemPaymentStatus"]
//   ): Promise<StoreOrderItem | undefined> {
//     // First verify order belongs to store
//     const order = await db.query.store_order.findFirst({
//       where: and(
//         eq(store_order._id, orderId),
//         eq(store_order.storeId, storeId)
//       ),
//     });

//     if (!order) return undefined;

//     const updateData: Partial<StoreOrderItem> = {};
//     if (itemStatus) updateData.itemStatus = itemStatus;
//     if (itemPaymentStatus) updateData.itemPaymentStatus = itemPaymentStatus;

//     const [updatedItem] = await db
//       .update(store_order_item)
//       .set(updateData)
//       .where(
//         and(
//           eq(store_order_item._id, itemId),
//           eq(store_order_item.orderId, orderId)
//         )
//       )
//       .returning();

//     return updatedItem;
//   },

//   // Ã¢Å“â€¦ Cancel order
//   async cancelOrder(
//     _id: string
//   ): Promise<StoreOrderWithItems | undefined> {
//     const [updated] = await db
//       .update(store_order)
//       .set({ orderStatus: "cancelled" })
//       .where(
//         and(
//           eq(store_order._id, _id),
//           eq(store_order.orderStatus, "pending")
//         )
//       )
//       .returning();

//     if (!updated) return undefined;

//     return await this.findById(updated._id);
//   },

//   // Ã¢Å“â€¦ Hard delete order (cascade deletes items automatically)
//   async deleteOrder(
//     _id: string,
//     storeId: string
//   ): Promise<boolean> {
//     const result = await db
//       .delete(store_order)
//       .where(
//         and(
//           eq(store_order._id, _id),
//           eq(store_order.storeId, storeId)
//         )
//       )
//       .returning();

//     return result.length > 0;
//   },

//   // Ã¢Å“â€¦ Mark notification sent
//   async markNotified(_id: string): Promise<void> {
//     await db
//       .update(store_order)
//       .set({
//         isNotified: true,
//         notificationSentAt: new Date(),
//       })
//       .where(eq(store_order._id, _id));
//   },
// };
