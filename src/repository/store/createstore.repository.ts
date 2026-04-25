// src/repositories/store.repository.ts
import { eq, desc, sql, avg, count } from "drizzle-orm";
import { db } from "../../db/index";
import {createStore, storeRatings, type NewCreateStore, type CreateStore } from "../../schemas/store/createStore.schema";

import { users } from "../../schemas/user.schema";

export class CreateStoreRepository {

  // ==================== STORE CRUD ====================

  // Create a new store
  async create(data: NewCreateStore): Promise<CreateStore | null> {
    const [store] = await db
      .insert(createStore)
      .values(data)
      .returning();
      
    return store || null;
  }

  // ✅ Increment total sells counter
async incrementTotalSells(id: string): Promise<void> {
  await db
    .update(createStore)
    .set({
      totalSells: sql`${createStore.totalSells} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(createStore.id, id));
}

  // Find store by ID
  async findById(id: string): Promise<CreateStore | null> {
    const [store] = await db
      .select()
      .from(createStore)
      .where(eq(createStore.id, id))
      .limit(1);

    
    return store || null;
  }

  // Find store by ID with owner details
  async findByIdWithOwner(id: string) {
    const [store] = await db
      .select({
        id: createStore.id,
        storeName: createStore.storeName,
        storeLogo: createStore.storeLogo,
        category: createStore.category,
        ownerId: createStore.ownerId,
        clickCount: createStore.clickCount,
        rating: createStore.rating,
        totalRatings: createStore.totalRatings,
        totalSells: createStore.totalSells,
        createdAt: createStore.createdAt,
        updatedAt: createStore.updatedAt,
        owner: {
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
        },
      })
      .from(createStore)
      .leftJoin(users, eq(createStore.ownerId, users.id))
      .where(eq(createStore.id, id))
      .limit(1);
    return store || null;
  }

  // Find store by owner ID
  async findByOwnerId(ownerId: string): Promise<CreateStore | null> {
    const [store] = await db
      .select()
      .from(createStore)
      .where(eq(createStore.ownerId, ownerId))
      .limit(1);
    return store || null;
  }

  // Find store by name
  async findByName(storeName: string): Promise<CreateStore | null> {
    const [store] = await db
      .select()
      .from(createStore)
      .where(eq(createStore.storeName, storeName))
      .limit(1);
    return store || null;
  }

  // Get all createStore by owner with owner details
 async findAllByOwner(ownerId: string) {
    return await db
      .select({
        _id: createStore.id,              // ✅ id → _id
        storeName: createStore.storeName,
        storeLogo: createStore.storeLogo,
        category: createStore.category,
        owner: createStore.ownerId,        // ✅ ownerId → owner (string)
        clickCount: createStore.clickCount,
        rating: createStore.rating,
        totalRatings: createStore.totalRatings,
        totalSells: createStore.totalSells,
        createdAt: createStore.createdAt,
        updatedAt: createStore.updatedAt,
        ownerDetails: {                    // ✅ owner → ownerDetails
          _id: users.id,                  // ✅ id → _id
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
        },
      })
      .from(createStore)
      .leftJoin(users, eq(createStore.ownerId, users.id))
      .where(eq(createStore.ownerId, ownerId));
  }
  // Update store
  async update(id: string, data: Partial<NewCreateStore>): Promise<CreateStore | null> {
    const [store] = await db
      .update(createStore)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(createStore.id, id))
      .returning();
    return store || null;
  }

  // Delete store
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(createStore)
      .where(eq(createStore.id, id))
      .returning({ id: createStore.id });
    return result.length > 0;
  }

  // ==================== CLICK COUNT ====================

  // Increment click count
  async incrementClickCount(id: string): Promise<void> {
    await db
      .update(createStore)
      .set({
        clickCount: sql`${createStore.clickCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(createStore.id, id));
  }

  // ==================== RATING ====================

  // Update store rating
  async updateRating(
    storeId: string,
    averageRating: number,
    totalRatings: number
  ): Promise<void> {
    await db
      .update(createStore)
      .set({
        rating: averageRating.toFixed(1),
        totalRatings,
        updatedAt: new Date(),
      })
      .where(eq(createStore.id, storeId));
  }

  // ==================== TOP RATED ====================

  // Get top rated createStore with pagination
  async getTopRated(options: {
    page: number;
    limit: number;
    category?: string;
  }) {
    const { page, limit, category } = options;
    const offset = (page - 1) * limit;

    // Build where condition
    const whereCondition = category
      ? eq(createStore.category, category)
      : undefined;

    // Get data
    const data = await db
      .select({
        id: createStore.id,
        storeName: createStore.storeName,
        storeLogo: createStore.storeLogo,
        category: createStore.category,
        ownerId: createStore.ownerId,
        clickCount: createStore.clickCount,
        rating: createStore.rating,
        totalRatings: createStore.totalRatings,
        totalSells: createStore.totalSells,
        createdAt: createStore.createdAt,
        updatedAt: createStore.updatedAt,
        owner: {
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
        },
      })
      .from(createStore)
      .leftJoin(users, eq(createStore.ownerId, users.id))
      .where(whereCondition)
      .orderBy(desc(createStore.rating), desc(createStore.totalRatings), desc(createStore.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(createStore)
      .where(whereCondition);

    const total = Number(countResult?.count) || 0;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }
}

// ==================== STORE RATING REPOSITORY ====================

export class StoreRatingRepository {

  // Create or update rating
  async upsert(data: {
    storeId: string;
    userId: string;
    rating: number;
  }) {
    // Check if rating already exists
    const existing = await this.findByStoreAndUser(data.storeId, data.userId);

    if (existing) {
      // Update existing rating
      const [updated] = await db
        .update(storeRatings)
        .set({
          rating: data.rating,
          updatedAt: new Date(),
        })
        .where(eq(storeRatings.id, existing.id))
        .returning();
      return updated;
    }

    // Create new rating
    const [rating] = await db
      .insert(storeRatings)
      .values(data)
      .returning();
    return rating;
  }

  // Find rating by store and user
  async findByStoreAndUser(storeId: string, userId: string) {
    const [rating] = await db
      .select()
      .from(storeRatings)
      .where(
        sql`${storeRatings.storeId} = ${storeId} AND ${storeRatings.userId} = ${userId}`
      )
      .limit(1);
    return rating || null;
  }

  // Calculate average rating for a store
  async calculateAverageRating(
    storeId: string
  ): Promise<{ average: number; total: number }> {
    const [result] = await db
      .select({
        average: avg(storeRatings.rating),
        total: count(storeRatings.id),
      })
      .from(storeRatings)
      .where(eq(storeRatings.storeId, storeId));

    return {
      average: result?.average ? parseFloat(String(result.average)) : 0,
      total: Number(result?.total) || 0,
    };
  }

  // Get all ratings by user with store details
  async findByUserId(userId: string, page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;

    const data = await db
      .select({
        id: storeRatings.id,
        rating: storeRatings.rating,
        createdAt: storeRatings.createdAt,
        updatedAt: storeRatings.updatedAt,
        store: {
          id: createStore.id,
          storeName: createStore.storeName,
          storeLogo: createStore.storeLogo,
          category: createStore.category,
          rating: createStore.rating,
          totalRatings: createStore.totalRatings,
        },
      })
      .from(storeRatings)
      .leftJoin(createStore, eq(storeRatings.storeId, createStore.id))
      .where(eq(storeRatings.userId, userId))
      .orderBy(desc(storeRatings.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(storeRatings)
      .where(eq(storeRatings.userId, userId));

    const total = Number(countResult?.count) || 0;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  // Delete rating
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(storeRatings)
      .where(eq(storeRatings.id, id))
      .returning({ id: storeRatings.id });
    return result.length > 0;
  }
}

// Export instances
export const createstoreRepository = new CreateStoreRepository();
export const storeRatingRepository = new StoreRatingRepository();