import { and, desc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { videoModeration, type NewVideoModeration } from "../schemas/videoModeration.schema";

export class VideoModerationRepository {
  async createProcessingRecord(data: NewVideoModeration) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${data.uploadedBy}))`);
      const processingRecords = await tx
        .select({ _id: videoModeration._id })
        .from(videoModeration)
        .where(and(
          eq(videoModeration.uploadedBy, data.uploadedBy),
          eq(videoModeration.processing, true)
        ))
        .limit(1);
      if (processingRecords.length) return null;

      const rows = await tx.insert(videoModeration).values(data).returning();
      return rows[0] ?? null;
    });
  }

  async updateResult(id: number, result: {
    approved: boolean;
    rejectionReason: string | null;
  }) {
    const rows = await db
      .update(videoModeration)
      .set({ ...result, processing: false, updatedAt: new Date() })
      .where(eq(videoModeration._id, id))
      .returning();
    return rows[0] ?? null;
  }

  async findByIdAndOwner(id: number, uploadedBy: string) {
    const rows = await db
      .select()
      .from(videoModeration)
      .where(and(
        eq(videoModeration._id, id),
        eq(videoModeration.uploadedBy, uploadedBy)
      ))
      .limit(1);
    return rows[0] ?? null;
  }

  async deleteByIdAndOwner(id: number, uploadedBy: string) {
    const rows = await db
      .delete(videoModeration)
      .where(and(
        eq(videoModeration._id, id),
        eq(videoModeration.uploadedBy, uploadedBy)
      ))
      .returning({ _id: videoModeration._id });
    return rows[0] ?? null;
  }

  async listForUser(uploadedBy: string) {
    return db
      .select()
      .from(videoModeration)
      .where(eq(videoModeration.uploadedBy, uploadedBy))
      .orderBy(desc(videoModeration.createdAt));
  }
}

export const videoModerationRepository = new VideoModerationRepository();