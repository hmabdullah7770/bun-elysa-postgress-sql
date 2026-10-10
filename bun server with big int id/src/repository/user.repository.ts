// src/repositories/user.repository.ts
import { eq, or, and, ne, sql, count } from "drizzle-orm";
import { db } from "../db/index";
import { users, type NewUser, type User } from "../schemas/user.schema";
import { followLists } from "../schemas/followlist.schema";
import { watchHistory } from "../schemas/watchHistory.schema";
// import { userStores } from "../schemas/store/createStore.schema"";
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
  _id: users._id,
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
  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Find Methods Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  async findById(id: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users._id, id))
      .limit(1);
    return result[0];
  }

  // async findByIdSafe(id: string) {
  //   const result = await db
  //     .select(safeUserColumns)
  //     .from(users)
  //     .where(eq(users._id, id))
  //     .limit(1);
  //   return result[0];
  // }


  async findByIdSafe(id: string) {
  const result = await db
    .select({
      // spread all safe user columns
      ...safeUserColumns,
      // aggregate stores as JSON array
      stores: sql<
        {
          storeId: string;
          storeName: string;
          storeLogo: string;
          category: string | null;
        }[]
      >`
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'storeId', ${createStore._id},
              'storeName', ${createStore.storeName},
              'storeLogo', ${createStore.storeLogo},
              'category',  ${createStore.category}
            )
          ) FILTER (WHERE ${createStore._id} IS NOT NULL),
          '[]'
        )
      `,
    })
    .from(users)
    .leftJoin(createStore, eq(createStore.ownerId, users._id))
    .where(eq(users._id, id))
    .groupBy(
      // group by all safe user columns so aggregation works
      users._id,
      users.username,
      users.email,
      users.fullName,
      users.bio,
      users.gender,
      users.avatar,
      users.coverImage,
      users.whatsapp,
      users.storeLink,
      users.facebook,
      users.instagram,
      users.productlink,
      users.createdAt,
      users.updatedAt
      // add any other columns that exist in safeUserColumns
    )
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

  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Social Link Duplicate Check Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
          ? and(or(...conditions), ne(users._id, excludeUserId))
          : or(...conditions)
      )
      .limit(1);

    const result = await query;
    return result[0];
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Create Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  async create(data: NewUser): Promise<User> {
    const result = await db.insert(users).values(data).returning();
    if (!result[0]) throw new Error("User creation failed");
    return result[0];
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Update Methods Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  async updateById(id: string, data: Partial<NewUser>) {
    const result = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users._id, id))
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
      .where(eq(users._id, id))
      .returning();
    return result[0];
  }

  async updateFcmToken(id: string, fcmToken: string | null) {
    const result = await db
      .update(users)
      .set({ fcmToken, updatedAt: new Date() })
      .where(eq(users._id, id))
      .returning();
    return result[0];
  }

  async clearAuthTokens(id: string) {
    const result = await db
      .update(users)
      .set({ refreshToken: null, fcmToken: null, updatedAt: new Date() })
      .where(eq(users._id, id))
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
      .where(eq(users._id, id))
      .returning();
    return result[0];
  }

  async updateCoverImage(id: string, coverImageUrl: string) {
    const result = await db
      .update(users)
      .set({ coverImage: coverImageUrl, updatedAt: new Date() })
      .where(eq(users._id, id))
      .returning();
    return result[0];
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ User With Follower/Following Counts Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  async findByIdWithFollowCounts(userId: string) {
    const result = await db
      .select({
        ...safeUserColumns,
        followerCount: sql<number>`(
          SELECT COUNT(*) FROM follow_lists 
          WHERE follow_lists.following_id = ${users._id}
        )`.as("follower_count"),
        followingCount: sql<number>`(
          SELECT COUNT(*) FROM follow_lists 
          WHERE follow_lists.follower_id = ${users._id}
        )`.as("following_count"),
      })
      .from(users)
      .where(eq(users._id, userId))
      .limit(1);

    return result[0];
  }

  async findByIdWithFollowStatus(userId: string, viewerId: string) {
    const result = await db
      .select({
        ...safeUserColumns,
        followerCount: sql<number>`(
          SELECT COUNT(*) FROM follow_lists
          WHERE follow_lists.following_id = ${users._id}
        )`.as("follower_count"),
        followingCount: sql<number>`(
          SELECT COUNT(*) FROM follow_lists
          WHERE follow_lists.follower_id = ${users._id}
        )`.as("following_count"),
        isFollowing: sql<boolean>`EXISTS(
          SELECT 1 FROM follow_lists
          WHERE follow_lists.follower_id = ${viewerId}
          AND follow_lists.following_id = ${users._id}
        )`.as("is_following"),
      })
      .from(users)
      .where(eq(users._id, userId))
      .limit(1);

    return result[0];
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ User Profile With Follow Button State Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  async findProfileByUsername(
    username: string,
    currentUserId: string
  ) {
    const result = await db
      .select({
        _id: users._id,
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
          WHERE follow_lists.following_id = ${users._id}
        )`.as("follower_count"),
        followingCount: sql<number>`(
          SELECT COUNT(*) FROM follow_lists 
          WHERE follow_lists.follower_id = ${users._id}
        )`.as("following_count"),
        followbutton: sql<boolean>`(
          SELECT EXISTS(
            SELECT 1 FROM follow_lists 
            WHERE follow_lists.follower_id = ${currentUserId} 
            AND follow_lists.following_id = ${users._id}
          )
        )`.as("is_following"),
      })
      .from(users)
      .where(eq(users.username, username.toLowerCase()))
      .limit(1);

    return result[0];
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ User createStore Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  async getUserStores(userId: string) {
    return db
      .select()
      .from(createStore)
      .where(eq(createStore.ownerId, userId));
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Watch History Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  async getWatchHistory(userId: string) {
    return db
      .select()
      .from(watchHistory)
      .where(eq(watchHistory.userId, userId))
      .orderBy(sql`${watchHistory.createdAt} DESC`);
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Delete Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  async deleteById(id: string) {
    return db.delete(users).where(eq(users._id, id));
  }
}

export const userRepository = new UserRepository();
