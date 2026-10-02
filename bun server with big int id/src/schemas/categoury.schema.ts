import { bigint, pgTable, timestamp, varchar, uniqueIndex } from "drizzle-orm/pg-core";

export const categories = pgTable(
	"categories",
	{
		_id: bigint("_id", { mode: "number" })
			.primaryKey()
			.generatedAlwaysAsIdentity(),
		categouryname: varchar("categouryname", { length: 255 }).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => ({
		nameUnique: uniqueIndex("categories_categouryname_unique").on(table.categouryname),
	})
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
