// src/db/schema/followlist.schema.ts
import { pgTable, uuid, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user.schema";

export const followLists = pgTable(
  "follow_lists",
  {
    _id: uuid("_id").defaultRandom().primaryKey(),
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users._id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users._id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueFollow: uniqueIndex("unique_follow").on(
      table.followerId,
      table.followingId
    ),
  })
);

export const followListsRelations = relations(followLists, ({ one }) => ({
  follower: one(users, {
    fields: [followLists.followerId],
    references: [users._id],
    relationName: "following",
  }),
  following: one(users, {
    fields: [followLists.followingId],
    references: [users._id],
    relationName: "followers",
  }),
}));

export type FollowList = typeof followLists.$inferSelect;
export type NewFollowList = typeof followLists.$inferInsert;
