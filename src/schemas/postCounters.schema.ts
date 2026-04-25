import { pgTable, text, bigint, timestamp } from "drizzle-orm/pg-core";

// Generic counters table (replaces Mongo PostUniqueIds collection)
// Keys:
// - "post_counter"
// - `category_counter_${categoryName}`
export const post_counters = pgTable("post_counters", {
  key: text("key").primaryKey(),
  seq: bigint("seq", { mode: "bigint" }).notNull().default(0n),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type PostCounter = typeof post_counters.$inferSelect;
export type NewPostCounter = typeof post_counters.$inferInsert;

