import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  jsonb,
  numeric,
  bigint,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { users } from "./user.schema";

export type PostStoreItem = {
  storeisActive?: boolean;
  storeIconSize?: "L" | "S";
  storeId?: string;
  storeUrl?: string;
};

export type PostProductItem = {
  productisActive?: boolean;
  productIconSize?: "L" | "S";
  ProductId?: string;
  productUrl?: string;
};

export type PostImageItem = {
  url: string;
  Imageposition?: number;
  position?: number;
};

export type PostVideoItem = {
  url: string;
  Videoposition?: number;
  position?: number;
  autoplay?: boolean;
  thumbnail?: string | null;
  posturl?: string | null;
};

export const posts = pgTable(
  "posts",
  {
    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Changed from uuid to bigint
    _id: bigint("_id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),

    postIdUnique: varchar("post_id_unique", { length: 255 }).notNull(),
    inCategoryId: varchar("in_category_id", { length: 255 }).notNull(),

    category: varchar("category", { length: 255 }).notNull(),

    title: text("title").default(sql`null`),
    description: text("description").default(sql`null`),

    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ owner stays uuid ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â references users.id (uuid)
    owner: uuid("owner").notNull().references(() => users._id, {
      onDelete: "cascade",
    }),

    store: jsonb("store").$type<PostStoreItem[]>().notNull().default([]),
    product: jsonb("product").$type<PostProductItem[]>().notNull().default([]),

    imageFiles: jsonb("image_files").$type<PostImageItem[]>().notNull().default([]),
    videoFiles: jsonb("video_files").$type<PostVideoItem[]>().notNull().default([]),

    audioFile: text("audio_file").default(sql`null`),
    song: text("song").array().notNull().default([]),

    videocount: integer("videocount").notNull().default(0),
    imagecount: integer("imagecount").notNull().default(0),
    audiocount: integer("audiocount").notNull().default(0),

    pattern: varchar("pattern", { length: 50 }).notNull().default("1"),
    postType: varchar("post_type", { length: 50 }).default(sql`null`),

    views: integer("views").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),

    whatsapp: text("whatsapp").default(sql`null`),
    storeLink: text("store_link").default(sql`null`),
    facebook: text("facebook").default(sql`null`),
    instagram: text("instagram").default(sql`null`),
    productlink: text("productlink").default(sql`null`),

    facebookurl: text("facebookurl").default(sql`null`),
    instagramurl: text("instagramurl").default(sql`null`),
    whatsappnumberurl: text("whatsappnumberurl").default(sql`null`),
    storelinkurl: text("storelinkurl").default(sql`null`),

    totalRating: integer("total_rating").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    averageRating: numeric("average_rating", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),

    totalViews: integer("total_views").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    postIdUniqueIdx: uniqueIndex("posts_post_id_unique_unique").on(table.postIdUnique),
    categoryInCategoryUnique: uniqueIndex("posts_category_in_category_unique").on(
      table.category,
      table.inCategoryId
    ),
    categoryPublishedCreatedIdx: index("posts_category_published_created_idx").on(
      table.category,
      table.isPublished,
      table.createdAt
    ),
    publishedCreatedIdx: index("posts_published_created_idx").on(
      table.isPublished,
      table.createdAt
    ),
    categoryPublishedViewsIdx: index("posts_category_published_total_views_idx").on(
      table.category,
      table.isPublished,
      table.totalViews
    ),
    categoryPublishedRatingIdx: index("posts_category_published_avg_rating_idx").on(
      table.category,
      table.isPublished,
      table.averageRating
    ),
    ownerPublishedCreatedIdx: index("posts_owner_published_created_idx").on(
      table.owner,
      table.isPublished,
      table.createdAt
    ),
    ownerCreatedIdx: index("posts_owner_created_idx").on(table.owner, table.createdAt),
  })
);

export const postsRelations = relations(posts, ({ one }) => ({
  ownerUser: one(users, {
    fields: [posts.owner],
    references: [users._id],
  }),
}));

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

// import {
//   pgTable,
//   uuid,
//   varchar,
//   text,
//   integer,
//   boolean,
//   timestamp,
//   index,
//   uniqueIndex,
//   jsonb,
//   numeric,
// } from "drizzle-orm/pg-core";
// import { relations, sql } from "drizzle-orm";
// import { users } from "./user.schema";

