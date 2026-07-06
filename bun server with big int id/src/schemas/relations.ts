// src/db/schema/relations.ts
// ─────────────────────────────────────────────────────────────
//  ALL Drizzle relations() live here.
//  Schema files only contain pgTable definitions + FK .references().
//  Import order matters: no circular deps because this file is
//  the only one that touches multiple schema files at once.
// ─────────────────────────────────────────────────────────────
import { relations } from "drizzle-orm";

// ── core
import { users }                                    from "./user.schema";
import { watchHistory }                             from "./watchHistory.schema";
import { followLists }                              from "./followlist.schema";
import { posts }                                    from "./post.schema";
import { comments }                                 from "./comment.schema";

// ── store
import { createStore, storeRatings }               from "./store/createStore.schema";
import { store_product }                            from "./store/store_product.schema";
import { store_carousel }                           from "./store/store_carousel.schema";
import { store_carousel_old, carousel_items_old }  from "./store/store_carousel_old.schema";
import { store_cart, store_cart_item }              from "./store/store_cart.schema";
import { store_order, store_order_item }            from "./store/store_order.schema";

// ─────────────────────────────────────────────────────────────
// users
// ─────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  // stores this user owns
  stores: many(createStore),

  // orders where this user is the customer
  ordersAsCustomer: many(store_order, { relationName: "customer_orders" }),

  // orders where this user is the store owner
  ordersAsOwner: many(store_order, { relationName: "owned_store_orders" }),

  // store ratings this user has given
  storeRatings: many(storeRatings),

  // carts belonging to this user
  carts: many(store_cart),

  // watch history
  watchHistory: many(watchHistory),

  // social graph
  followers: many(followLists, { relationName: "followers" }),
  following: many(followLists, { relationName: "following" }),

  // content
  posts: many(posts),
  comments: many(comments),
}));

