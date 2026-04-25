import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
  bigserial,
  bigint,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { users } from "./user.schema";

export const commentTypeEnum = pgEnum("comment_type", [
  "text",
  "audio",
  "video",
  "image",
  "sticker",
  "file",
  "text_audio",
  "text_video",
  "text_image",
  "text_sticker",
  "text_file",
]);

// NOTE:
// - Frontend expects Mongo-style `_id`, so our PK column is named `_id`.
// - `postId` is stored as text because frontend sends Mongo ObjectId string.
// - `owner` is a UUID (users.id).
export const comments = pgTable(
  "comments",
  {
    _id: bigserial("_id", { mode: "number" }).primaryKey(),

    // Cursor pagination id (unique, monotonic-ish, bigint).
    // We set this explicitly on insert using the same sequence value as `_id`.
    inCommentId: bigint("in_comment_id", { mode: "bigint" }).notNull(),

    content: text("content").default(sql`null`),

    commentType: commentTypeEnum("comment_type").notNull().default("text"),

    audioUrl: text("audio_url").default(sql`null`),
    videoUrl: text("video_url").default(sql`null`),
    imageUrl: text("image_url").default(sql`null`),
    stickerUrl: text("sticker_url").default(sql`null`),
    fileUrl: text("file_url").default(sql`null`),

    postId: text("post_id").notNull(),

    pinned: boolean("pinned").notNull().default(false),

    owner: uuid("owner").notNull().references(() => users.id, {
      onDelete: "cascade",
    }),

    parentComment: bigint("parent_comment", { mode: "number" }).default(sql`null`),

    isReply: boolean("is_reply").notNull().default(false),

    numberOfLikes: integer("number_of_likes").notNull().default(0),
    numberOfDislikes: integer("number_of_dislikes").notNull().default(0),

    // store UUIDs as strings to keep array ops simple
    likedBy: text("liked_by").array().notNull().default([]),
    dislikedBy: text("disliked_by").array().notNull().default([]),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    inCommentIdUnique: uniqueIndex("comments_in_comment_id_unique").on(table.inCommentId),
    postCreatedIdx: index("comments_post_created_idx").on(
      table.postId,
      table.createdAt
    ),
    ownerCreatedIdx: index("comments_owner_created_idx").on(
      table.owner,
      table.createdAt
    ),
    parentCreatedIdx: index("comments_parent_created_idx").on(
      table.parentComment,
      table.createdAt
    ),
    postPinnedIdx: index("comments_post_pinned_idx").on(
      table.postId,
      table.pinned
    ),
    postReplyIdx: index("comments_post_is_reply_created_idx").on(
      table.postId,
      table.isReply,
      table.createdAt
    ),
  })
);

export const commentsRelations = relations(comments, ({ one }) => ({
  ownerUser: one(users, {
    fields: [comments.owner],
    references: [users.id],
  }),
}));

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

