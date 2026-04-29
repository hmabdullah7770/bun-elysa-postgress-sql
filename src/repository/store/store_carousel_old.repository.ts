// src/repository/store/store_carousel_old.repository.ts
import { db } from "../../db/index";
import {
  store_carousel_old,
  carousel_items_old
} from "../../schemas/store/store_carousel_old.schema";
import { eq } from "drizzle-orm";
import { ApiError } from "../../utils/ApiError";

import {createStore, storeRatings, type NewCreateStore, type CreateStore } from "../../schemas/store/createStore.schema";


class StoreCarouselOldRepository {

  async upsertByStoreId(storeId: string) {
    console.log("upsertByStoreId called with storeId:", storeId);
    console.log("storeId type:", typeof storeId);

   

    const existing = await db
      .select()
      .from(store_carousel_old)
      .where(eq(store_carousel_old.storeId, storeId))
      .limit(1);
      // if (!existing[0]) throw new ApiError(404, "Store not found");
    if (existing[0]) return existing[0];
      

    const created = await db
      .insert(store_carousel_old)
      .values({ storeId })
      .returning();

    return created[0];
  }

  async findByStoreId(storeId: string) {
    
        // 1. First verify the store exists
  // const store = await db
  //   .select()
  //   .from(createStore)
  //   .where(eq(createStore._id, storeId))
  //   .limit(1);

  // if (!store[0]) throw new ApiError(404, "Store not found");


    
    const doc = await db
      .select()
      .from(store_carousel_old)
      .where(eq(store_carousel_old.storeId, storeId))
      .limit(1);

     if (!doc[0]) throw new ApiError(404, "No carousel found for this store");

    if (!doc[0]) return null;

    const carousels = await db
      .select()
      .from(carousel_items_old)
      .where(eq(carousel_items_old.storeCarouselId, doc[0].id));

    return { ...doc[0], carousels };
  }

  async createCarouselItems(storeCarouselId: string, items: any[]) {
    return await db
      .insert(carousel_items_old)
      .values(items.map(item => ({ ...item, storeCarouselId })))
      .returning();
  }

  async findCarouselItem(storeId: string, carouselId: string) {
    const doc = await db
      .select()
      .from(store_carousel_old)
      .where(eq(store_carousel_old.storeId, storeId))
      .limit(1);

    if (!doc[0]) return null;

    const item = await db
      .select()
      .from(carousel_items_old)
      .where(eq(carousel_items_old._id, carouselId))
      .limit(1);

    return item[0] || null;
  }

  async updateCarouselItem(
    carouselId: string,
    fields: Partial<typeof carousel_items_old.$inferInsert>
  ) {
    const updated = await db
      .update(carousel_items_old)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(carousel_items_old._id, carouselId))
      .returning();

    return updated[0];
  }

  async deleteCarouselItem(carouselId: string) {
    return await db
      .delete(carousel_items_old)
      .where(eq(carousel_items_old._id, carouselId));
  }
}

export const storeCarouselOldRepository = new StoreCarouselOldRepository();
