import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { posts } from "./post.schema";
import { users } from "./user.schema";

export const ratings = pgTable(
  "ratings",
  {
    _id: bigint("_id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    rating: integer("rating").notNull(),
    postId: bigint("post_id", { mode: "number" })
      .notNull()
      .references(() => posts._id, { onDelete: "cascade" }),
    owner: uuid("owner")
      .notNull()
      .references(() => users._id, { onDelete: "cascade" }),
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    ratingRange: check(
      "ratings_rating_range_check",
      sql`${table.rating} between 1 and 5`
    ),
    postOwnerUnique: uniqueIndex("ratings_post_owner_unique").on(
      table.postId,
      table.owner
    ),
    ownerIdx: index("ratings_owner_idx").on(table.owner),
    postRatingIdx: index("ratings_post_rating_idx").on(
      table.postId,
      table.rating
    ),
  })
);

export type Rating = typeof ratings.$inferSelect;
export type NewRating = typeof ratings.$inferInsert;