// ─────────────────────────────────────────────────────────────
// watchHistory
// ─────────────────────────────────────────────────────────────
export const watchHistoryRelations = relations(watchHistory, ({ one }) => ({
  user: one(users, {
    fields: [watchHistory.userId],
    references: [users._id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// posts
// ─────────────────────────────────────────────────────────────
export const postsRelations = relations(posts, ({ one }) => ({
  ownerUser: one(users, {
    fields: [posts.owner],
    references: [users._id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// comments
// ─────────────────────────────────────────────────────────────
export const commentsRelations = relations(comments, ({ one }) => ({
  ownerUser: one(users, {
    fields: [comments.owner],
    references: [users._id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// createStore
// ─────────────────────────────────────────────────────────────
export const createStoreRelations = relations(createStore, ({ one, many }) => ({
  // store belongs to one user (owner)
  owner: one(users, {
    fields: [createStore.ownerId],
    references: [users._id],
  }),

  // store has many orders
  orders: many(store_order),

  // store has many ratings
  ratings: many(storeRatings),

  // store has many products
  products: many(store_product),

  // store has one carousel (jsonb version)
  carousel: many(store_carousel),

  // store has one carousel (old relational version)
  carouselOld: many(store_carousel_old),

  // store has many carts
  carts: many(store_cart),
}));

// ─────────────────────────────────────────────────────────────
// storeRatings
// ─────────────────────────────────────────────────────────────
export const storeRatingsRelations = relations(storeRatings, ({ one }) => ({
  store: one(createStore, {
    fields: [storeRatings.storeId],
    references: [createStore._id],
  }),
  user: one(users, {
    fields: [storeRatings.userId],
    references: [users._id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// store_product
// ─────────────────────────────────────────────────────────────
export const storeProductRelations = relations(store_product, ({ one }) => ({
  store: one(createStore, {
    fields: [store_product.storeId],
    references: [createStore._id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// store_carousel  (jsonb version — one row per store)
// ─────────────────────────────────────────────────────────────
export const storeCarouselRelations = relations(store_carousel, ({ one }) => ({
  store: one(createStore, {
    fields: [store_carousel.storeId],
    references: [createStore._id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// store_carousel_old  (relational version)
// ─────────────────────────────────────────────────────────────
export const storeCarouselOldRelations = relations(store_carousel_old, ({ one, many }) => ({
  store: one(createStore, {
    fields: [store_carousel_old.storeId],
    references: [createStore._id],
  }),
  carousels: many(carousel_items_old),
}));

export const carouselItemsOldRelations = relations(carousel_items_old, ({ one }) => ({
  storeCarousel: one(store_carousel_old, {
    fields: [carousel_items_old.storeCarouselId],
    references: [store_carousel_old._id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// store_cart
// ─────────────────────────────────────────────────────────────
export const storeCartRelations = relations(store_cart, ({ one, many }) => ({
  // ✅ FK .references() are missing in store_cart.schema.ts — see note below
  user: one(users, {
    fields: [store_cart.userId],
    references: [users._id],
  }),
  store: one(createStore, {
    fields: [store_cart.storeId],
    references: [createStore._id],
  }),
  items: many(store_cart_item),
}));

export const storeCartItemRelations = relations(store_cart_item, ({ one }) => ({
  cart: one(store_cart, {
    fields: [store_cart_item.storeCartId],
    references: [store_cart._id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// store_order
// ─────────────────────────────────────────────────────────────
export const storeOrderRelations = relations(store_order, ({ one, many }) => ({
  items: many(store_order_item),

  // the user who placed the order
  customer: one(users, {
    fields: [store_order.customerId],
    references: [users._id],
    relationName: "customer_orders",      // named — users appears twice
  }),

  // the store this order belongs to
  store: one(createStore, {
    fields: [store_order.storeId],
    references: [createStore._id],
  }),

  // the user who owns the store
  storeOwner: one(users, {
    fields: [store_order.storeOwnerId],
    references: [users._id],
    relationName: "owned_store_orders",   // named — users appears twice
  }),
}));

export const storeOrderItemRelations = relations(store_order_item, ({ one }) => ({
  order: one(store_order, {
    fields: [store_order_item.orderId],
    references: [store_order._id],
  }),
}));



// // src/db/schema/relations.ts
// import { relations } from "drizzle-orm";

// // ── Import all tables from their schema files
// import { users } from "./user.schema";
// import { createStore, storeRatings } from "./store/createStore.schema";
// import { store_order, store_order_item } from "./store/store_order.schema";
// import { watchHistory } from "./watchHistory.schema";
// import { followLists } from "./followlist.schema";

// // ── users relations
// export const usersRelations = relations(users, ({ many }) => ({
//   stores: many(createStore),
//   ordersAsCustomer: many(store_order, { relationName: "customer_orders" }),
//   ordersAsOwner: many(store_order, { relationName: "owned_store_orders" }),
//   watchHistory: many(watchHistory),
//   followers: many(followLists, { relationName: "followers" }),
//   following: many(followLists, { relationName: "following" }),
// }));

// // ── createStore relations
// export const createStoreRelations = relations(createStore, ({ one, many }) => ({
//   owner: one(users, {
//     fields: [createStore.ownerId],
//     references: [users._id],
//   }),
//   orders: many(store_order),
//   ratings: many(storeRatings),
// }));

// // ── storeRatings relations
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

// // ── store_order relations
// export const storeOrderRelations = relations(store_order, ({ one, many }) => ({
//   items: many(store_order_item),
//   customer: one(users, {
//     fields: [store_order.customerId],
//     references: [users._id],
//     relationName: "customer_orders",
//   }),
//   store: one(createStore, {
//     fields: [store_order.storeId],
//     references: [createStore._id],
//   }),
//   storeOwner: one(users, {
//     fields: [store_order.storeOwnerId],
//     references: [users._id],
//     relationName: "owned_store_orders",
//   }),
// }));

// // ── store_order_item relations
// export const storeOrderItemRelations = relations(store_order_item, ({ one }) => ({
//   order: one(store_order, {
//     fields: [store_order_item.orderId],
//     references: [store_order._id],
//   }),
// }));