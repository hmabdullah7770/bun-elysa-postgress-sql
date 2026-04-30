// src/schemas/store/store_product.schema.ts
import {
  pgTable, uuid, varchar, text, numeric,
  integer, boolean, timestamp, index,
  uniqueIndex, jsonb
} from "drizzle-orm/pg-core";
// import { relations } from "drizzle-orm";
import { createStore } from "./createStore.schema";

// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ProductColor type
export type ProductColor = {
  color: string;
  index: number;
};

// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Product table
export const store_product = pgTable("store_product", {
  _id: uuid("_id").defaultRandom().primaryKey(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => createStore._id, { onDelete: "cascade" }),

  // Basic info
  productName: varchar("product_name", { length: 255 }).notNull(),
  description: text("description").default(""),
  warnings: text("warnings").default(""),

  // Price
  productPrice: numeric("product_price", {
    precision: 10,
    scale: 2
  }).notNull(),
  productDiscount: numeric("product_discount", {
    precision: 5,
    scale: 2
  }).default("0"),
  finalPrice: numeric("final_price", {
    precision: 10,
    scale: 2
  }).default("0"),

  // Arrays
  productSizes: text("product_sizes").array().default([]),
  productColors: jsonb("product_colors")
    .$type<ProductColor[]>()
    .default([]),
  productImages: text("product_images").array().notNull(),
  tags: text("tags").array().default([]),
  variants: text("variants").array().default([]),
  specifications: text("specifications").array().default([]),

  // Other
  category: varchar("category", { length: 255 }),
  stock: integer("stock").default(0),
  ordersAllTime: integer("orders_all_time").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
    .$onUpdate(() => new Date()),
}, (table) => ({
  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Composite unique index (storeId + productName)
  storeProductNameIdx: uniqueIndex("store_product_name_idx")
    .on(table.storeId, table.productName),
  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Index for store lookup
  storeIdx: index("store_product_store_idx").on(table.storeId),
  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Index for category filter
  categoryIdx: index("store_product_category_idx").on(table.category),
}));

// export const storeProductRelations = relations(
//   store_product, ({ one }) => ({
//   store: one(createStore, {
//     fields: [store_product.storeId],
//     references: [createStore._id],
//   }),
// }));

export type StoreProduct = typeof store_product.$inferSelect;
export type NewStoreProduct = typeof store_product.$inferInsert;