// export type PostStoreItem = {
//   storeisActive?: boolean;
//   storeIconSize?: "L" | "S";
//   storeId?: string;
//   storeUrl?: string;
// };

// export type PostProductItem = {
//   productisActive?: boolean;
//   productIconSize?: "L" | "S";
//   ProductId?: string;
//   productUrl?: string;
// };

// export type PostImageItem = {
//   url: string;
//   Imageposition?: number;
//   position?: number;
// };

// export type PostVideoItem = {
//   url: string;
//   Videoposition?: number;
//   position?: number;
//   autoplay?: boolean;
//   thumbnail?: string | null;
//   posturl?: string | null;
// };

// export const posts = pgTable(
//   "posts",
//   {
//     // Frontend expects Mongo-style `_id`
//     _id: uuid("_id").defaultRandom().primaryKey(),

//     // Unique ids used by your frontend/backfill scripts
//     postIdUnique: varchar("post_id_unique", { length: 255 }).notNull(),
//     inCategoryId: varchar("in_category_id", { length: 255 }).notNull(),

//     // Store as a normal string; you already normalize empty -> "All" in service
//     category: varchar("category", { length: 255 }).notNull(),

//     title: text("title").default(sql`null`),
//     description: text("description").default(sql`null`),

//     owner: uuid("owner").notNull().references(() => users._id, {
//       onDelete: "cascade",
//     }),

//     // Arrays-of-objects from your old schema
//     store: jsonb("store").$type<PostStoreItem[]>().notNull().default([]),
//     product: jsonb("product").$type<PostProductItem[]>().notNull().default([]),

//     imageFiles: jsonb("image_files").$type<PostImageItem[]>().notNull().default([]),
//     videoFiles: jsonb("video_files").$type<PostVideoItem[]>().notNull().default([]),

//     audioFile: text("audio_file").default(sql`null`),
//     song: text("song").array().notNull().default([]),

//     // Counts
//     videocount: integer("videocount").notNull().default(0),
//     imagecount: integer("imagecount").notNull().default(0),
//     audiocount: integer("audiocount").notNull().default(0),

//     // Layout / type
//     pattern: varchar("pattern", { length: 50 }).notNull().default("1"),
//     postType: varchar("post_type", { length: 50 }).default(sql`null`),

//     views: integer("views").notNull().default(0),
//     isPublished: boolean("is_published").notNull().default(true),

//     // Social fields
//     whatsapp: text("whatsapp").default(sql`null`),
//     storeLink: text("store_link").default(sql`null`),
//     facebook: text("facebook").default(sql`null`),
//     instagram: text("instagram").default(sql`null`),
//     productlink: text("productlink").default(sql`null`),

//     // URL fields
//     facebookurl: text("facebookurl").default(sql`null`),
//     instagramurl: text("instagramurl").default(sql`null`),
//     whatsappnumberurl: text("whatsappnumberurl").default(sql`null`),
//     storelinkurl: text("storelinkurl").default(sql`null`),

//     // Rating fields
//     totalRating: integer("total_rating").notNull().default(0),
//     ratingCount: integer("rating_count").notNull().default(0),
//     averageRating: numeric("average_rating", { precision: 5, scale: 2 })
//       .notNull()
//       .default("0"),

//     totalViews: integer("total_views").notNull().default(0),
//     commentCount: integer("comment_count").notNull().default(0),

//     createdAt: timestamp("created_at").defaultNow().notNull(),
//     updatedAt: timestamp("updated_at")
//       .defaultNow()
//       .notNull()
//       .$onUpdate(() => new Date()),
//   },
//   (table) => ({
//     postIdUniqueIdx: uniqueIndex("posts_post_id_unique_unique").on(table.postIdUnique),
//     categoryInCategoryUnique: uniqueIndex("posts_category_in_category_unique").on(
//       table.category,
//       table.inCategoryId
//     ),

//     // Pagination + filters (rough equivalent of your Mongo indexes)
//     categoryPublishedCreatedIdx: index("posts_category_published_created_idx").on(
//       table.category,
//       table.isPublished,
//       table.createdAt
//     ),
//     publishedCreatedIdx: index("posts_published_created_idx").on(
//       table.isPublished,
//       table.createdAt
//     ),
//     categoryPublishedViewsIdx: index("posts_category_published_total_views_idx").on(
//       table.category,
//       table.isPublished,
//       table.totalViews
//     ),
//     categoryPublishedRatingIdx: index("posts_category_published_avg_rating_idx").on(
//       table.category,
//       table.isPublished,
//       table.averageRating
//     ),
//     ownerPublishedCreatedIdx: index("posts_owner_published_created_idx").on(
//       table.owner,
//       table.isPublished,
//       table.createdAt
//     ),
//     ownerCreatedIdx: index("posts_owner_created_idx").on(table.owner, table.createdAt),
//   })
// );

