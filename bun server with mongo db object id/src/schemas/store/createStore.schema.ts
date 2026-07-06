// src/db/schema/createStore.schema.ts  ÃƒÂ¢Ã¢â‚¬Â Ã‚Â same name as MongoDB model
import {
  pgTable, uuid, varchar, text,
  timestamp, integer, numeric, index
} from "drizzle-orm/pg-core";
// import { relations } from "drizzle-orm";
import { users } from "../user.schema";
import { eq, and, desc, asc, ilike, sql } from "drizzle-orm";
// import { store_order } from "./store_order.schema";

export const createStore = pgTable("createStore", {
  _id: uuid("_id").defaultRandom().primaryKey(),
  storeName: varchar("store_name", { length: 255 }).notNull().unique(),
  storeLogo: text("store_logo").notNull(),
  category: varchar("category", { length: 255 }),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users._id, { onDelete: "cascade" }),
  clickCount: integer("click_count").default(0).notNull(),
  rating: numeric("rating", { precision: 2, scale: 1 }).default("0").notNull(),
  totalRatings: integer("total_ratings").default(0).notNull(),
  totalSells: integer("total_sells").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
    .$onUpdate(() => new Date()),
},
(table) => ({
  ownerIdx: index("createStore_owner_idx").on(table.ownerId),
  categoryIdx: index("createStore_category_idx").on(table.category),
  ratingIdx: index("createStore_rating_idx").on(table.rating),
}));
 // relation commented
// export const createStoreRelations = relations(createStore, ({ one }) => ({
//   owner: one(users, {
//     fields: [createStore.ownerId],
//     references: [users._id],
//   }),
// }));




// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Added storeRatings table


export const storeRatings = pgTable("store_ratings", {
  _id: uuid("_id").defaultRandom().primaryKey(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => createStore._id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users._id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
    .$onUpdate(() => new Date()),
}, (table) => ({
  storeUserIdx: index("store_ratings_store_user_idx").on(table.storeId, table.userId),
}));

// relation commented
// export const storesRelations = relations(createStore, ({ one, many }) => ({
//   owner: one(users, {
//     fields: [createStore.ownerId],
//     references: [users._id],
//   }),
//   ratings: many(storeRatings),
//   orders: many(store_order),
// }));

// relation commented
// export const storeRatingsRelations = relations(storeRatings, ({ one }) => ({
//   store: one(createStore, {
//     fields: [storeRatings.storeId],
//     references: [createStore._id],
//   }),
//   user: one(users, {
//     fields: [storeRatings.userId],
//     references: [users._id],
//   }),
// }));

 export type CreateStore = typeof createStore.$inferSelect;
 export type NewCreateStore = typeof createStore.$inferInsert;

 export type StoreRating = typeof storeRatings.$inferSelect;
export type NewStoreRating = typeof storeRatings.$inferInsert;

// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Correct type exports
