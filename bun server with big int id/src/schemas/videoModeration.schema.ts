import {
  bigserial,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./user.schema";

export const videoModeration = pgTable(
  "video_moderation",
  {
    _id: bigserial("_id", { mode: "number" }).primaryKey(),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users._id, { onDelete: "cascade" }),
    approved: boolean("approved").notNull().default(false),
    rejectionReason: text("rejection_reason"),
    mediaIndex: integer("media_index").notNull(),
    processing: boolean("processing").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    uploadedByCreatedIdx: index("video_moderation_uploaded_by_created_idx").on(
      table.uploadedBy,
      table.createdAt
    ),
    processingIdx: index("video_moderation_processing_idx").on(table.processing),
  })
);

export type VideoModeration = typeof videoModeration.$inferSelect;
export type NewVideoModeration = typeof videoModeration.$inferInsert;