// export const postsRelations = relations(posts, ({ one }) => ({
//   ownerUser: one(users, {
//     fields: [posts.owner],
//     references: [users._id],
//   }),
// }));

// export type Post = typeof posts.$inferSelect;
// export type NewPost = typeof posts.$inferInsert;

// //optimized code
// import mongoose, { Schema } from "mongoose";
// import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
// import { NewComment } from "./newcomment.model.js";

// const postSchema = new Schema({
//     // ========== NEW UNIQUE IDs ==========
//     postIdUnique: {
//         type: String,
//         unique: true,
//         required: true,
//         index: true
//     },
    
//     inCategoryId: {
//         type: String,
//         required: true,
//         // Don't add individual index - covered by compound indexes
//     },

//     store: [{
//         storeisActive: {
//             type: Boolean,
//             default: false
//         },
//         storeIconSize:{
//             type: String,
//             enum: ['L','S'],
//             default: 'L'
//         },
//         storeId: {
//             type: String ,
//         },
//         storeUrl:{
//             type: String,
//         },
//         default:[]
//     }],

//     facebookurl:{
//         type: String,
//     },
//     instagramurl:{
//         type: String,
//     },
//     whatsappnumberurl:{
//         type: String,
//     },
//     storelinkurl:{
//         type: String,
//     },

//     product: [{
//         productisActive: {
//             type: Boolean,
//             default: false
//         },
//         productIconSize:{
//             type: String,
//             enum: ['L','S'],
//             default: 'S'
//         },
//         ProductId: {
//             type: String ,
//         },
//         productUrl:{
//             type: String,
//         },
//         default:[]
//     }],

//     videocount:{
//         type: Number,
//         default: 0
//     },
//     imagecount:{
//         type: Number,
//         default: 0
//     },
//     audiocount:{
//         type: Number,
//         default: 0
//     },

//     title: {
//         type: String,
//         trim: true,
//         // Don't add individual index - covered by text index
//     },
//     description: {
//         type: String,
//         trim: true
//     },
    
//     category: {
//         type: String,
//         required: true,
//         trim: true,
//         // Don't add individual index - covered by compound indexes
//     },
//     owner: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User",
//         required: true
//     },

//     imageFiles: [{
//         url: {
//             type: String,
//             required: true
//         },
//         Imageposition:{
//             type:Number,
//             default: 0,
//         }
//     }],

//     videoFiles: [{
//         url: {
//             type: String,
//             required: true
//         },
//         Videoposition:{
//             type:Number,
//             default: 0,
//         },
//         autoplay: {
//             type: Boolean,
//             default: false 
//         },
//         thumbnail:{
//             type: String,
//         },
//         posturl:{
//             type:String,
//         }
//     }],

//     audioFile:{
//         type: String,
//     },

//     song:[{
//         type:String
//     }],

//     pattern: {
//         type: String,
//         enum: [
//             '1',
//             '2x2',
//             '2',
//             '1x2',
//             '1x3',
//             'carousel',
//             'carousel arrow',
//         ],
//         default: '1'
//     },

//     postType:{
//         type: String,
//         enum: ['image', 'video', 'audio', 'text', 'mixed'],
//     },

//     views: {
//         type: Number,
//         default: 0,
//     },
//     isPublished: {
//         type: Boolean,
//         default: true
//     },
//     whatsapp: {
//         type: String
//     },
//     storeLink: {
//         type: String
//     },
//     facebook: {
//         type: String
//     },
//     instagram: {
//         type: String
//     },
//     productlink: {
//         type: String
//     },
//     totalRating: {
//         type: Number,
//         default: 0
//     },
//     ratingCount: {
//         type: Number,
//         default: 0
//     },
//     averageRating: {
//         type: Number,
//         default: 0
//     },
//     totalViews: {
//         type: Number,
//         default: 0
//     },

//     commentCount: {
//         type: Number,
//         default: 0
//     },

// }, { timestamps: true })

