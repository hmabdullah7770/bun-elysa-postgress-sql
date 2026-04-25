// src/repositories/user.repository.ts
import { eq, or, and, ne, sql, count } from "drizzle-orm";
import { db } from "../db/index";
import { users, type NewUser, type User } from "../schemas/user.schema";
import { followLists } from "../schemas/followlist.schema";
import { watchHistory } from "../schemas/watchHistory.schema";
// import { userStores } from "../schemas/userStore.schema";
import { createStore } from "../schemas/store/createStore.schema";

// Columns to exclude from responses
// const safeUserColumns = {
//   id: true,
//   username: true,
//   email: true,
//   fullName: true,
//   bio: true,
//   gender: true,
//   avatar: true,
//   coverImage: true,
//   whatsapp: true,
//   storeLink: true,
//   facebook: true,
//   instagram: true,
//   productlink: true,
//   createdAt: true,
//   updatedAt: true,
// } as const;


const safeUserColumns = {
  id: users.id,
  username: users.username,
  email: users.email,
  fullName: users.fullName,
  bio: users.bio,
  gender: users.gender,
  avatar: users.avatar,
  coverImage: users.coverImage,
  whatsapp: users.whatsapp,
  storeLink: users.storeLink,
  facebook: users.facebook,
  instagram: users.instagram,
  productlink: users.productlink,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export class UserRepository {
  // ─── Find Methods ──────────────────────────────────────────────

  async findById(id: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  }

  async findByIdSafe(id: string) {
    const result = await db
      .select(safeUserColumns)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return result[0];
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username.toLowerCase()))
      .limit(1);
    return result[0];
  }

  async findByEmailOrUsername(
    email: string,
    username: string
  ): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, email.toLowerCase()),
          eq(users.username, username.toLowerCase())
        )
      )
      .limit(1);
    return result[0];
  }

  // ─── Social Link Duplicate Check ──────────────────────────────

  async findBySocialLinks(
    socialLinks: {
      whatsapp?: string;
      storeLink?: string;
      facebook?: string;
      instagram?: string;
    },
    excludeUserId?: string
  ): Promise<User | undefined> {
    const conditions = [];

    if (socialLinks.whatsapp)
      conditions.push(eq(users.whatsapp, socialLinks.whatsapp));
    if (socialLinks.storeLink)
      conditions.push(eq(users.storeLink, socialLinks.storeLink));
    if (socialLinks.facebook)
      conditions.push(eq(users.facebook, socialLinks.facebook));
    if (socialLinks.instagram)
      conditions.push(eq(users.instagram, socialLinks.instagram));

    if (conditions.length === 0) return undefined;

    let query = db
      .select()
      .from(users)
      .where(
        excludeUserId
          ? and(or(...conditions), ne(users.id, excludeUserId))
          : or(...conditions)
      )
      .limit(1);

    const result = await query;
    return result[0];
  }

  // ─── Create ───────────────────────────────────────────────────

  async create(data: NewUser): Promise<User> {
    const result = await db.insert(users).values(data).returning();
    if (!result[0]) throw new Error("User creation failed");
    return result[0];
  }

  // ─── Update Methods ──────────────────────────────────────────

  async updateById(id: string, data: Partial<NewUser>) {
    const result = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning(safeUserColumns);
    return result[0];
  }

  async updateRefreshToken(
    id: string,
    refreshToken: string | null
  ) {
    const result = await db
      .update(users)
      .set({ refreshToken, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updatePassword(email: string, hashedPassword: string) {
    const result = await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.email, email.toLowerCase()))
      .returning();
    return result[0];
  }

  async updateAvatar(id: string, avatarUrl: string) {
    const result = await db
      .update(users)
      .set({ avatar: avatarUrl, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateCoverImage(id: string, coverImageUrl: string) {
    const result = await db
      .update(users)
      .set({ coverImage: coverImageUrl, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // ─── User With Follower/Following Counts ──────────────────────

  async findByIdWithFollowCounts(userId: string) {
    const result = await db
      .select({
        ...safeUserColumns,
        followerCount: sql<number>`(
          SELECT COUNT(*) FROM follow_lists 
          WHERE follow_lists.following_id = ${users.id}
        )`.as("follower_count"),
        followingCount: sql<number>`(
          SELECT COUNT(*) FROM follow_lists 
          WHERE follow_lists.follower_id = ${users.id}
        )`.as("following_count"),
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return result[0];
  }

  // ─── User Profile With Follow Button State ────────────────────

  async findProfileByUsername(
    username: string,
    currentUserId: string
  ) {
    const result = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        email: users.email,
        bio: users.bio,
        avatar: users.avatar,
        coverImage: users.coverImage,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        followerCount: sql<number>`(
          SELECT COUNT(*) FROM follow_lists 
          WHERE follow_lists.following_id = ${users.id}
        )`.as("follower_count"),
        followingCount: sql<number>`(
          SELECT COUNT(*) FROM follow_lists 
          WHERE follow_lists.follower_id = ${users.id}
        )`.as("following_count"),
        followbutton: sql<boolean>`(
          SELECT EXISTS(
            SELECT 1 FROM follow_lists 
            WHERE follow_lists.follower_id = ${currentUserId} 
            AND follow_lists.following_id = ${users.id}
          )
        )`.as("is_following"),
      })
      .from(users)
      .where(eq(users.username, username.toLowerCase()))
      .limit(1);

    return result[0];
  }

  // ─── User Stores ─────────────────────────────────────────────

  async getUserStores(userId: string) {
    return db
      .select()
      .from(createStore)
      .where(eq(createStore.ownerId, userId));
  }

  // ─── Watch History ────────────────────────────────────────────

  async getWatchHistory(userId: string) {
    return db
      .select()
      .from(watchHistory)
      .where(eq(watchHistory.userId, userId))
      .orderBy(sql`${watchHistory.createdAt} DESC`);
  }

  // ─── Delete ───────────────────────────────────────────────────

  async deleteById(id: string) {
    return db.delete(users).where(eq(users.id, id));
  }
}

export const userRepository = new UserRepository();