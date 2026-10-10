import {
  bigserial,
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./user.schema";
import { createStore } from "./store/createStore.schema";

export const banners = pgTable(
  "banners",
  {
    _id: bigserial("_id", { mode: "number" }).primaryKey(),
    bannerImage: text("banner_image").notNull(),
    owner: uuid("owner")
      .notNull()
      .references(() => users._id, { onDelete: "cascade" }),
    store: uuid("store").references(() => createStore._id, { onDelete: "set null" }),
    isPublished: boolean("is_published").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    expiresAtIdx: index("banners_expires_at_idx").on(table.expiresAt),
    ownerExpiresAtIdx: index("banners_owner_expires_at_idx").on(
      table.owner,
      table.expiresAt
    ),
  })
);

export type Banner = typeof banners.$inferSelect;
export type NewBanner = typeof banners.$inferInsert;
