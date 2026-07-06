// src/repositories/followlist.repository.ts
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index";
import { followLists } from "../schemas/followlist.schema";

export class FollowListRepository {
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