// // Static method for cascading delete
// postSchema.static('findByIdAndDelete', async function(id) {
//     await NewComment.deleteMany({ postId: id });
//     return this.findOneAndDelete({ _id: id });
// });

// postSchema.plugin(mongooseAggregatePaginate)

// // ============================================
// // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ OPTIMIZED INDEXES FOR CURSOR PAGINATION
// // ============================================

// // 1ÃƒÂ¯Ã‚Â¸Ã‚ÂÃƒÂ¢Ã†â€™Ã‚Â£ UNIQUE CONSTRAINT (must come first)
// postSchema.index(
//     { category: 1, inCategoryId: 1 }, 
//     { 
//         unique: true,
//         partialFilterExpression: { inCategoryId: { $exists: true, $ne: null } }
//     }
// );

// // 2ÃƒÂ¯Ã‚Â¸Ã‚ÂÃƒÂ¢Ã†â€™Ã‚Â£ TEXT SEARCH INDEX
// postSchema.index({ 
//     title: "text", 
//     description: "text", 
//     category: "text" 
// });

// // 3ÃƒÂ¯Ã‚Â¸Ã‚ÂÃƒÂ¢Ã†â€™Ã‚Â£ CURSOR PAGINATION - CATEGORY + CREATED_AT (Most Common)
// postSchema.index({ 
//     category: 1, 
//     isPublished: 1, 
//     createdAt: -1, 
//     inCategoryId: -1 
// });

// postSchema.index({ 
//     isPublished: 1, 
//     createdAt: -1, 
//     inCategoryId: -1 
// });

// // 4ÃƒÂ¯Ã‚Â¸Ã‚ÂÃƒÂ¢Ã†â€™Ã‚Â£ CURSOR PAGINATION - CATEGORY + TOTAL_VIEWS
// postSchema.index({ 
//     category: 1, 
//     isPublished: 1, 
//     totalViews: -1, 
//     inCategoryId: -1 
// });

// postSchema.index({ 
//     isPublished: 1, 
//     totalViews: -1, 
//     inCategoryId: -1 
// });

// // 5ÃƒÂ¯Ã‚Â¸Ã‚ÂÃƒÂ¢Ã†â€™Ã‚Â£ CURSOR PAGINATION - CATEGORY + AVERAGE_RATING
// postSchema.index({ 
//     category: 1, 
//     isPublished: 1, 
//     averageRating: -1, 
//     inCategoryId: -1 
// });

// postSchema.index({ 
//     isPublished: 1, 
//     averageRating: -1, 
//     inCategoryId: -1 
// });

// // 6ÃƒÂ¯Ã‚Â¸Ã‚ÂÃƒÂ¢Ã†â€™Ã‚Â£ CURSOR PAGINATION - USER POSTS (By Created Date)
// postSchema.index({ 
//     owner: 1, 
//     isPublished: 1, 
//     createdAt: -1, 
//     inCategoryId: -1 
// });

// postSchema.index({ 
//     owner: 1, 
//     createdAt: -1, 
//     inCategoryId: -1 
// });

// // 7ÃƒÂ¯Ã‚Â¸Ã‚ÂÃƒÂ¢Ã†â€™Ã‚Â£ CURSOR PAGINATION - USER POSTS (By Views)
// postSchema.index({ 
//     owner: 1, 
//     totalViews: -1, 
//     inCategoryId: -1 
// });

// // 8ÃƒÂ¯Ã‚Â¸Ã‚ÂÃƒÂ¢Ã†â€™Ã‚Â£ CURSOR PAGINATION - USER POSTS (By Rating)
// postSchema.index({ 
//     owner: 1, 
//     averageRating: -1, 
//     inCategoryId: -1 
// });

// // 9ÃƒÂ¯Ã‚Â¸Ã‚ÂÃƒÂ¢Ã†â€™Ã‚Â£ FALLBACK INDEXES (for queries without category/owner)
// postSchema.index({ createdAt: -1, inCategoryId: -1 });
// postSchema.index({ totalViews: -1, inCategoryId: -1 });
// postSchema.index({ averageRating: -1, inCategoryId: -1 });

// // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ…Â¸ SINGLE FIELD INDEXES (for specific lookups)
// postSchema.index({ owner: 1 });
// postSchema.index({ isPublished: 1 });

// export const Post = mongoose.model("Post", postSchema);

// // //optimized code

// // import mongoose, { Schema } from "mongoose";
// // import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
// // import { NewComment } from "./newcomment.model.js";
// // import { type } from "os";

