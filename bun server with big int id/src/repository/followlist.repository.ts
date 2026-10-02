// src/repositories/followlist.repository.ts
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index";
import { followLists } from "../schemas/followlist.schema";
import { users } from "../schemas/user.schema";

export class FollowListRepository {
  async getFollowingIds(userId: string): Promise<string[]> {
    const rows = await db
      .select({ userId: followLists.followingId })
      .from(followLists)
      .innerJoin(users, eq(followLists.followingId, users._id))
      .where(eq(followLists.followerId, userId));
    return rows.map(({ userId: followingId }) => followingId);
  }

  async getFollowerCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(followLists)
      .where(eq(followLists.followingId, userId));
    return Number(result[0]?.count ?? 0);
  }

  async getFollowingCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(followLists)
      .where(eq(followLists.followerId, userId));
    return Number(result[0]?.count ?? 0);
  }

  async isFollowing(
    followerId: string,
    followingId: string
  ): Promise<boolean> {
    const result = await db
      .select()
      .from(followLists)
      .where(
        and(
          eq(followLists.followerId, followerId),
          eq(followLists.followingId, followingId)
        )
      )
      .limit(1);
    return result.length > 0;
  }
}

export const followListRepository = new FollowListRepository();
