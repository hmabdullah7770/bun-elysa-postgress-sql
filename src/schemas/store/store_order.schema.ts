// src/db/schema/store_order.schema.ts
import {
  pgTable, uuid, varchar, text, numeric,
  boolean, timestamp, pgEnum, integer, index,
} from "drizzle-orm/pg-core";
// import { relations } from "drizzle-orm";
 import { users } from "../user.schema";
 import { createStore } from "./createStore.schema";

// ── Enums (unchanged)
export const orderStatusEnum = pgEnum("order_status", [
  "pending", "processing", "shipped", "delivered", "cancelled",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending", "completed", "failed", "refunded",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "cod", "jazzcash", "easypaisa", "bank_transfer",
]);
export const itemStatusEnum = pgEnum("item_status", [
  "pending", "processing", "shipped", "delivered", "cancelled",
]);
export const itemPaymentStatusEnum = pgEnum("item_payment_status", [
  "pending", "completed", "failed", "refunded",
]);

// ── Order Table
export const store_order = pgTable(
  "store_order",
  {
    _id: uuid("_id").defaultRandom().primaryKey(),

    // ✅ Customer — FK to users
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users._id, { onDelete: "restrict" }),
    customerName: varchar("customer_name", { length: 255 }).notNull(),
    customerEmail: varchar("customer_email", { length: 255 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 50 }).notNull(),
    customerAddress: text("customer_address").notNull(),
    customerCity: varchar("customer_city", { length: 100 }),
    customerCountry: varchar("customer_country", { length: 100 }),
    customerPostalCode: varchar("customer_postal_code", { length: 20 }),

    // ✅ Store — FK to createStore
    storeId: uuid("store_id")
      .notNull()
      .references(() => createStore._id, { onDelete: "cascade" }),

    // ✅ Store Owner — FK to users (separate named relation)
    storeOwnerId: uuid("store_owner_id")
      .notNull()
      .references(() => users._id, { onDelete: "restrict" }),

    // Order amounts
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    shippingCost: numeric("shipping_cost", { precision: 10, scale: 2 }).notNull().default("0"),
    finalAmount: numeric("final_amount", { precision: 10, scale: 2 }).notNull(),

    // Status
    orderStatus: orderStatusEnum("order_status").notNull().default("pending"),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("cod"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),

    trackingNumber: varchar("tracking_number", { length: 255 }),
    notes: text("notes"),

    // Notification
    isNotified: boolean("is_notified").default(false),
    notificationSentAt: timestamp("notification_sent_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    customerIdx: index("store_order_customer_idx").on(table.customerId),
    storeIdx: index("store_order_store_idx").on(table.storeId),
    storeOwnerIdx: index("store_order_store_owner_idx").on(table.storeOwnerId),
    orderStatusIdx: index("store_order_status_idx").on(table.orderStatus),
    paymentStatusIdx: index("store_order_payment_status_idx").on(table.paymentStatus),
    createdAtIdx: index("store_order_created_at_idx").on(table.createdAt),
  })
);

// ── Order Item Table
export const store_order_item = pgTable(
  "store_order_item",
  {
    _id: uuid("_id").defaultRandom().primaryKey(),

    orderId: uuid("order_id")
      .notNull()
      .references(() => store_order._id, { onDelete: "cascade" }),

    productId: uuid("product_id").notNull(),
    productName: varchar("product_name", { length: 255 }).notNull(),
    productImages: text("product_images").array().notNull().default([]),

    quantity: integer("quantity").notNull().default(1),
    color: varchar("color", { length: 100 }),
    size: varchar("size", { length: 50 }),

    itemStatus: itemStatusEnum("item_status").notNull().default("pending"),
    itemPaymentStatus: itemPaymentStatusEnum("item_payment_status").notNull().default("pending"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    orderIdx: index("store_order_item_order_idx").on(table.orderId),
    productIdx: index("store_order_item_product_idx").on(table.productId),
    itemStatusIdx: index("store_order_item_status_idx").on(table.itemStatus),
  })
);


// relation commented
// ── Relations
// export const storeOrderRelations = relations(store_order, ({ one, many }) => ({
//   // one order has many items
//   items: many(store_order_item),

//   // ✅ the user who placed the order
//   customer: one(users, {
//     fields: [store_order.customerId],
//     references: [users._id],
//     relationName: "customer_orders",       // named — users is referenced twice
//   }),

//   // ✅ the store this order belongs to
//   store: one(createStore, {
//     fields: [store_order.storeId],
//     references: [createStore._id],
//   }),

//   // ✅ the user who owns the store
//   storeOwner: one(users, {
//     fields: [store_order.storeOwnerId],
//     references: [users._id],
//     relationName: "owned_store_orders",    // named — users is referenced twice
//   }),
// }));

// relation commented
// export const storeOrderItemRelations = relations(store_order_item, ({ one }) => ({
//   order: one(store_order, {
//     fields: [store_order_item.orderId],
//     references: [store_order._id],
//   }),
// }));

// ── Types
export type StoreOrder = typeof store_order.$inferSelect;
export type NewStoreOrder = typeof store_order.$inferInsert;
export type StoreOrderItem = typeof store_order_item.$inferSelect;
export type NewStoreOrderItem = typeof store_order_item.$inferInsert;
export type StoreOrderWithItems = StoreOrder & { items: StoreOrderItem[] };



// // src/db/schema/store_order.schema.ts
// import {
//   pgTable,
//   uuid,
//   varchar,
//   text,
//   numeric,
//   boolean,
//   timestamp,
//   pgEnum,
//   integer,
//   index,
// } from "drizzle-orm/pg-core";
// import { relations } from "drizzle-orm";

// // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Enums
// export const orderStatusEnum = pgEnum("order_status", [
//   "pending",
//   "processing",
//   "shipped",
//   "delivered",
//   "cancelled",
// ]);

// export const paymentStatusEnum = pgEnum("payment_status", [
//   "pending",
//   "completed",
//   "failed",
//   "refunded",
// ]);

// export const paymentMethodEnum = pgEnum("payment_method", [
//   "cod",
//   "jazzcash",
//   "easypaisa",
//   "bank_transfer",
// ]);

// export const itemStatusEnum = pgEnum("item_status", [
//   "pending",
//   "processing",
//   "shipped",
//   "delivered",
//   "cancelled",
// ]);

// export const itemPaymentStatusEnum = pgEnum("item_payment_status", [
//   "pending",
//   "completed",
//   "failed",
//   "refunded",
// ]);

// // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Order Table
// export const store_order = pgTable(
//   "store_order",
//   {
//     _id: uuid("_id").defaultRandom().primaryKey(),

//     // Customer info
//     customerId: uuid("customer_id").notNull(),
//     customerName: varchar("customer_name", { length: 255 }).notNull(),
//     customerEmail: varchar("customer_email", { length: 255 }).notNull(),
//     customerPhone: varchar("customer_phone", { length: 50 }).notNull(),
//     customerAddress: text("customer_address").notNull(),
//     customerCity: varchar("customer_city", { length: 100 }),
//     customerCountry: varchar("customer_country", { length: 100 }),
//     customerPostalCode: varchar("customer_postal_code", { length: 20 }),

//     // Store info
//     storeId: uuid("store_id").notNull(),
//     storeOwnerId: uuid("store_owner_id").notNull(),

//     // Order amounts
//     totalAmount: numeric("total_amount", {
//       precision: 10,
//       scale: 2,
//     }).notNull(),
//     shippingCost: numeric("shipping_cost", {
//       precision: 10,
//       scale: 2,
//     }).notNull().default("0"),
//     finalAmount: numeric("final_amount", {
//       precision: 10,
//       scale: 2,
//     }).notNull(),

//     // Status
//     orderStatus: orderStatusEnum("order_status").notNull().default("pending"),
//     paymentMethod: paymentMethodEnum("payment_method").notNull().default("cod"),
//     paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),

//     trackingNumber: varchar("tracking_number", { length: 255 }),
//     notes: text("notes"),

//     // Notification
//     isNotified: boolean("is_notified").default(false),
//     notificationSentAt: timestamp("notification_sent_at"),

//     createdAt: timestamp("created_at").defaultNow().notNull(),
//     updatedAt: timestamp("updated_at")
//       .defaultNow()
//       .notNull()
//       .$onUpdate(() => new Date()),
//   },
//   (table) => ({
//     customerIdx: index("store_order_customer_idx").on(table.customerId),
//     storeIdx: index("store_order_store_idx").on(table.storeId),
//     storeOwnerIdx: index("store_order_store_owner_idx").on(table.storeOwnerId),
//     orderStatusIdx: index("store_order_status_idx").on(table.orderStatus),
//     paymentStatusIdx: index("store_order_payment_status_idx").on(table.paymentStatus),
//     createdAtIdx: index("store_order_created_at_idx").on(table.createdAt),
//   })
// );

// // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Order Item Table (separate ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â instead of JSONB)
// export const store_order_item = pgTable(
//   "store_order_item",
//   {
//     _id: uuid("_id").defaultRandom().primaryKey(),

//     // Relation to order
//     orderId: uuid("order_id")
//       .notNull()
//       .references(() => store_order._id, { onDelete: "cascade" }),

//     // Product snapshot (store at time of order)
//     productId: uuid("product_id").notNull(),
//     productName: varchar("product_name", { length: 255 }).notNull(),
//     productImages: text("product_images").array().notNull().default([]),

//     quantity: integer("quantity").notNull().default(1),
//     color: varchar("color", { length: 100 }),
//     size: varchar("size", { length: 50 }),

//     // Per item status
//     itemStatus: itemStatusEnum("item_status").notNull().default("pending"),
//     itemPaymentStatus: itemPaymentStatusEnum("item_payment_status")
//       .notNull()
//       .default("pending"),

//     createdAt: timestamp("created_at").defaultNow().notNull(),
//     updatedAt: timestamp("updated_at")
//       .defaultNow()
//       .notNull()
//       .$onUpdate(() => new Date()),
//   },
//   (table) => ({
//     orderIdx: index("store_order_item_order_idx").on(table.orderId),
//     productIdx: index("store_order_item_product_idx").on(table.productId),
//     itemStatusIdx: index("store_order_item_status_idx").on(table.itemStatus),
//   })
// );

// // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Relations
// export const storeOrderRelations = relations(store_order, ({ many }) => ({
//   items: many(store_order_item),
// }));

// export const storeOrderItemRelations = relations(
//   store_order_item,
//   ({ one }) => ({
//     order: one(store_order, {
//       fields: [store_order_item.orderId],
//       references: [store_order._id],
//     }),
//   })
// );

// // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Types
// export type StoreOrder = typeof store_order.$inferSelect;
// export type NewStoreOrder = typeof store_order.$inferInsert;
// export type StoreOrderItem = typeof store_order_item.$inferSelect;
// export type NewStoreOrderItem = typeof store_order_item.$inferInsert;
// export type StoreOrderWithItems = StoreOrder & { items: StoreOrderItem[] };