// // const postSchema = new Schema({
   

// //     //   store: {
// //     //     type: Boolean,
        
// //     //     default: false
// //     // },
// //     // storeUrl:{
// //     //     type: String,
// //     // },




// //      // ========== NEW UNIQUE IDs ==========
// //     postIdUnique: {
// //         type: String,
// //         unique: true,      // Globally unique across all posts
// //         required: true,
// //         index: true
// //     },
    
// //     inCategoryId: {
// //         type: String,
// //         required: true,
// //         index: true
// //     },


// //     store: [{
            
// //          storeisActive: {
// //             type: Boolean,
// //             default: false
// //         },


// //         storeIconSize:{
          
// //             type: String,
// //             enum: ['L','S'],
// //             default: 'L'

// //         },

// //         storeId: {
// //             type: String ,
// //         },

        
       
// //          storeUrl:{
// //         type: String,
// //     },


// //          default:[]
// //     }],




// //     facebookurl:{
// //         type: String,
// //     }
// // ,
// //     instagramurl:{
// //       type: String,
// //     }
 
// //     ,
// //     whatsappnumberurl:{
// //       type: String,
// //     },
// //     storelinkurl:{

// //        type: String,
// //     },
// // //    productId:{
// // //         type: mongoose.Schema.Types.ObjectId,
// // //         ref: "Store_Product",
// // //         // required: false
// // //     },

// // //    productUrl:{
// // //         type: String,
// // //    },



// //  product: [{
            
// //          productisActive: {
// //             type: Boolean,
// //             default: false
// //         },


// //         productIconSize:{
          
// //             type: String,
// //             enum: ['L','S'],
// //             default: 'S'

// //         },

// //         ProductId: {
// //             type: String ,
// //         },

        
       
// //          productUrl:{
// //         type: String,
// //     },


// //          default:[]
// //     }],



// //    videocount:{
// //         type: Number,
// //         default: 0
// //     },

   

// //    imagecount:{
// //         type: Number,
// //         default: 0
// //     },

// // audiocount:{
// //         type: Number,
// //         default: 0
// //        },

// //     title: {
// //         type: String,
// //         // required: true,
// //         trim: true,
// //         index: true
// //     },
// //     description: {
// //         type: String,
// //         // required: true,
// //         trim: true
// //     },
    
// //     category: {
// //         type: String,
// //         required: true,
// //         trim: true,
// //         index: true
// //     },
// //     owner: {
// //         type: mongoose.Schema.Types.ObjectId,
// //         ref: "User",
// //         required: true
// //     },
    
// //     // thumbnail: {
// //     //     type: String,
// //     //     // required: true
// //     // },

// //     imageFiles: [{
// //     url: {
// //         type: String,
// //         required: true
// //     },
// //     // size: {
// //     //     type: String,
// //     //     enum: ['L','S'],
// //     //     default: 'L'
// //     // }
// //     //      ,
         
// //     Imageposition:{
// //              type:Number,
// //               default: 0,

// //     }
// //    ,

// //     // size: {
// //     //     type: String,
// //     //     enum: ['L','S'],
// //     //     default: 'S'
// //     // },

// //     // song:{}
// // }],


// // videoFiles: [{
// //     url: {
// //         type: String,
// //         required: true
// //     },
// //     // size: {
// //     //     type: String,
// //     //     enum: ['L','S'],
// //     //     default: 'L'
// //     // },

// //      Videoposition:{
// //              type:Number,
// //               default: 0,

// //     },

// //     autoplay: {
// //         type: Boolean,
// //         default: false 
// //     },
    
// //     thumbnail:{
// //         type: String,
// //     }

// //     ,

// //     posturl:{
// //         type:String,
// //     }


         
// // // size: {
// // //         type: String,
// // //         enum: ['L','S'],
// // //         default: 'S'
// // //     },



// //     // thumbnail :{}

// //     // song:{}

// // }],



// // audioFile:{
// //     type: String,
// //     // required: true
// // },

// // song:[{
// //     type:String
// //      // required: true
// // }],

// //     pattern: {
// //     type: String,
// //     enum: [
// //       '1', // One media file
      
// //       '2x2', // 4 items in 2x2 grid
       
// //       '2', // 2 horizontal items

// //       '1x2', // 1 large + 2 small (L pattern)
       
// //       '1x3', // 1 large + 3 small
      
// //       'carousel',

