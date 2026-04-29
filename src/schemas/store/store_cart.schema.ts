// src/db/schema/store_cart.schema.ts
import {
  pgTable,
  bigserial,
  bigint,
  integer,
  varchar,
  timestamp,
  index,
   uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const store_cart = pgTable("store_cart", {
  _id: bigserial("_id", { mode: "number" }).primaryKey(),

  userId: uuid("user_id" ),

  storeId: uuid("store_id"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
    .$onUpdate(() => new Date()),
}, (table) => ({
  userStoreUnique: uniqueIndex("store_cart_user_store_unique")
    .on(table.userId, table.storeId),
  userIdx: index("store_cart_user_idx").on(table.userId),
  storeIdx: index("store_cart_store_idx").on(table.storeId),
}));

export const store_cart_item = pgTable("store_cart_item", {
  _id: bigserial("_id", { mode: "number" }).primaryKey(),

  storeCartId: bigint("store_cart_id", { mode: "number" })
    .notNull()
    .references(() => store_cart._id, { onDelete: "cascade" }),

  productId: uuid("product_id"),

  quantity: integer("quantity").notNull().default(1),

  colorId: bigint("color_id", { mode: "number" }),
  colorValue: varchar("color_value", { length: 50 }),
  colorIndex: integer("color_index"),

  size: varchar("size", { length: 50 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
    .$onUpdate(() => new Date()),
}, (table) => ({
  storeCartIdx: index("store_cart_item_cart_idx").on(table.storeCartId),
  productIdx: index("store_cart_item_product_idx").on(table.productId),
}));

// Relations
export const storeCartRelations = relations(store_cart, ({ many }) => ({
  items: many(store_cart_item),
}));

export const storeCartItemRelations = relations(store_cart_item, ({ one }) => ({
  cart: one(store_cart, {
    fields: [store_cart_item.storeCartId],
    references: [store_cart._id],
  }),
}));

// Types
export type StoreCart = typeof store_cart.$inferSelect;
export type NewStoreCart = typeof store_cart.$inferInsert;
export type StoreCartItem = typeof store_cart_item.$inferSelect;
export type NewStoreCartItem = typeof store_cart_item.$inferInsert;

// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ADD THIS ONE LINE
export type StoreCartWithItems = StoreCart & { items: StoreCartItem[] };
