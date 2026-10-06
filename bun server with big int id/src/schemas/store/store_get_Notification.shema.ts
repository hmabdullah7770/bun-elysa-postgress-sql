import { bigint, index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createStore } from "./createStore.schema";
import { users } from "../user.schema";

export const storeNotificationSubscriptions = pgTable(
	"store_notification_subscriptions",
	{
		_id: bigint("_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
		store: uuid("store_id")
			.notNull()
			.references(() => createStore._id, { onDelete: "cascade" }),
		user: uuid("user_id")
			.notNull()
			.references(() => users._id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => ({
		storeUserUnique: uniqueIndex("store_notification_subscriptions_store_user_unique").on(
			table.store,
			table.user
		),
		userIdx: index("store_notification_subscriptions_user_idx").on(table.user),
		storeIdx: index("store_notification_subscriptions_store_idx").on(table.store),
	})
);

export type StoreNotificationSubscription = typeof storeNotificationSubscriptions.$inferSelect;
export type NewStoreNotificationSubscription = typeof storeNotificationSubscriptions.$inferInsert;