// //        'carousel arrow',
// //     //   'linear', // Linear arrangement
// //     //   'masonry', // Pinterest-style masonry
// //     //   'story', // Story-style vertical
    
// //     ],
// //     default: '1'
// //   },

// //  postType:{
// //     type: String,
// //     enum: [
// //         // if there are all images in post
// //         'image', 
// //     //    if there are all videos in post
// //         'video', 
// //     //    if there is only audio in post
// //         'audio', 
// //     //    if there is only text in post
// //         'text', 
// //         // if there are  image and video both in post
// //         'mixed'
// //     ],
// //     // default: 'image'

// //  }
// // ,



// //     views: {
// //         type: Number,
// //         default: 0,
// //     },
// //     isPublished: {
// //         type: Boolean,
// //         default: true
// //     },
// //     whatsapp: {
// //         type: String
// //     },
// //     storeLink: {
// //         type: String
// //     },
// //     facebook: {
// //         type: String
// //     },
// //     instagram: {
// //         type: String
// //     },
// //     productlink: {
// //         type: String
// //     },
// //     totalRating: {
// //         type: Number,
// //         default: 0
// //     },
// //     ratingCount: {
// //         type: Number,
// //         default: 0
// //     },
// //     averageRating: {
// //         type: Number,
// //         default: 0
// //     },
// //     totalViews: {
// //         type: Number,
// //         default: 0
// //     }
// // ,
 



// //   // Comments count (comments stored separately)
// //   commentCount: {
// //     type: Number,
// //     default: 0
// //   },

// // }, { timestamps: true })

// // // Static method for cascading delete
// // postSchema.static('findByIdAndDelete', async function(id) {
// //     await NewComment.deleteMany({ postId: id }); // Delete all comments for this post
// //     return this.findOneAndDelete({ _id: id });
// // });

// // postSchema.plugin(mongooseAggregatePaginate)

// // // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Optimized compound index for your category query
// // postSchema.index({ category: 1, isPublished: 1, createdAt: -1 });

// // // ============ OPTIMIZED INDEXES ============
// // // Text search index
// // postSchema.index({ title: "text", description: "text", category: "text" });

// // // Individual indexes
// // postSchema.index({ owner: 1 });
// // postSchema.index({ averageRating: -1 });
// // postSchema.index({ totalViews: -1 });
// // postSchema.index({ isPublished: 1 });


// // postSchema.index({ productId: 1 });

// // // Compound indexes for performance
// // postSchema.index({ category: 1, createdAt: -1 });
// // postSchema.index({ createdAt: -1 });
// // postSchema.index({ owner: 1, createdAt: -1 });
// // postSchema.index({ isPublished: 1, category: 1, createdAt: -1 });
// // postSchema.index({ isPublished: 1, createdAt: -1 });

// // // Add compound index: inCategoryId is unique within each category
// // // postSchema.index({ category: 1, inCategoryId: 1 }, { unique: true });

// // // In post.model.js, replace the index with:
// // postSchema.index(
// //     { category: 1, inCategoryId: 1 }, 
// //     { 
// //         unique: true,
// //         partialFilterExpression: { inCategoryId: { $exists: true, $ne: null } }
// //     }
// // );


// // export const Post = mongoose.model("Post", postSchema);











// // //optimized code
// // import mongoose, { Schema } from "mongoose";
// // import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
// // import { Comment } from "./comment.model.js";

// // const postSchema = new Schema({
   

// //       store: {
// //         type: Boolean,
        
// //         default: false
// //     },
   
// //    productId:{
// //         type: mongoose.Schema.Types.ObjectId,
// //         ref: "Store_Product",
// //         // required: false
// //     },

   


// //    videocount:{
// //         type: Number,
// //         default: 0
// //     },

   

// //    imagecount:{
// //         type: Number,
// //         default: 0
// //     },

// // audiocount:{
// //         type: Number,
// //         default: 0
// //        },

// //     title: {
// //         type: String,
// //         // required: true,
// //         trim: true,
// //         index: true
// //     },
// //     description: {
// //         type: String,
// //         // required: true,
// //         trim: true
// //     },
    
// //     category: {
// //         type: String,
// //         required: true,
// //         trim: true,
// //         index: true
// //     },
// //     owner: {
// //         type: mongoose.Schema.Types.ObjectId,
// //         ref: "User",
// //         required: true
// //     },
// //     thumbnail: {
// //         type: String,
// //         // required: true
// //     },

