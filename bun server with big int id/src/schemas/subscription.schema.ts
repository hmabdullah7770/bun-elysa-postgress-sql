import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./user.schema";
import { createStore } from "./store/createStore.schema";

export const subscriptionTypeEnum = pgEnum("subscription_type", ["inapp", "store"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "free",
  "basic",
  "pro",
  "premium",
  "enterprise",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "inactive",
  "cancelled",
  "expired",
]);

export const subscriptions = pgTable(
  "subscriptions",
  {
    _id: bigint("_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    type: subscriptionTypeEnum("type").notNull(),
    user: uuid("user")
      .notNull()
      .references(() => users._id, { onDelete: "cascade" }),
    store: uuid("store").references(() => createStore._id, { onDelete: "cascade" }),
    plan: subscriptionPlanEnum("plan").notNull().default("free"),
    status: subscriptionStatusEnum("status").notNull().default("inactive"),
    startedAt: timestamp("started_at"),
    expiresAt: timestamp("expires_at"),
    gatewaySubscriptionId: text("gateway_subscription_id"),
    gatewayCustomerId: text("gateway_customer_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    storeRequiredForStoreType: check(
      "subscriptions_store_type_check",
      sql`(${table.type} = 'store' and ${table.store} is not null) or (${table.type} = 'inapp' and ${table.store} is null)`
    ),
    userStatusIdx: index("subscriptions_user_status_idx").on(table.user, table.status),
    storeStatusIdx: index("subscriptions_store_status_idx").on(table.store, table.status),
    gatewaySubscriptionIdx: index("subscriptions_gateway_subscription_idx").on(
      table.gatewaySubscriptionId
    ),
  })
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;