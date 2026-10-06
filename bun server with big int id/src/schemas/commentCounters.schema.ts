import { sql } from "drizzle-orm";
import { bigint, pgTable, text } from "drizzle-orm/pg-core";

export const comment_counters = pgTable("comment_counters", {
  _id: text("_id").primaryKey(),
  seq: bigint("seq", { mode: "bigint" }).notNull().default(sql`0`),
});

export type CommentCounter = typeof comment_counters.$inferSelect;
export type NewCommentCounter = typeof comment_counters.$inferInsert;
