// src/db/schema/user.schema.ts
import {
  pgTable,
  text,
  varchar,
  uuid,
  timestamp,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const genderEnum = pgEnum("gender", [
  "male",
  "female",
  "transgender",
  "other",
]);

export const users = pgTable(
  "users",
  {
    _id: uuid("_id").defaultRandom().primaryKey(),
    username: varchar("username", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: text("password").notNull(),
    fullName: varchar("full_name", { length: 255 }),
    bio: text("bio"),
    gender: genderEnum("gender"),
    avatar: text("avatar").notNull(),
    coverImage: text("cover_image"),
    refreshToken: text("refresh_token"),
    otp: text("otp"),

    // Social links ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â at least one required (validated in service layer)
    // PostgreSQL unique allows multiple NULLs (replaces sparse:true)
    whatsapp: varchar("whatsapp", { length: 255 }).unique(),
    storeLink: text("store_link").unique(),
    facebook: text("facebook").unique(),
    instagram: text("instagram").unique(),

    productlink: text("productlink"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  }
);

export const usersRelations = relations(users, ({ many }) => ({
  stores: many(createStore),
  watchHistory: many(watchHistory),
  followers: many(followLists, { relationName: "followers" }),
  following: many(followLists, { relationName: "following" }),
}));

// Forward references - these are imported from their respective files
// but defined here for relation setup
// import { userStores } from "./userStore.schema";
import {createStore } from "./store/createStore.schema"
import { watchHistory } from "./watchHistory.schema";
import { followLists } from "./followlist.schema";

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
