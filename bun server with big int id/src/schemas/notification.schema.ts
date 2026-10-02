import {
	bigint,
	boolean,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { users } from "./user.schema";
import { createStore } from "./store/createStore.schema";

export const notifications = pgTable(
	"notifications",
	{
		_id: bigint("_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
		recipient: uuid("recipient")
			.notNull()
			.references(() => users._id, { onDelete: "cascade" }),
		sender: uuid("sender").references(() => users._id, { onDelete: "set null" }),
		store: uuid("store").references(() => createStore._id, { onDelete: "set null" }),
		type: varchar("type", { length: 100 }).notNull(),
		title: text("title").notNull(),
		body: text("body").notNull(),
		metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
		isRead: boolean("is_read").notNull().default(false),
		isSeen: boolean("is_seen").notNull().default(false),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => ({
		recipientCreatedIdx: index("notifications_recipient_created_idx").on(
			table.recipient,
			table.createdAt
		),
		recipientTypeCreatedIdx: index("notifications_recipient_type_created_idx").on(
			table.recipient,
			table.type,
			table.createdAt
		),
		recipientReadIdx: index("notifications_recipient_read_idx").on(
			table.recipient,
			table.isRead
		),
		recipientSeenIdx: index("notifications_recipient_seen_idx").on(
			table.recipient,
			table.isSeen
		),
	})
);

export const notificationTypes = pgTable(
	"notification_types",
	{
		_id: bigint("_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
		type: varchar("type", { length: 100 }).notNull(),
		label: varchar("label", { length: 255 }).notNull(),
		description: text("description").notNull().default(""),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => ({
		typeUnique: uniqueIndex("notification_types_type_unique").on(table.type),
		activeCreatedIdx: index("notification_types_active_created_idx").on(
			table.isActive,
			table.createdAt
		),
	})
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationType = typeof notificationTypes.$inferSelect;
export type NewNotificationType = typeof notificationTypes.$inferInsert;
