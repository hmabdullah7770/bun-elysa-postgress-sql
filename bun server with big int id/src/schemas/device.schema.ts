import {
  bigint,
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./user.schema";

export type DeviceHealthReport = {
  freeRAM?: number;
  freeStorage?: number;
  batteryLevel?: number;
  isCharging?: boolean;
  timestamp: string;
};

export type DeviceMetadata = {
  manufacturer?: string;
  fingerprint?: string;
  apiLevel?: number;
  carrier?: string;
  hasNotch?: boolean;
  isTablet?: boolean;
  isEmulator?: boolean;
};

export const devices = pgTable(
  "devices",
  {
    _id: uuid("_id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users._id, { onDelete: "set null" }),
    isAuth: boolean("is_auth").default(false).notNull(),
    deviceId: varchar("device_id", { length: 255 }).notNull().unique(),
    deviceName: varchar("device_name", { length: 255 }).notNull(),
    brand: varchar("brand", { length: 255 }).notNull(),
    model: varchar("model", { length: 255 }).notNull(),
    deviceType: varchar("device_type", { length: 32 }).default("Handset").notNull(),
    systemName: varchar("system_name", { length: 32 }).notNull(),
    systemVersion: varchar("system_version", { length: 64 }).notNull(),
    totalRAM: bigint("total_ram", { mode: "number" }).notNull(),
    totalStorage: bigint("total_storage", { mode: "number" }).notNull(),
    appVersion: varchar("app_version", { length: 64 }).notNull(),
    buildNumber: varchar("build_number", { length: 64 }),
    isActive: boolean("is_active").default(true).notNull(),
    firstLogin: timestamp("first_login").defaultNow().notNull(),
    lastActive: timestamp("last_active").defaultNow().notNull(),
    lastLoginIP: text("last_login_ip"),
    pushToken: text("push_token"),
    deviceMetadata: jsonb("device_metadata").$type<DeviceMetadata>(),
    healthReports: jsonb("health_reports")
      .$type<DeviceHealthReport[]>()
      .default([])
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdx: index("devices_user_id_idx").on(table.userId),
    userDeviceIdx: index("devices_user_device_idx").on(table.userId, table.deviceId),
  }),
);

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;