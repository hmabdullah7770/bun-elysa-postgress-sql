import { and, desc, eq, gt, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { banners } from "../schemas/banner.schema";
import { users } from "../schemas/user.schema";

export class BannerRepository {
  async reserve(owner: string, store: string | null) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('standalone-banners'))`);

      const now = new Date();
      await tx.delete(banners).where(lte(banners.expiresAt, now));

      const ownerRows = await tx
        .select({ expiresAt: banners.expiresAt })
        .from(banners)
        .where(and(eq(banners.owner, owner), gt(banners.expiresAt, now)))
        .limit(1);
      if (ownerRows[0]) {
        return { status: "owner_active" as const, expiresAt: ownerRows[0].expiresAt };
      }

      const activeRows = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(banners)
        .where(gt(banners.expiresAt, now));
      if (Number(activeRows[0]?.count ?? 0) >= 5) {
        return { status: "full" as const };
      }

      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const rows = await tx
        .insert(banners)
        .values({
          bannerImage: "pending",
          owner,
          store,
          expiresAt,
          isPublished: false,
        })
        .returning();
      if (!rows[0]) throw new Error("Banner reservation insert returned no row");

      return { status: "reserved" as const, banner: rows[0] };
    });
  }

  async publish(id: number, owner: string, bannerImage: string) {
    const rows = await db
      .update(banners)
      .set({ bannerImage, isPublished: true, updatedAt: new Date() })
      .where(and(
        eq(banners._id, id),
        eq(banners.owner, owner),
        eq(banners.isPublished, false)
      ))
      .returning();
    return rows[0] ?? null;
  }

  async listActive() {
    const now = new Date();
    return db
      .select({
        banner: banners,
        owner: {
          _id: users._id,
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
        },
      })
      .from(banners)
      .innerJoin(users, eq(banners.owner, users._id))
      .where(and(
        gt(banners.expiresAt, now),
        eq(banners.isPublished, true)
      ))
      .orderBy(desc(banners.createdAt));
  }

  async deleteByIdAndOwner(id: number, owner: string) {
    const rows = await db
      .delete(banners)
      .where(and(eq(banners._id, id), eq(banners.owner, owner)))
      .returning();
    return rows[0] ?? null;
  }

  async deleteExpired() {
    const rows = await db
      .delete(banners)
      .where(lte(banners.expiresAt, new Date()))
      .returning({ _id: banners._id });
    return rows.length;
  }
}

export const bannerRepository = new BannerRepository();
