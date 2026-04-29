
// with jsonB for formate 


// // src/schema/store_carousel.schema.ts
import {
  pgTable, uuid, timestamp, index, jsonb
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createStore } from "./createStore.schema";

export type CarouselItem = {
  _id: string;
  index: number;
  images: string;                      // ÃƒÂ¢Ã¢â‚¬Â Ã‚Â single image string
  imageAlt?: string;
  title?: string;
  titleColor?: string;
  tileBackground?: string;
  description?: string;
  descriptionColor?: string;
  discriptionBackgroundColor?: string;
  buttonText?: string;
  buttonTextColor?: string;
  buttonHoverTextColor?: string;
  buttonBackground?: string;
  buttonHoverBackground?: string;
  buttonShadow?: boolean;
  buttonShadowColor?: string;
  buttonBorder?: boolean;
  buttonBorderColor?: string;
  productId?: string;
  fontFamily?: string[];
  category?: string;
  overlayOpacity?: number;
  createdAt: string;
  updatedAt: string;
};

export const store_carousel = pgTable("store_carousel", {
  _id: uuid("_id").defaultRandom().primaryKey(),
  storeId: uuid("store_id")
    .notNull()
    .unique()
    .references(() => createStore._id, { onDelete: "cascade" }),
  carousels: jsonb("carousels")
    .$type<CarouselItem[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
    .$onUpdate(() => new Date()),
}, (table) => ({
  storeIdx: index("store_carousel_store_idx").on(table.storeId),
}));

export const storeCarouselRelations = relations(
  store_carousel, ({ one }) => ({
  store: one(createStore, {
    fields: [store_carousel.storeId],
    references: [createStore._id],
  }),
}));

export type StoreCarousel = typeof store_carousel.$inferSelect;
export type NewStoreCarousel = typeof store_carousel.$inferInsert;




// // old code 




// // src/db/schema/store_carousel.schema.ts
// import {
//   pgTable, uuid, varchar, text, boolean,
//   integer, timestamp, index
// } from "drizzle-orm/pg-core";
// import { relations } from "drizzle-orm";
// import { createStore } from "./createStore.schema";

// export const store_carousel = pgTable("store_carousel", {
//   _id: uuid("_id").defaultRandom().primaryKey(),
//   storeId: uuid("store_id")
//     .notNull()
//     .unique()
//     .references(() => createStore._id, { onDelete: "cascade" }),
//   createdAt: timestamp("created_at").defaultNow().notNull(),
//   updatedAt: timestamp("updated_at").defaultNow().notNull()
//     .$onUpdate(() => new Date()),
// }, (table) => ({
//   storeIdx: index("store_carousel_store_idx").on(table.storeId),
// }));

// export const carousel_items = pgTable("carousel_items", {
//   _id: uuid("_id").defaultRandom().primaryKey(),
//   storeCarouselId: uuid("store_carousel_id")
//     .notNull()
//     .references(() => store_carousel._id, { onDelete: "cascade" }),
//   index: integer("index").notNull(),
//   images: text("images").notNull(),
//   imageAlt: varchar("image_alt", { length: 255 }).default("Banner Background"),
//   title: varchar("title", { length: 255 }),
//   titleColor: varchar("title_color", { length: 100 }),
//   tileBackground: varchar("tile_background", { length: 100 }),
//   description: text("description"),
//   descriptionColor: varchar("description_color", { length: 100 }),
//   discriptionBackgroundColor: varchar("discription_background_color", { length: 100 }),
//   buttonText: varchar("button_text", { length: 255 }),
//   buttonTextColor: varchar("button_text_color", { length: 100 }),
//   buttonHoverTextColor: varchar("button_hover_text_color", { length: 100 }),
//   buttonBackground: varchar("button_background", { length: 100 }),
//   buttonHoverBackground: varchar("button_hover_background", { length: 100 }),
//   buttonShadow: boolean("button_shadow").default(false),
//   buttonShadowColor: varchar("button_shadow_color", { length: 100 }),
//   buttonBorder: boolean("button_border").default(false),
//   buttonBorderColor: varchar("button_border_color", { length: 100 }),
//   productId: uuid("product_id"),
//   fontFamily: text("font_family").array().default(["Arial"]),
//   category: varchar("category", { length: 255 }),
//   overlayOpacity: integer("overlay_opacity"),
//   createdAt: timestamp("created_at").defaultNow().notNull(),
//   updatedAt: timestamp("updated_at").defaultNow().notNull()
//     .$onUpdate(() => new Date()),
// }, (table) => ({
//   storeCarouselIdx: index("carousel_items_store_carousel_idx").on(table.storeCarouselId),
// }));

// export const storeCarouselRelations = relations(store_carousel, ({ one, many }) => ({
//   store: one(createStore, {
//     fields: [store_carousel.storeId],
//     references: [createStore._id],
//   }),
//   carousels: many(carousel_items),
// }));

// export const carouselItemsRelations = relations(carousel_items, ({ one }) => ({
//   storeCarousel: one(store_carousel, {
//     fields: [carousel_items.storeCarouselId],
//     references: [store_carousel._id],
//   }),
// }));

// export type StoreCarousel = typeof store_carousel.$inferSelect;
// export type NewStoreCarousel = typeof store_carousel.$inferInsert;
// export type CarouselItem = typeof carousel_items.$inferSelect;
// export type NewCarouselItem = typeof carousel_items.$inferInsert;