// //     // imageFiles: [{
// //     //     type: String,  // cloudinary url
// //     //      enum: ['L','S'],
// //     //     default: 'L',
// //     //     // required: true
// //     // }],
    
// //     // videoFile:[ {
// //     //     type: String,  // cloudinary url
// //     //      enum: ['L','S'],
// //     //     default: 'L',
// //     //     // required: true
// //     // }],

// //     // audioFile: [{
// //     //     type: String,  // cloudinary url
// //     //     // required: true
// //     // }],




// //     // pdfFile: {
// //     //     type: String,  // cloudinary url
// //     //     // required: true
// //     // },



// //     imageFiles: [{
// //     url: {
// //         type: String,
// //         required: true
// //     },
// //     size: {
// //         type: String,
// //         enum: ['L','S'],
// //         default: 'L'
// //     }
// // }],


// // videoFiles: [{
// //     url: {
// //         type: String,
// //         required: true
// //     },
// //     size: {
// //         type: String,
// //         enum: ['L','S'],
// //         default: 'L'
// //     }
// // }],



// // audioFile:{
// //     type: String,
// //     // required: true
// // },

// // song:[{
// //     type:String
// //      // required: true
// // }],

// //     pattern: {
// //     type: String,
// //     enum: [
// //       'single', // One media file
// //       'grid_2x2', // 4 items in 2x2 grid
// //       'grid_1_2', // 1 large + 2 small (L pattern)
// //       'grid_2_1', // 2 small + 1 large
// //       'linear', // Linear arrangement
// //       'masonry', // Pinterest-style masonry
// //       'story', // Story-style vertical
// //       'carousel' // Horizontal carousel
// //     ],
// //     default: 'single'
// //   },



// //     views: {
// //         type: Number,
// //         default: 0,
// //     },
// //     isPublished: {
// //         type: Boolean,
// //         default: true
// //     },
// //     whatsapp: {
// //         type: Number
// //     },
// //     storeLink: {
// //         type: String
// //     },
// //     facebook: {
// //         type: String
// //     },
// //     instagram: {
// //         type: String
// //     },
// //     productlink: {
// //         type: String
// //     },
// //     totalRating: {
// //         type: Number,
// //         default: 0
// //     },
// //     ratingCount: {
// //         type: Number,
// //         default: 0
// //     },
// //     averageRating: {
// //         type: Number,
// //         default: 0
// //     },
// //     totalViews: {
// //         type: Number,
// //         default: 0
// //     }
// // ,

// // //     shares: [{
// // //     user: {
// // //       type: mongoose.Schema.Types.ObjectId,
// // //       ref: 'User'
// // //     },
// // //     createdAt: {
// // //       type: Date,
// // //       default: Date.now
// // //     }
// // //   }],



// // //   // Engagement metrics
// // //   likes: [{
// // //     user: {
// // //       type: mongoose.Schema.Types.ObjectId,
// // //       ref: 'User'
// // //     },
// // //     createdAt: {
// // //       type: Date,
// // //       default: Date.now
// // //     }
// // //   }],
  
// //   // Comments count (comments stored separately like in card model)
// //   commentCount: {
// //     type: Number,
// //     default: 0
// //   },



// // }, { timestamps: true })

// // // Static method for cascading delete
// // postSchema.static('findByIdAndDelete', async function(id) {
// //     await Comment.deleteMany({ contentId: id, contentType: "post" }); // Changed "card" to "post"
// //     return this.findOneAndDelete({ _id: id });
// // });

// // postSchema.plugin(mongooseAggregatePaginate)

// // // ============ OPTIMIZED INDEXES ============
// // // Text search index
// // postSchema.index({ title: "text", description: "text", category: "text" });

// // // Individual indexes
// // postSchema.index({ owner: 1 });
// // postSchema.index({ averageRating: -1 });
// // postSchema.index({ totalViews: -1 });
// // postSchema.index({ isPublished: 1 });

// // // Compound indexes for performance
// // postSchema.index({ category: 1, createdAt: -1 });
// // postSchema.index({ createdAt: -1 });
// // postSchema.index({ owner: 1, createdAt: -1 });
// // postSchema.index({ isPublished: 1, category: 1, createdAt: -1 });
// // postSchema.index({ isPublished: 1, createdAt: -1 });

// // export const Post = mongoose.model("Post", postSchema); // Changed model name to "Post"









