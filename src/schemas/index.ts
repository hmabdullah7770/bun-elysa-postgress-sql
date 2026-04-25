// src/schemas/index.ts

export * from "./user.schema";
export * from "./userStore.schema";
export * from "./watchHistory.schema";
export * from "./followlist.schema";

// ✅ Comment schema exports (named, like other modules)
export {
  comments,
  commentsRelations,
  commentTypeEnum,
  type Comment,
  type NewComment,
} from "./comment.schema";

// ✅ Post schema exports (named)
export {
  posts,
  postsRelations,
  type Post,
  type NewPost,
  type PostStoreItem,
  type PostProductItem,
  type PostImageItem,
  type PostVideoItem,
} from "./post.schema";

export {
  post_counters,
  type PostCounter,
  type NewPostCounter,
} from "./postCounters.schema";

// ✅ createStore - specific exports to avoid conflicts
export {
  createStore,
  storeRatings,
  createStoreRelations,
  storesRelations,
  storeRatingsRelations,
  type CreateStore,
  type NewCreateStore,
  type StoreRating,
  type NewStoreRating,
} from "./store/createStore.schema";

// ✅ NEW carousel (JSONB - 1 table)
export {
  store_carousel,
  storeCarouselRelations,
  type CarouselItem,
  type StoreCarousel,
  type NewStoreCarousel,
} from "./store/store_carousel.schema";

// ✅ OLD carousel (2 tables)
export {
  store_carousel_old,
  carousel_items_old,
  storeCarouselOldRelations,
  carouselItemsOldRelations,
  type StoreCarouselOld,
  type NewStoreCarouselOld,
  type CarouselItemOld,
  type NewCarouselItemOld,
} from "./store/store_carousel_old.schema";




// ✅ Add new product schema!
export {
  store_product,
  storeProductRelations,
  type ProductColor,
  type StoreProduct,
  type NewStoreProduct,
} from "./store/store_product.schema";




export {
  store_cart,
  store_cart_item,
  storeCartRelations,
  storeCartItemRelations,
  type StoreCart,
  type NewStoreCart,
  type StoreCartItem,
  type NewStoreCartItem,
  type StoreCartWithItems,
} from "./store/store_cart.schema";




// index.ts - make sure enums are exported
export {
  store_order,
  store_order_item,
  storeOrderRelations,
  storeOrderItemRelations,
  orderStatusEnum,       // ✅ ADD THIS
  paymentStatusEnum,     // ✅ ADD THIS
  paymentMethodEnum,     // ✅ ADD THIS
  itemStatusEnum,        // ✅ ADD THIS
  itemPaymentStatusEnum, // ✅ ADD THIS
  type StoreOrder,
  type NewStoreOrder,
  type StoreOrderItem,
  type NewStoreOrderItem,
  type StoreOrderWithItems,
} from "./store/store_order.schema";

// export {
//   store_order,
//   store_order_item,
//   storeOrderRelations,
//   storeOrderItemRelations,
//   type StoreOrder,
//   type NewStoreOrder,
//   type StoreOrderItem,
//   type NewStoreOrderItem,
//   type StoreOrderWithItems,
// } from "./store/store_order.schema";
// export * from "./user.schema";
// export * from "./userStore.schema";
// export * from "./watchHistory.schema";
// export * from "./followlist.schema";


// // ✅ Use specific named exports to avoid conflicts
// export {
//   createStore,
//   storeRatings,
//   createStoreRelations,
//   storesRelations,
//   storeRatingsRelations,
//   type CreateStore,
//   type NewCreateStore,
//   type StoreRating,
//   type NewStoreRating,
// } from "./store/createStore.schema";

// export * from "./store/store_carousel.schema";