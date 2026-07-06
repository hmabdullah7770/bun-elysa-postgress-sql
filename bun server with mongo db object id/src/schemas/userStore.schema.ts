// // src/db/schema/store.schema.ts
// import {
//   pgTable, uuid, varchar, text,
//   timestamp, integer, numeric, index
// } from "drizzle-orm/pg-core";
// import { relations } from "drizzle-orm";
// import { users } from "./user.schema";

// export const stores = pgTable("stores", {
//   _id: uuid("_id").defaultRandom().primaryKey(),

//   storeName: varchar("store_name", { length: 255 }).notNull().unique(),
//   storeLogo: text("store_logo").notNull(),
//   category: varchar("category", { length: 255 }),

//   ownerId: uuid("owner_id")
//     .notNull()
//     .references(() => users._id, { onDelete: "cascade" }),

//   clickCount: integer("click_count").default(0).notNull(),
//   rating: numeric("rating", { precision: 2, scale: 1 }).default("0").notNull(),
//   totalRatings: integer("total_ratings").default(0).notNull(),
//   totalSells: integer("total_sells").default(0).notNull(),

//   createdAt: timestamp("created_at").defaultNow().notNull(),
//   updatedAt: timestamp("updated_at")
//     .defaultNow()
//     .notNull()
//     .$onUpdate(() => new Date()),
// },
// (table) => ({
//   ownerIdx: index("stores_owner_idx").on(table.ownerId),
//   categoryIdx: index("stores_category_idx").on(table.category),
//   ratingIdx: index("stores_rating_idx").on(table.rating),
// }));

// export const storesRelations = relations(stores, ({ one }) => ({
//   owner: one(users, {
//     fields: [stores.ownerId],
//     references: [users._id],
//   }),
// }));

// export type Store = typeof stores.$inferSelect;
// export type NewStore = typeof stores.$inferSelect;




// // // src/db/schema/userStore.schema.ts
// // import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
// // import { relations } from "drizzle-orm";
// // import { users } from "./user.schema";

// // export const userStores = pgTable("user_stores", {
// //   _id: uuid("_id").defaultRandom().primaryKey(),
// //   userId: uuid("user_id")
// //     .notNull()
// //     .references(() => users._id, { onDelete: "cascade" }),
// //   storeId: uuid("store_id"), // references a CreateStore table if you have one
// //   storeName: varchar("store_name", { length: 255 }),
// //   storeLogo: text("store_logo"),
// //   createdAt: timestamp("created_at").defaultNow().notNull(),
// // });

// // export const userStoresRelations = relations(userStores, ({ one }) => ({
// //   user: one(users, {
// //     fields: [userStores.userId],
// //     references: [users._id],
// //   }),
// // }));

// // export type UserStore = typeof userStores.$inferSelect;
