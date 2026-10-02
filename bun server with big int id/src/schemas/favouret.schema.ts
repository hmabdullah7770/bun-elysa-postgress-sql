import {
    bigint,
    index,
    pgTable,
    timestamp,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core";
import { posts } from "./post.schema";
import { users } from "./user.schema";

export const favorites = pgTable(
    "favorites",
    {
        _id: bigint("_id", { mode: "number" })
            .primaryKey()
            .generatedAlwaysAsIdentity(),
        postId: bigint("post_id", { mode: "number" })
            .notNull()
            .references(() => posts._id, { onDelete: "cascade" }),
        owner: uuid("owner")
            .notNull()
            .references(() => users._id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => ({
        ownerPostUnique: uniqueIndex("favorites_owner_post_unique").on(
            table.owner,
            table.postId
        ),
        ownerCreatedIdx: index("favorites_owner_created_idx").on(
            table.owner,
            table.createdAt
        ),
        postIdx: index("favorites_post_idx").on(table.postId),
    })
);

export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;
