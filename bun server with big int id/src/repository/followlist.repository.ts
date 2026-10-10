// src/repositories/followlist.repository.ts
import { eq, and, desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../db/index";
import { followLists } from "../schemas/followlist.schema";
import { users } from "../schemas/user.schema";

const followerUser = alias(users, "followlist_follower");
const followingUser = alias(users, "followlist_following");

export class FollowListRepository {
  async findUser(userId: string) {
    const result = await db
      .select({ _id: users._id })
      .from(users)
      .where(eq(users._id, userId))
      .limit(1);
    return result[0];
  }

  async createFollow(followerId: string, followingId: string) {
    const result = await db
      .insert(followLists)
      .values({ followerId, followingId })
      .returning();
    return result[0];
  }

  async deleteFollow(followerId: string, followingId: string) {
    const result = await db
      .delete(followLists)
      .where(
        and(
          eq(followLists.followerId, followerId),
          eq(followLists.followingId, followingId)
        )
      )
      .returning({ _id: followLists._id });
    return result.length > 0;
  }

  async listFollowers(userId: string, page: number, limit: number) {
    const [rows, countRows] = await Promise.all([
      db
        .select({
          _id: followLists._id,
          following: followLists.followingId,
          createdAt: followLists.createdAt,
          follower: {
            _id: followerUser._id,
            username: followerUser.username,
            fullName: followerUser.fullName,
            avatar: followerUser.avatar,
            email: followerUser.email,
          },
        })
        .from(followLists)
        .innerJoin(followerUser, eq(followLists.followerId, followerUser._id))
        .where(eq(followLists.followingId, userId))
        .orderBy(desc(followLists.createdAt), desc(followLists._id))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(followLists)
        .where(eq(followLists.followingId, userId)),
    ]);

    return { rows, total: Number(countRows[0]?.count ?? 0) };
  }

  async listFollowing(userId: string, page: number, limit: number) {
    const [rows, countRows] = await Promise.all([
      db
        .select({
          _id: followLists._id,
          follower: followLists.followerId,
          createdAt: followLists.createdAt,
          following: {
            _id: followingUser._id,
            username: followingUser.username,
            fullName: followingUser.fullName,
            avatar: followingUser.avatar,
            email: followingUser.email,
            coverImage: followingUser.coverImage,
          },
        })
        .from(followLists)
        .innerJoin(
          followingUser,
          eq(followLists.followingId, followingUser._id)
        )
        .where(eq(followLists.followerId, userId))
        .orderBy(desc(followLists.createdAt), desc(followLists._id))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(followLists)
        .where(eq(followLists.followerId, userId)),
    ]);

    return { rows, total: Number(countRows[0]?.count ?? 0) };
  }

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
