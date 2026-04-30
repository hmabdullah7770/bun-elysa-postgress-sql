// src/db/schema/store_carousel_old.schema.ts
import {
  pgTable, uuid, varchar, text, boolean,
  integer, timestamp, index
} from "drizzle-orm/pg-core";
// import { relations } from "drizzle-orm";
import { createStore } from "./createStore.schema";

export const store_carousel_old = pgTable("store_carousel_old", {
  _id: uuid("_id").defaultRandom().primaryKey(),
  storeId: uuid("store_id")
    .notNull()
    .unique()
    .references(() => createStore._id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
    .$onUpdate(() => new Date()),
}, (table) => ({
  storeIdx: index("store_carousel_old_store_idx").on(table.storeId),
}));

export const carousel_items_old = pgTable("carousel_items_old", {
  _id: uuid("_id").defaultRandom().primaryKey(),
  storeCarouselId: uuid("store_carousel_id")
    .notNull()
    .references(() => store_carousel_old._id, { onDelete: "cascade" }),
  index: integer("index").notNull(),
  images: text("images").notNull(),
  imageAlt: varchar("image_alt", { length: 255 }).default("Banner Background"),
  title: varchar("title", { length: 255 }),
  titleColor: varchar("title_color", { length: 100 }),
  tileBackground: varchar("tile_background", { length: 100 }),
  description: text("description"),
  descriptionColor: varchar("description_color", { length: 100 }),
  discriptionBackgroundColor: varchar("discription_background_color", { length: 100 }),
  buttonText: varchar("button_text", { length: 255 }),
  buttonTextColor: varchar("button_text_color", { length: 100 }),
  buttonHoverTextColor: varchar("button_hover_text_color", { length: 100 }),
  buttonBackground: varchar("button_background", { length: 100 }),
  buttonHoverBackground: varchar("button_hover_background", { length: 100 }),
  buttonShadow: boolean("button_shadow").default(false),
  buttonShadowColor: varchar("button_shadow_color", { length: 100 }),
  buttonBorder: boolean("button_border").default(false),
  buttonBorderColor: varchar("button_border_color", { length: 100 }),
  productId: uuid("product_id"),
  fontFamily: text("font_family").array().default(["Arial"]),
  category: varchar("category", { length: 255 }),
  overlayOpacity: integer("overlay_opacity"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
    .$onUpdate(() => new Date()),
}, (table) => ({
  storeCarouselIdx: index("carousel_items_old_store_carousel_idx")
    .on(table.storeCarouselId),
}));
// relation commented
// export const storeCarouselOldRelations = relations(
//   store_carousel_old, ({ one, many }) => ({
//   store: one(createStore, {
//     fields: [store_carousel_old.storeId],
//     references: [createStore._id],
//   }),
//   carousels: many(carousel_items_old),
// }));

// relation commented
// export const carouselItemsOldRelations = relations(
//   carousel_items_old, ({ one }) => ({
//   storeCarousel: one(store_carousel_old, {
//     fields: [carousel_items_old.storeCarouselId],
//     references: [store_carousel_old._id],
//   }),
// }));

export type StoreCarouselOld = typeof store_carousel_old.$inferSelect;
export type NewStoreCarouselOld = typeof store_carousel_old.$inferInsert;
export type CarouselItemOld = typeof carousel_items_old.$inferSelect;
export type NewCarouselItemOld = typeof carousel_items_old.$inferInsert;
