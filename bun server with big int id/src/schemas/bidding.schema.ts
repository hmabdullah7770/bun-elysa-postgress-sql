import { sql } from "drizzle-orm";
import {
	bigint,
	check,
	index,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { posts } from "./post.schema";
import { users } from "./user.schema";
import { createStore } from "./store/createStore.schema";
import { store_product } from "./store/store_product.schema";

export const bids = pgTable(
	"bids",
	{
		_id: bigint("_id", { mode: "number" })
			.primaryKey()
			.generatedAlwaysAsIdentity(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users._id, { onDelete: "cascade" }),
		postId: bigint("post_id", { mode: "number" })
			.notNull()
			.references(() => posts._id, { onDelete: "cascade" }),
		productId: bigint("product_id", { mode: "number" })
			.notNull()
			.references(() => store_product._id, { onDelete: "cascade" }),
		storeId: uuid("store_id")
			.notNull()
			.references(() => createStore._id, { onDelete: "cascade" }),
		owner: uuid("owner")
			.notNull()
			.references(() => users._id, { onDelete: "cascade" }),
		bidForUserId: uuid("bid_for_user_id").references(() => users._id, {
			onDelete: "cascade",
		}),
		bidAmount: numeric("bid_amount", { precision: 12, scale: 2 }).notNull(),
		message: text("message").notNull().default(""),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => ({
		positiveAmount: check("bids_positive_amount_check", sql`${table.bidAmount} > 0`),
		postAmountIdx: index("bids_post_amount_idx").on(table.postId, table.bidAmount),
		userCreatedIdx: index("bids_user_created_idx").on(table.userId, table.createdAt),
		postUserIdx: index("bids_post_user_idx").on(table.postId, table.userId),
		recipientAmountIdx: index("bids_recipient_amount_idx").on(
			table.bidForUserId,
			table.bidAmount
		),
	})
);

export type Bid = typeof bids.$inferSelect;
export type NewBid = typeof bids.$inferInsert;
