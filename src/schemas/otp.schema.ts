// src/db/schema/otp.schema.ts
import { pgTable, text, varchar, uuid, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const otpPurposeEnum = pgEnum("otp_purpose", [
  "registration",
  "password_reset",
]);

export const otps = pgTable("otps", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  otp: text("otp").notNull(),
  purpose: otpPurposeEnum("purpose").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Otp = typeof otps.$inferSelect;
export type NewOtp = typeof otps.$inferInsert;