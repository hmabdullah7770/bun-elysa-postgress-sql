import { sql } from "drizzle-orm";
import { db } from "../db";

export const getNextCommentSequence = async (sequenceName: string): Promise<number> => {
  if (sequenceName !== "commentId") {
    throw new Error(`Unknown comment sequence: ${sequenceName}`);
  }

  const result = await db.execute<{ id: string }>(
    sql`select nextval(pg_get_serial_sequence('comments', '_id'))::text as id`
  );
  const id = Number((result as any)?.[0]?.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error("Failed to allocate comment ID");
  }
  return id;
};