// src/db/schema/watchHistory.schema.ts
import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user.schema";

export const watchHistory = pgTable("watch_history", {
  _id: uuid("_id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users._id, { onDelete: "cascade" }),
  videoId: uuid("video_id").notNull(),
  // .references(() => videos._id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const watchHistoryRelations = relations(watchHistory, ({ one }) => ({
  user: one(users, {
    fields: [watchHistory.userId],
    references: [users._id],
  }),
}));

export type WatchHistory = typeof watchHistory.$inferSelect;
